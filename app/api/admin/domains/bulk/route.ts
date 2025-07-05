import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';

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

    const { action, domainIds } = await req.json();

    if (!action || !domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json({ 
        error: 'Action and domain IDs are required' 
      }, { status: 400 });
    }

    if (domainIds.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 domains can be processed at once' 
      }, { status: 400 });
    }

    // Validate that all domains exist and are not deleted
    const domains = await Domain.find({
      _id: { $in: domainIds },
      isDeleted: { $ne: true }
    });

    if (domains.length !== domainIds.length) {
      return NextResponse.json({ 
        error: 'Some domains were not found or are already deleted' 
      }, { status: 404 });
    }

    let updateData: any = {};
    let actionName = '';
    let message = '';

    switch (action) {
      case 'activate':
        updateData = { isActive: true };
        actionName = 'bulk_activate_domains';
        message = 'domains activated';
        break;

      case 'deactivate':
        updateData = { isActive: false };
        actionName = 'bulk_deactivate_domains';
        message = 'domains deactivated';
        break;

      case 'verify':
        updateData = { 
          isVerified: true, 
          isActive: true,
          $set: {
            'dnsRecords.$[].verified': true,
            'dnsRecords.$[].verifiedAt': new Date()
          }
        };
        actionName = 'bulk_verify_domains';
        message = 'domains verified';
        break;

      case 'delete':
        updateData = { 
          isDeleted: true, 
          deletedAt: new Date(),
          isActive: false 
        };
        actionName = 'bulk_delete_domains';
        message = 'domains deleted';
        break;

      default:
        return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 });
    }

    // Perform bulk update
    const result = await Domain.updateMany(
      { _id: { $in: domainIds } },
      updateData
    );

    // Create audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: actionName,
      resource: 'domain',
      resourceId: 'bulk',
      details: {
        method: 'PUT',
        metadata: {
          action,
          domainIds,
          domainsAffected: result.modifiedCount,
          domainList: domains.map(d => d.domain)
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
        level: action === 'delete' ? 'high' : 'medium',
        factors: ['admin_action', 'bulk_operation', `bulk_${action}`],
        score: action === 'delete' ? 80 : 60
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} ${message} successfully`,
      data: {
        processed: result.modifiedCount,
        total: domainIds.length
      }
    });

  } catch (error) {
    console.error('Bulk domains operation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}