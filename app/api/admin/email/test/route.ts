// app/api/admin/email/test/route.ts - Improved with better error handling
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { EmailService } from '@/lib/email';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

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

    console.log('🧪 Admin testing email configuration...');

    // Test email configuration
    const result = await EmailService.testEmailConfiguration();
    
    if (result.success) {
      console.log('✅ SMTP test successful, attempting to send test email...');
      
      // If SMTP test passed, try to send a test email
      try {
        await EmailService.sendEmail({
          to: session.user.email!,
          subject: '✅ Email Configuration Test - Success!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #059669; margin: 0;">✅ Email Test Successful!</h2>
              </div>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0; color: #065f46;">
                  <strong>Congratulations!</strong> Your SMTP configuration is working correctly.
                </p>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 10px;">Test Details:</h3>
                <ul style="color: #6b7280; line-height: 1.6;">
                  <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
                  <li><strong>Tested By:</strong> ${currentUser.name} (${currentUser.email})</li>
                  <li><strong>Status:</strong> SMTP connection verified and email sent successfully</li>
                </ul>
              </div>
              
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 6px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>Next Steps:</strong> Your email system is ready to send welcome emails, password resets, and notifications to users.
                </p>
              </div>
            </div>
          `
        });
        
        console.log('✅ Test email sent successfully');
        
        return NextResponse.json({
          success: true,
          message: 'Email configuration test successful! Check your inbox for the test email.',
          details: 'SMTP connection verified and test email sent successfully'
        });
        
      } catch (emailError: any) {
        console.error('❌ Failed to send test email:', emailError);
        
        return NextResponse.json({
          success: false,
          error: 'SMTP connection successful but failed to send test email',
          details: emailError.message,
          debugInfo: {
            smtpVerified: true,
            emailSendFailed: true,
            errorCode: emailError.code
          }
        }, { status: 400 });
      }
    } else {
      console.error('❌ SMTP configuration test failed:', result);
      
      return NextResponse.json({
        success: false,
        error: result.error || 'Email configuration test failed',
        details: (result as any).details,
        debugInfo: {
          smtpVerified: false,
          errorCode: result,
          responseCode: result
        }
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Email test API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during email test',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check current SMTP configuration status
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

    // Get current SMTP settings (without sensitive data)
    const { Settings } = await import('@/models/Settings');
    const settings = await Settings.findOne();
    const smtpConfig = settings?.system?.smtp;
    
    if (!smtpConfig) {
      return NextResponse.json({
        configured: false,
        message: 'No SMTP configuration found'
      });
    }

    const configStatus = {
      configured: true,
      hasHost: !!smtpConfig.host,
      hasPort: !!smtpConfig.port,
      hasAuth: !!(smtpConfig.username && smtpConfig.password),
      hasFromEmail: !!smtpConfig.fromEmail,
      settings: {
        host: smtpConfig.host || 'Not set',
        port: smtpConfig.port || 'Not set',
        secure: smtpConfig.secure,
        username: smtpConfig.username ? '***configured***' : 'Not set',
        fromName: smtpConfig.fromName || 'Not set',
        fromEmail: smtpConfig.fromEmail || 'Not set'
      }
    };

    return NextResponse.json(configStatus);

  } catch (error: any) {
    console.error('Error checking SMTP configuration:', error);
    return NextResponse.json({
      error: 'Failed to check SMTP configuration',
      details: error.message
    }, { status: 500 });
  }
}