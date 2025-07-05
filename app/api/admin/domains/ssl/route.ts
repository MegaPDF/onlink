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

    const body = await req.json();
    const action = body.action || 'renew_ssl';
    const provider = body.provider || 'letsencrypt';

    let updateData: any = {};
    let message = '';

    switch (action) {
      case 'renew_ssl':
        updateData = {
          'ssl.status': 'valid',
          'ssl.provider': provider,
          'ssl.validFrom': new Date(),
          'ssl.validTo': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          'ssl.autoRenew': body.autoRenew !== false
        };
        message = 'SSL certificate renewed successfully';
        break;

      case 'enable_auto_renew':
        updateData = {
          'ssl.autoRenew': true
        };
        message = 'SSL auto-renewal enabled';
        break;

      case 'disable_auto_renew':
        updateData = {
          'ssl.autoRenew': false
        };
        message = 'SSL auto-renewal disabled';
        break;

      case 'change_provider':
        updateData = {
          'ssl.provider': provider,
          'ssl.status': 'pending'
        };
        message = `SSL provider changed to ${provider}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid SSL action' }, { status: 400 });
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
      action: `ssl_${action}`,
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'POST',
        metadata: {
          domain: domain.domain,
          action,
          provider,
          autoRenew: body.autoRenew
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
        level: 'medium',
        factors: ['admin_action', 'ssl_management'],
        score: 60
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message,
      data: updatedDomain
    });

  } catch (error) {
    console.error('SSL management error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}