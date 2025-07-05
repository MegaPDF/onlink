import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { connectDB } from '@/lib/mongodb';

// Get domains with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // FIXED: Use req.nextUrl instead of new URL(req.url)
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const verification = searchParams.get('verification') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query: any = { isDeleted: { $ne: true } };

    if (search) {
      query.domain = { $regex: search, $options: 'i' };
    }

    if (status) {
      query.isActive = status === 'active';
    }

    if (type) {
      query.type = type;
    }

    if (verification) {
      query.isVerified = verification === 'verified';
    }

    // Get total count for pagination
    const total = await Domain.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder;

    // Fetch domains with population
    const domains = await Domain.find(query)
      .populate('userId', 'name email')
      .populate('teamId', 'name slug')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean();

    // Calculate stats
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const stats = await Domain.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalDomains: { $sum: 1 },
          activeDomains: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveDomains: { $sum: { $cond: ['$isActive', 0, 1] } },
          verifiedDomains: { $sum: { $cond: ['$isVerified', 1, 0] } },
          customDomains: { $sum: { $cond: [{ $eq: ['$type', 'custom'] }, 1, 0] } },
          systemDomains: { $sum: { $cond: [{ $eq: ['$type', 'system'] }, 1, 0] } },
          sslExpiringSoon: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $ne: ['$ssl.validTo', null] },
                    { $lte: ['$ssl.validTo', thirtyDaysFromNow] },
                    { $gte: ['$ssl.validTo', now] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          },
          totalLinks: { $sum: '$usage.linksCount' }
        }
      }
    ]);

    const domainStats = stats[0] || {
      totalDomains: 0,
      activeDomains: 0,
      inactiveDomains: 0,
      verifiedDomains: 0,
      customDomains: 0,
      systemDomains: 0,
      sslExpiringSoon: 0,
      totalLinks: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        domains,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        stats: domainStats
      }
    });

  } catch (error) {
    console.error('Admin domains GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new domain
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Basic validation
    if (!body.domain || !body.type) {
      return NextResponse.json({ 
        error: 'Domain and type are required' 
      }, { status: 400 });
    }

    // Check if domain already exists
    const existingDomain = await Domain.findOne({ 
      domain: body.domain.toLowerCase().trim(),
      isDeleted: { $ne: true }
    });

    if (existingDomain) {
      return NextResponse.json({ 
        error: 'Domain already exists' 
      }, { status: 400 });
    }

    // Create verification code
    const verificationCode = nanoid(32);

    // Create DNS records for verification
    const dnsRecords: any[] = [];
    
    if (body.verificationMethod === 'dns') {
      dnsRecords.push({
        type: 'TXT',
        name: `_verification.${body.domain}`,
        value: verificationCode,
        verified: false
      });
    }

    // For system domains, also add A record
    if (body.type === 'system') {
      dnsRecords.push({
        type: 'A',
        name: body.domain,
        value: process.env.SERVER_IP || '127.0.0.1',
        verified: false
      });
    }

    const newDomain = new Domain({
      domain: body.domain.toLowerCase().trim(),
      type: body.type,
      isCustom: body.type === 'custom',
      isVerified: body.type === 'system',
      isActive: body.type === 'system',
      verificationCode,
      verificationMethod: body.verificationMethod || 'dns',
      dnsRecords,
      settings: {
        redirectType: 301,
        forceHttps: body.type === 'system',
        enableCompression: true,
        cacheControl: 'public, max-age=3600',
        branding: {},
        security: {
          enableCaptcha: false,
          ipWhitelist: [],
          ipBlacklist: [],
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 60
          }
        }
      },
      ssl: {
        provider: body.sslProvider || 'letsencrypt',
        autoRenew: body.autoRenew !== false
      },
      usage: {
        linksCount: 0,
        clicksCount: 0,
        bandwidthUsed: 0,
        lastUpdated: new Date()
      }
    });

    await newDomain.save();

    return NextResponse.json({
      success: true,
      message: 'Domain created successfully',
      data: newDomain
    }, { status: 201 });

  } catch (error) {
    console.error('Admin domain create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update domain
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const domainId = searchParams.get('domainId');
    const body = await req.json();

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.isDeleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Update domain
    const updatedDomain = await Domain.findByIdAndUpdate(
      domainId,
      { $set: body },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Domain updated successfully',
      data: updatedDomain
    });

  } catch (error) {
    console.error('Admin domain update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete domain
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const domainId = searchParams.get('domainId');
    
    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.isDeleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Soft delete
    await Domain.findByIdAndUpdate(domainId, {
      isDeleted: true,
      deletedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully'
    });

  } catch (error) {
    console.error('Admin domain delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
