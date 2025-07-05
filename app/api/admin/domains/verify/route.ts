// app/api/admin/domains/verify/route.ts - NEW FILE
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { Domain } from '@/models/Domain';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authOptions } from '@/lib/auth';
import dns from 'dns/promises';

// DNS verification utility
async function verifyDNSRecord(record: any): Promise<boolean> {
  try {
    switch (record.type) {
      case 'TXT':
        const txtRecords = await dns.resolveTxt(record.name);
        const flatTxtRecords = txtRecords.flat();
        return flatTxtRecords.some(txt => txt.includes(record.value));
      
      case 'A':
        const aRecords = await dns.resolve4(record.name);
        return aRecords.includes(record.value);
      
      case 'CNAME':
        const cnameRecords = await dns.resolveCname(record.name);
        return cnameRecords.includes(record.value);
      
      default:
        return false;
    }
  } catch (error) {
    console.log(`DNS verification failed for ${record.name}:`, error);
    return false;
  }
}

// File verification utility (for file-based verification)
async function verifyFileVerification(domain: string, verificationCode: string): Promise<boolean> {
  try {
    const verificationUrl = `http://${domain}/.well-known/domain-verification/${verificationCode}.txt`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(verificationUrl, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return false;
    
    const content = await response.text();
    return content.trim() === verificationCode;
  } catch (error) {
    console.log(`File verification failed for ${domain}:`, error);
    return false;
  }
}

// Meta tag verification utility
async function verifyMetaTagVerification(domain: string, verificationCode: string): Promise<boolean> {
  try {
    const verificationUrl = `http://${domain}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(verificationUrl, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return false;
    
    const html = await response.text();
    const metaTagRegex = new RegExp(`<meta\\s+name=["\']domain-verification["\']\\s+content=["\']${verificationCode}["\']`, 'i');
    return metaTagRegex.test(html);
  } catch (error) {
    console.log(`Meta tag verification failed for ${domain}:`, error);
    return false;
  }
}

// Verify domain ownership
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

    const { searchParams } = req.nextUrl;
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.isDeleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    if (domain.isVerified) {
      return NextResponse.json({ 
        success: true,
        message: 'Domain is already verified',
        data: domain
      });
    }

    let verificationResults: any = {
      success: false,
      method: domain.verificationMethod,
      records: [],
      errors: []
    };

    try {
      switch (domain.verificationMethod) {
        case 'dns':
          // Verify all DNS records
          const dnsResults = await Promise.allSettled(
            domain.dnsRecords.map(async (record) => {
              const isVerified = await verifyDNSRecord(record);
              return {
                ...record,
                verified: isVerified,
                verifiedAt: isVerified ? new Date() : undefined
              };
            })
          );

          verificationResults.records = dnsResults.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              verificationResults.errors.push(`DNS verification failed for record ${index + 1}: ${result.reason}`);
              return {
                ...domain.dnsRecords[index],
                verified: false,
                error: result.reason
              };
            }
          });

          // Check if all required records are verified
          const allDNSVerified = verificationResults.records.every((record: any) => record.verified);
          verificationResults.success = allDNSVerified;
          break;

        case 'file':
          // Verify file-based verification
          const fileVerified = await verifyFileVerification(domain.domain, domain.verificationCode || '');
          verificationResults.success = fileVerified;
          if (!fileVerified) {
            verificationResults.errors.push('Verification file not found or invalid');
          }
          break;

        case 'meta':
          // Verify meta tag verification
          const metaVerified = await verifyMetaTagVerification(domain.domain, domain.verificationCode || '');
          verificationResults.success = metaVerified;
          if (!metaVerified) {
            verificationResults.errors.push('Verification meta tag not found or invalid');
          }
          break;

        default:
          verificationResults.errors.push('Invalid verification method');
      }
    } catch (error) {
      verificationResults.errors.push(`Verification process failed: ${error}`);
    }

    // Update domain based on verification results
    let updateData: any = {};

    if (verificationResults.success) {
      updateData = {
        isVerified: true,
        isActive: true,
        dnsRecords: verificationResults.records || domain.dnsRecords.map(record => ({
          ...record,
          verified: true,
          verifiedAt: new Date()
        }))
      };
    } else {
      // Update individual record verification status for DNS method
      if (domain.verificationMethod === 'dns' && verificationResults.records) {
        updateData.dnsRecords = verificationResults.records;
      }
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
      action: verificationResults.success ? 'verify_domain_success' : 'verify_domain_failed',
      resource: 'domain',
      resourceId: domainId,
      details: {
        method: 'POST',
        endpoint: '/api/admin/domains/verify',
        metadata: {
          domain: domain.domain,
          verificationMethod: domain.verificationMethod,
          verificationResults,
          errors: verificationResults.errors
        }
      },
      context: {
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || ''
      },
      result: {
        success: verificationResults.success,
        statusCode: 200,
        error: verificationResults.errors.length > 0 ? verificationResults.errors.join(', ') : undefined
      },
      risk: {
        level: verificationResults.success ? 'low' : 'medium',
        factors: ['admin_action', 'domain_verification'],
        score: verificationResults.success ? 30 : 50
      }
    });

    await auditLog.save();

    return NextResponse.json({
      success: true,
      message: verificationResults.success 
        ? 'Domain verified successfully' 
        : 'Domain verification failed',
      data: {
        domain: updatedDomain,
        verification: verificationResults
      }
    });

  } catch (error) {
    console.error('Domain verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get verification instructions
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
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.isDeleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    let instructions = {
      method: domain.verificationMethod,
      domain: domain.domain,
      verificationCode: domain.verificationCode,
      records: domain.dnsRecords,
      steps: [] as string[]
    };

    switch (domain.verificationMethod) {
      case 'dns':
        instructions.steps = [
          '1. Log into your domain registrar or DNS provider',
          '2. Add the following DNS records:',
          ...domain.dnsRecords.map(record => 
            `   - ${record.type} record: ${record.name} → ${record.value}`
          ),
          '3. Wait for DNS propagation (may take up to 48 hours)',
          '4. Click "Verify Domain" to check the records'
        ];
        break;

      case 'file':
        instructions.steps = [
          '1. Create a file with the following content:',
          `   Content: ${domain.verificationCode}`,
          '2. Upload the file to your website at:',
          `   http://${domain.domain}/.well-known/domain-verification/${domain.verificationCode}.txt`,
          '3. Ensure the file is publicly accessible',
          '4. Click "Verify Domain" to check the file'
        ];
        break;

      case 'meta':
        instructions.steps = [
          '1. Add the following meta tag to your website\'s homepage:',
          `   <meta name="domain-verification" content="${domain.verificationCode}">`,
          '2. Place it in the <head> section of your HTML',
          '3. Ensure it\'s accessible at http://' + domain.domain,
          '4. Click "Verify Domain" to check the meta tag'
        ];
        break;
    }

    return NextResponse.json({
      success: true,
      data: instructions
    });

  } catch (error) {
    console.error('Get verification instructions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}