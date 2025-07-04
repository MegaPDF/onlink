// ============= app/api/admin/domains/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { CreateDomainSchema } from '@/lib/validations';
import { nanoid } from 'nanoid';

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    // Build filter
    const filter: any = { isDeleted: false };
    
    if (search) {
      filter.domain = { $regex: search, $options: 'i' };
    }
    
    if (type) filter.type = type;
    if (status === 'verified') filter.isVerified = true;
    if (status === 'unverified') filter.isVerified = false;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const [domains, totalDomains] = await Promise.all([
      Domain.find(filter)
        .populate('userId', 'name email')
        .populate('teamId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Domain.countDocuments(filter)
    ]);

    // Get domain statistics
    const stats = await Domain.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalDomains: { $sum: 1 },
          verifiedDomains: { $sum: { $cond: ['$isVerified', 1, 0] } },
          activeDomains: { $sum: { $cond: ['$isActive', 1, 0] } },
          customDomains: { $sum: { $cond: [{ $eq: ['$type', 'custom'] }, 1, 0] } },
          systemDomains: { $sum: { $cond: [{ $eq: ['$type', 'system'] }, 1, 0] } }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        domains,
        pagination: {
          page,
          limit,
          total: totalDomains,
          totalPages: Math.ceil(totalDomains / limit),
          hasNextPage: page < Math.ceil(totalDomains / limit),
          hasPrevPage: page > 1
        },
        stats: stats[0] || {
          totalDomains: 0,
          verifiedDomains: 0,
          activeDomains: 0,
          customDomains: 0,
          systemDomains: 0
        }
      }
    });

  } catch (error) {
    console.error('Admin domains GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create system domain
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
      domain: validatedData.domain,
      isDeleted: false 
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
    }

    const newDomain = new Domain({
      domain: validatedData.domain,
      type: validatedData.type,
      isCustom: validatedData.type === 'custom',
      isVerified: validatedData.type === 'system', // System domains auto-verified
      isActive: validatedData.type === 'system',
      verificationCode,
      verificationMethod: validatedData.verificationMethod,
      dnsRecords,
      settings: {
        redirectType: 301,
        forceHttps: true,
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
        provider: 'letsencrypt',
        autoRenew: true
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
    });

  } catch (error) {
    console.error('Admin domain create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Verify domain
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

    const { domainId, action } = await req.json();

    const domain = await Domain.findById(domainId);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (action === 'verify') {
      // Mark domain as verified
      domain.isVerified = true;
      domain.isActive = true;
      domain.dnsRecords.forEach(record => {
        record.verified = true;
        record.verifiedAt = new Date();
      });
      
      await domain.save();

      return NextResponse.json({
        success: true,
        message: 'Domain verified successfully',
        data: domain
      });
    }

    if (action === 'activate') {
      domain.isActive = true;
      await domain.save();

      return NextResponse.json({
        success: true,
        message: 'Domain activated successfully'
      });
    }

    if (action === 'deactivate') {
      domain.isActive = false;
      await domain.save();

      return NextResponse.json({
        success: true,
        message: 'Domain deactivated successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin domain update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}