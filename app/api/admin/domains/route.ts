// app/api/admin/domains/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { CreateDomainSchema } from '@/lib/validations/domain';

// Get all domains with pagination and filtering
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

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const verification = searchParams.get('verification');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = { isDeleted: { $ne: true } };

    if (search) {
      query.domain = { $regex: search, $options: 'i' };
    }

    if (type && type !== 'all_types') {
      query.type = type;
    }

    if (status && status !== 'all_statuses') {
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
    }

    if (verification && verification !== 'all_verification') {
      if (verification === 'verified') query.isVerified = true;
      if (verification === 'unverified') query.isVerified = false;
    }

    // Count total documents
    const total = await Domain.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch domains with population
    const domains = await Domain.find(query)
      .populate('userId', 'name email')
      .populate('teamId', 'name slug')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean();

    // Calculate stats
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
        }
      }
    ]);

    const domainStats = stats[0] || {
      totalDomains: 0,
      activeDomains: 0,
      inactiveDomains: 0,
      verifiedDomains: 0,
      customDomains: 0,
      systemDomains: 0
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
    const validatedData = CreateDomainSchema.parse(body);

    // Check if domain already exists
    const existingDomain = await Domain.findOne({ 
      domain: validatedData.domain.toLowerCase().trim(),
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
    const dnsRecords: Array<{
      type: string;
      name: string;
      value: string;
      verified: boolean;
      verifiedAt?: Date;
    }> = [];
    
    if (validatedData.verificationMethod === 'dns') {
      dnsRecords.push({
        type: 'TXT',
        name: `_verification.${validatedData.domain}`,
        value: verificationCode,
        verified: false
      });
    }

    // For system domains, also add A record
    if (validatedData.type === 'system') {
      dnsRecords.push({
        type: 'A',
        name: validatedData.domain,
        value: process.env.SERVER_IP || '127.0.0.1',
        verified: false
      });

      // Add CNAME for www subdomain
      dnsRecords.push({
        type: 'CNAME',
        name: `www.${validatedData.domain}`,
        value: validatedData.domain,
        verified: false
      });
    }

    const newDomain = new Domain({
      domain: validatedData.domain.toLowerCase().trim(),
      type: validatedData.type,
      isCustom: validatedData.type === 'custom',
      isVerified: validatedData.type === 'system', // System domains auto-verified
      isActive: validatedData.type === 'system',
      verificationCode,
      verificationMethod: validatedData.verificationMethod,
      dnsRecords,
      settings: {
        redirectType: 301,
        forceHttps: validatedData.type === 'system' ? false : true, // Dev mode
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
        provider: validatedData.sslProvider || 'letsencrypt',
        autoRenew: validatedData.autoRenew !== false
      },
      usage: {
        linksCount: 0,
        clicksCount: 0,
        bandwidthUsed: 0,
        lastUpdated: new Date()
      }
    });

    await newDomain.save();

    // Create audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'create_domain',
      resource: 'domain',
      resourceId: newDomain._id.toString(),
      details: {
        method: 'POST',
        metadata: {
          domain: newDomain.domain,
          type: newDomain.type,
          verificationMethod: newDomain.verificationMethod
        }
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: true,
        statusCode: 201
      },
      risk: {
        level: 'medium',
        factors: ['admin_action', 'domain_creation'],
        score: 50
      }
    });

    await auditLog.save();

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

// Update domain (verify, activate, deactivate)
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

    let updateData: any = {};
    let action = '';
    let message = '';

    // Handle different update actions
    if ('isActive' in body) {
      updateData.isActive = body.isActive;
      action = body.isActive ? 'activate_domain' : 'deactivate_domain';
      message = `Domain ${body.isActive ? 'activated' : 'deactivated'} successfully`;
    }

    if ('isVerified' in body) {
      updateData.isVerified = body.isVerified;
      if (body.isVerified) {
        updateData.isActive = true;
        // Mark all DNS records as verified
        updateData.dnsRecords = domain.dnsRecords.map(record => ({
          ...record,
          verified: true,
          verifiedAt: new Date()
        }));
        action = 'verify_domain';
        message = 'Domain verified successfully';
      }
    }

    if ('action' in body) {
      if (body.action === 'verify') {
        updateData.isVerified = true;
        updateData.isActive = true;
        updateData.dnsRecords = domain.dnsRecords.map(record => ({
          ...record,
          verified: true,
          verifiedAt: new Date()
        }));
        action = 'verify_domain';
        message = 'Domain verified successfully';
      }
    }

    // Update the domain
    const updatedDomain = await Domain.findByIdAndUpdate(
      domainId,
      updateData,
      { new: true, runValidators: true }
    );

    // Create audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: action || 'update_domain',
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'PUT',
        changes: Object.keys(updateData).map(key => ({
          field: key,
          oldValue: domain[key],
          newValue: updateData[key]
        }))
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: true,
        statusCode: 200
      },
      risk: {
        level: 'medium',
        factors: ['admin_action', 'domain_modification'],
        score: 60
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: message || 'Domain updated successfully',
      data: updatedDomain
    });

  } catch (error) {
    console.error('Admin domain update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete domain - THIS WAS MISSING!
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

    // Check if domain has active links
    const { URL } = await import('@/models/URL');
    const activeLinksCount = await URL.countDocuments({
      domain: domain.domain,
      isDeleted: { $ne: true },
      isActive: true
    });

    if (activeLinksCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete domain. It has ${activeLinksCount} active links. Please deactivate or move the links first.`,
        activeLinks: activeLinksCount
      }, { status: 409 });
    }

    // Soft delete the domain
    await Domain.findByIdAndUpdate(domainId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // Create audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'delete_domain',
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'DELETE',
        metadata: {
          domain: domain.domain,
          type: domain.type,
          wasVerified: domain.isVerified,
          linksCount: domain.usage?.linksCount || 0
        }
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: true,
        statusCode: 200
      },
      risk: {
        level: 'high',
        factors: ['admin_action', 'domain_deletion'],
        score: 80
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully'
    });

  } catch (error) {
    console.error('Admin domain delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}