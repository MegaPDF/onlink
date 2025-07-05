import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';

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

    const url = new URL(req.url);
    const domainId = url.searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.isDeleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Parse request body for configuration options
    const body = await req.json().catch(() => ({}));
    
    const updateData: any = {};

    // Update domain configuration
    if (body.forceHttps !== undefined) {
      updateData['settings.forceHttps'] = body.forceHttps;
    }

    if (body.enableCompression !== undefined) {
      updateData['settings.enableCompression'] = body.enableCompression;
    }

    if (body.redirectType && ['301', '302'].includes(body.redirectType)) {
      updateData['settings.redirectType'] = parseInt(body.redirectType);
    }

    if (body.cacheControl) {
      updateData['settings.cacheControl'] = body.cacheControl;
    }

    if (body.rateLimiting) {
      if (body.rateLimiting.enabled !== undefined) {
        updateData['settings.security.rateLimiting.enabled'] = body.rateLimiting.enabled;
      }
      if (body.rateLimiting.requestsPerMinute) {
        updateData['settings.security.rateLimiting.requestsPerMinute'] = body.rateLimiting.requestsPerMinute;
      }
    }

    // If no specific configuration provided, apply default optimizations
    if (Object.keys(updateData).length === 0) {
      updateData['settings.forceHttps'] = true;
      updateData['settings.enableCompression'] = true;
      updateData['settings.redirectType'] = 301;
      updateData['settings.cacheControl'] = 'public, max-age=3600';
      updateData['settings.security.rateLimiting.enabled'] = true;
      updateData['settings.security.rateLimiting.requestsPerMinute'] = 60;
    }

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
      action: 'configure_domain',
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'POST',
        changes: Object.keys(updateData).map(key => ({
          field: key,
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
        factors: ['admin_action', 'domain_configuration'],
        score: 50
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: 'Domain configuration updated successfully',
      data: updatedDomain
    });

  } catch (error) {
    console.error('Domain configuration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}