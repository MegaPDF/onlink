import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { Analytics } from '@/models/Analytics';
import { URL } from '@/models/URL';

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

    // Get search params from URL
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const verification = url.searchParams.get('verification');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

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

    // Calculate stats including SSL expiring soon
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
    const dnsRecords: Array<{
      type: string;
      name: string;
      value: string;
      verified: boolean;
      verifiedAt?: Date;
    }> = [];
    
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

      // Add CNAME for www subdomain
      dnsRecords.push({
        type: 'CNAME',
        name: `www.${body.domain}`,
        value: body.domain,
        verified: false
      });
    }

    const newDomain = new Domain({
      domain: body.domain.toLowerCase().trim(),
      type: body.type,
      isCustom: body.type === 'custom',
      isVerified: body.type === 'system', // System domains auto-verified
      isActive: body.type === 'system',
      verificationCode,
      verificationMethod: body.verificationMethod || 'dns',
      dnsRecords,
      settings: {
        redirectType: 301,
        forceHttps: body.type === 'system' ? false : true, // Dev mode
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
        autoRenew: body.autoRenew !== false,
        status: 'pending'
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

    const url = new URL(req.url);
    const domainId = url.searchParams.get('domainId');
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

    const domainId = req.nextUrl.searchParams.get('domainId');
    
    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.isDeleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    console.log('🗑️ HARD DELETE: Permanently removing domain from database:', domain.domain);

    // STEP 1: Find all URLs using this domain
    const urlsUsingDomain = await URL.find({ domain: domain.domain });
    console.log(`Found ${urlsUsingDomain.length} URLs using this domain`);

    // STEP 2: Delete analytics for all URLs using this domain
    let analyticsDeleted = 0;
    for (const url of urlsUsingDomain) {
      const result = await Analytics.deleteMany({ shortCode: url.shortCode });
      analyticsDeleted += result.deletedCount;
    }
    console.log(`✅ Deleted ${analyticsDeleted} analytics records`);

    // STEP 3: Handle URLs using this domain
    const shouldDeleteUrls = req.nextUrl.searchParams.get('deleteUrls') === 'true';
    
    if (shouldDeleteUrls) {
      // Delete all URLs using this domain
      const urlsDeleted = await URL.deleteMany({ domain: domain.domain });
      console.log(`✅ Deleted ${urlsDeleted.deletedCount} URLs using this domain`);
    } else {
      // Move URLs to default domain
      const defaultDomain = process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3000';
      const urlsUpdated = await URL.updateMany(
        { domain: domain.domain },
        { domain: defaultDomain }
      );
      console.log(`✅ Moved ${urlsUpdated.modifiedCount} URLs to default domain: ${defaultDomain}`);
    }

    // STEP 4: Delete any SSL certificates or DNS records (if you store them)
    // Add your specific domain-related cleanup here

    // STEP 5: FIXED - Actually delete the domain from database
    await Domain.findByIdAndDelete(domainId);
    console.log('✅ Domain PERMANENTLY DELETED from database:', domain.domain);

    // STEP 6: Create audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'hard_delete_domain',
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'DELETE',
        type: 'permanent',
        domain: domain.domain,
        domainType: domain.type,
        urlsAffected: urlsUsingDomain.length,
        analyticsDeleted,
        urlsDeleted: shouldDeleteUrls
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
        factors: ['admin_action', 'domain_deletion', 'url_impact'],
        score: 85
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'Domain permanently deleted from database',
      deletedData: {
        domain: domain.domain,
        urlsAffected: urlsUsingDomain.length,
        analyticsDeleted,
        urlsDeleted: shouldDeleteUrls
      }
    });

  } catch (error) {
    console.error('Admin domain delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
