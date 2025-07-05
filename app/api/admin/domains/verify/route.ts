import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';
import dns from 'dns/promises';

// DNS verification utility
async function verifyDNSRecord(record: any): Promise<{ verified: boolean; error?: string }> {
  try {
    switch (record.type) {
      case 'TXT':
        const txtRecords = await dns.resolveTxt(record.name);
        const flatTxtRecords = txtRecords.flat();
        const verified = flatTxtRecords.some(txt => 
          txt.includes(record.value) || txt === record.value
        );
        return { verified };
      
      case 'A':
        const aRecords = await dns.resolve4(record.name);
        const aVerified = aRecords.includes(record.value);
        return { verified: aVerified };
      
      case 'CNAME':
        const cnameRecords = await dns.resolveCname(record.name);
        const cnameVerified = cnameRecords.some(cname => 
          cname === record.value || cname === record.value + '.'
        );
        return { verified: cnameVerified };
      
      default:
        return { verified: false, error: `Unsupported record type: ${record.type}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown DNS error';
    return { verified: false, error: errorMessage };
  }
}

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

    if (domain.isVerified) {
      return NextResponse.json({ error: 'Domain is already verified' }, { status: 400 });
    }

    // Verify DNS records
    const verificationResults: { record: any; verified: boolean; error?: string }[] = [];
    let allVerified = true;

    for (const record of domain.dnsRecords) {
      const result = await verifyDNSRecord(record);
      verificationResults.push({
        record,
        verified: result.verified,
        error: result.error
      });
      
      if (!result.verified) {
        allVerified = false;
      }
    }

    // Update domain verification status
    let updateData: any = {};
    let message = '';

    if (allVerified) {
      updateData = {
        isVerified: true,
        isActive: true,
        dnsRecords: domain.dnsRecords.map(record => ({
          ...record,
          verified: true,
          verifiedAt: new Date()
        })),
        'ssl.status': 'valid',
        'ssl.validFrom': new Date(),
        'ssl.validTo': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };
      message = 'Domain verified successfully';
    } else {
      message = 'Domain verification failed. Please check DNS records.';
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
      action: allVerified ? 'verify_domain_success' : 'verify_domain_failed',
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'POST',
        metadata: {
          domain: domain.domain,
          verificationResults,
          allVerified
        }
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: allVerified,
        statusCode: allVerified ? 200 : 400
      },
      risk: {
        level: 'medium',
        factors: ['admin_action', 'domain_verification'],
        score: 50
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: allVerified,
      message,
      data: {
        domain: updatedDomain,
        verificationResults
      }
    }, { status: allVerified ? 200 : 400 });

  } catch (error) {
    console.error('Domain verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
