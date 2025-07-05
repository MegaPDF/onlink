// app/api/admin/domains/bulk/route.ts - NEW FILE
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';

// Bulk operations for domains
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
    let results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

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

        // Check for domains with active links
        const { URL } = await import('@/models/URL');
        const domainsWithLinks = await Promise.all(
          domains.map(async (domain) => {
            const linkCount = await URL.countDocuments({
              domain: domain.domain,
              isDeleted: { $ne: true },
              isActive: true
            });
            return { domain: domain.domain, linkCount };
          })
        );

        const problematicDomains = domainsWithLinks.filter(d => d.linkCount > 0);
        if (problematicDomains.length > 0) {
          return NextResponse.json({
            error: `Cannot delete domains with active links: ${problematicDomains.map(d => `${d.domain} (${d.linkCount} links)`).join(', ')}`,
            problematicDomains
          }, { status: 409 });
        }
        break;

      case 'force_https':
        updateData = { 'settings.forceHttps': true };
        actionName = 'bulk_enable_https';
        message = 'domains set to force HTTPS';
        break;

      case 'disable_https':
        updateData = { 'settings.forceHttps': false };
        actionName = 'bulk_disable_https';
        message = 'domains set to allow HTTP';
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Allowed: activate, deactivate, verify, delete, force_https, disable_https' 
        }, { status: 400 });
    }

    // Process each domain individually to handle errors gracefully
    const processResults = await Promise.allSettled(
      domainIds.map(async (domainId) => {
        try {
          const result = await Domain.findByIdAndUpdate(
            domainId,
            updateData,
            { new: true, runValidators: true }
          );
          
          if (!result) {
            throw new Error(`Domain ${domainId} not found`);
          }
          
          return { domainId, success: true, domain: result };
        } catch (error) {
          throw new Error(`Failed to update domain ${domainId}: ${error}`);
        }
      })
    );

    // Collect results
    processResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(result.reason);
      }
    });

    // Create bulk audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: actionName,
      resource: 'domain',
      details: {
        method: 'PUT',
        endpoint: '/api/admin/domains/bulk',
        metadata: {
          action,
          domainIds,
          domainsProcessed: domainIds.length,
          successCount: results.success,
          failedCount: results.failed,
          updateData
        }
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: results.failed === 0,
        statusCode: results.failed === 0 ? 200 : 207, // 207 = Multi-Status
        error: results.errors.length > 0 ? results.errors.join('; ') : undefined
      },
      risk: {
        level: action === 'delete' ? 'high' : 'medium',
        factors: ['admin_action', 'bulk_operation', 'domain_modification'],
        score: action === 'delete' ? 85 : 65
      }
    });

    await auditLog.save();

    const responseMessage = results.failed === 0 
      ? `Successfully ${message} ${results.success} domains`
      : `Processed ${domainIds.length} domains: ${results.success} successful, ${results.failed} failed`;

    return NextResponse.json({
      success: results.failed === 0,
      message: responseMessage,
      data: {
        processed: domainIds.length,
        successful: results.success,
        failed: results.failed,
        errors: results.errors
      }
    }, { 
      status: results.failed === 0 ? 200 : 207 
    });

  } catch (error) {
    console.error('Bulk domain operation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get bulk operation status (for long-running operations)
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
    const operationId = searchParams.get('operationId');

    if (!operationId) {
      // Return recent bulk operations
      const recentOperations = await AuditLog.find({
        userId: session.user.id,
        action: { $regex: /^bulk_/ },
        resource: 'domain'
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

      return NextResponse.json({
        success: true,
        data: recentOperations.map(op => ({
          id: op._id,
          action: op.action,
          timestamp: op.timestamp,
          success: op.result.success,
          processed: op.details.metadata?.domainsProcessed || 0,
          successful: op.details.metadata?.successCount || 0,
          failed: op.details.metadata?.failedCount || 0
        }))
      });
    }

    // Get specific operation details
    const operation = await AuditLog.findById(operationId);
    if (!operation || operation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: operation._id,
        action: operation.action,
        timestamp: operation.timestamp,
        success: operation.result.success,
        details: operation.details.metadata,
        errors: operation.result.error ? [operation.result.error] : []
      }
    });

  } catch (error) {
    console.error('Get bulk operation status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}