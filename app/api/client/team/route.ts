// ============= app/api/client/team/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Team } from '@/models/Team';
import { CreateTeamSchema, InviteMemberSchema } from '@/lib/validations';
import { EmailService } from '@/lib/email';
import { generateSecureToken } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.team?.teamId) {
      return NextResponse.json({ 
        success: true,
        data: { team: null }
      });
    }

    const team = await Team.findOne({
      _id: user.team.teamId,
      isDeleted: false
    }).populate('members.userId', 'name email image');

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { team }
    });

  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create team
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const validatedData = CreateTeamSchema.parse(body);

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has a team
    if (user.team?.teamId) {
      return NextResponse.json({ 
        error: 'You are already a member of a team' 
      }, { status: 400 });
    }

    // Check if slug is available
    const existingTeam = await Team.findOne({
      slug: validatedData.slug,
      isDeleted: false
    });

    if (existingTeam) {
      return NextResponse.json({ 
        error: 'Team slug is already taken' 
      }, { status: 400 });
    }

    const newTeam = new Team({
      name: validatedData.name,
      description: validatedData.description,
      slug: validatedData.slug,
      ownerId: user._id,
      plan: validatedData.plan,
      members: [{
        userId: user._id,
        role: 'owner',
        permissions: {
          createLinks: true,
          editLinks: true,
          deleteLinks: true,
          viewAnalytics: true,
          manageTeam: true,
          manageBilling: true
        },
        joinedAt: new Date(),
        invitedBy: user._id,
        status: 'active'
      }],
      billing: {
        billingEmail: user.email
      },
      settings: {
        maxMembers: validatedData.plan === 'enterprise' ? -1 : 10,
        linkRetention: 30,
        enforceSSO: false,
        allowGuestLinks: true,
        branding: {
          primaryColor: '#3B82F6'
        }
      },
      usage: {
        linksCount: 0,
        clicksCount: 0,
        membersCount: 1,
        storageUsed: 0,
        lastUpdated: new Date()
      },
      limits: {
        maxMembers: validatedData.plan === 'enterprise' ? -1 : 10,
        maxLinks: -1,
        maxClicks: -1,
        maxStorage: validatedData.plan === 'enterprise' ? -1 : 10000000000, // 10GB
        customDomains: validatedData.plan === 'enterprise' ? -1 : 5
      }
    });

    await newTeam.save();

    // Update user with team info
    user.team = {
      teamId: newTeam._id,
      role: 'owner',
      joinedAt: new Date()
    };
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Team created successfully',
      data: { team: newTeam }
    });

  } catch (error) {
    console.error('Team creation error:', error);
    
    if (error === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Invite team member
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { action } = body;

    if (action === 'invite') {
      return await inviteTeamMember(session.user.id, body);
    } else if (action === 'remove') {
      return await removeTeamMember(session.user.id, body);
    } else if (action === 'update') {
      return await updateTeamMember(session.user.id, body);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Team action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function inviteTeamMember(userId: string, data: any) {
  const validatedData = InviteMemberSchema.parse(data);
  
  const user = await User.findById(userId);
  if (!user?.team?.teamId) {
    return NextResponse.json({ error: 'User not in a team' }, { status: 400 });
  }

  const team = await Team.findById(user.team.teamId);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Check permissions
  const memberRole = team.members.find(m => m.userId.toString() === userId)?.role;
  if (memberRole !== 'owner' && memberRole !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Check if user already exists
  const invitedUser = await User.findOne({ email: validatedData.email });
  if (invitedUser?.team?.teamId) {
    return NextResponse.json({ 
      error: 'User is already a member of a team' 
    }, { status: 400 });
  }

  // Check team member limit
  if (team.members.length >= team.limits.maxMembers && team.limits.maxMembers !== -1) {
    return NextResponse.json({ 
      error: 'Team member limit reached' 
    }, { status: 400 });
  }

  // Generate invitation token
  const invitationToken = generateSecureToken(32);

  // Add to team members with pending status
  team.members.push({
    userId: invitedUser?._id || null,
    role: validatedData.role,
    permissions: validatedData.permissions || {
      createLinks: true,
      editLinks: true,
      deleteLinks: false,
      viewAnalytics: true,
      manageTeam: false,
      manageBilling: false
    },
    joinedAt: new Date(),
    invitedBy: userId,
    status: 'pending'
  });

  await team.save();

  // Send invitation email
  await EmailService.sendTeamInvitation(
    validatedData.email,
    team.name,
    user.name,
    invitationToken
  );

  return NextResponse.json({
    success: true,
    message: 'Invitation sent successfully'
  });
}

async function removeTeamMember(userId: string, data: any) {
  const { memberId } = data;
  
  const user = await User.findById(userId);
  if (!user?.team?.teamId) {
    return NextResponse.json({ error: 'User not in a team' }, { status: 400 });
  }

  const team = await Team.findById(user.team.teamId);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Check permissions
  const memberRole = team.members.find(m => m.userId.toString() === userId)?.role;
  if (memberRole !== 'owner' && memberRole !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Cannot remove owner
  const memberToRemove = team.members.find(m => m.userId.toString() === memberId);
  if (memberToRemove?.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 });
  }

  // Remove member
  team.members = team.members.filter(m => m.userId.toString() !== memberId);
  team.usage.membersCount = team.members.length;
  await team.save();

  // Update user's team info
  await User.findByIdAndUpdate(memberId, {
    $unset: { team: 1 }
  });

  return NextResponse.json({
    success: true,
    message: 'Member removed successfully'
  });
}

async function updateTeamMember(userId: string, data: any) {
  const { memberId, updates } = data;
  
  const user = await User.findById(userId);
  if (!user?.team?.teamId) {
    return NextResponse.json({ error: 'User not in a team' }, { status: 400 });
  }

  const team = await Team.findById(user.team.teamId);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Check permissions
  const memberRole = team.members.find(m => m.userId.toString() === userId)?.role;
  if (memberRole !== 'owner' && memberRole !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Find and update member
  const memberIndex = team.members.findIndex(m => m.userId.toString() === memberId);
  if (memberIndex === -1) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Cannot change owner role
  if (team.members[memberIndex].role === 'owner' && updates.role) {
    return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
  }

  // Update member
  if (updates.role) team.members[memberIndex].role = updates.role;
  if (updates.permissions) team.members[memberIndex].permissions = updates.permissions;

  await team.save();

  return NextResponse.json({
    success: true,
    message: 'Member updated successfully'
  });
}