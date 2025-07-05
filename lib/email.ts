import nodemailer from 'nodemailer';
import { Settings } from '@/models/Settings';
import { connectDB } from '@/lib/mongodb';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static lastConfigUpdate = 0;
  private static readonly CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  static async getTransporter() {
    const now = Date.now();
    
    // Clear cache if config is old
    if (this.transporter && (now - this.lastConfigUpdate > this.CONFIG_CACHE_DURATION)) {
      this.transporter = null;
    }
    
    if (this.transporter) {
      return this.transporter;
    }
    
    try {
      await connectDB();
      
      // Get SMTP settings from database
      const settings = await Settings.findOne();
      const smtpConfig = settings?.system?.smtp;
      
      if (!smtpConfig?.host) {
        console.warn('SMTP configuration not found in database, using fallback');
        return this.createFallbackTransporter();
      }

      // Validate required SMTP settings
      if (!smtpConfig.host || !smtpConfig.port) {
        throw new Error('SMTP host and port are required');
      }

      console.log('Creating SMTP transporter with config:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        username: smtpConfig.username ? '***' : 'none',
        fromName: smtpConfig.fromName,
        fromEmail: smtpConfig.fromEmail
      });

      // Create transporter with proper configuration
      const transporterConfig: any = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure, // true for 465, false for other ports
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false, // Accept self-signed certificates
        },
        // Connection timeout
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        // Debug options
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      };

      // Only add auth if credentials are provided
      if (smtpConfig.username && smtpConfig.password) {
        transporterConfig.auth = {
          user: smtpConfig.username,
          pass: smtpConfig.password
        };
      }

      this.transporter = nodemailer.createTransport(transporterConfig);
      this.lastConfigUpdate = now;
      
      console.log('✅ SMTP transporter created successfully');
      
      return this.transporter;
    } catch (error) {
      console.error('❌ Error creating SMTP transporter:', error);
      
      // Clear failed transporter
      this.transporter = null;
      
      // Return fallback transporter for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Using fallback transporter for development');
        return this.createFallbackTransporter();
      }
      
      throw error;
    }
  }

  private static createFallbackTransporter() {
    console.log('📧 Creating fallback email transporter (logs to console)');
    
    // For development: create a test transporter that logs emails
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }
  
  static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    try {
      console.log(`📧 Attempting to send email to: ${options.to}`);
      console.log(`📧 Subject: ${options.subject}`);
      
      const transporter = await this.getTransporter();
      
      // Get sender info from settings
      let fromName = 'ShortLink';
      let fromEmail = 'noreply@shortlink.local';
      
      try {
        await connectDB();
        const settings = await Settings.findOne();
        if (settings?.system?.smtp) {
          fromName = settings.system.smtp.fromName || fromName;
          fromEmail = settings.system.smtp.fromEmail || fromEmail;
        }
      } catch (error) {
        console.warn('Could not fetch sender settings, using defaults');
      }
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };
      
      console.log('📧 Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      const result = await transporter.sendMail(mailOptions);
      
      // Handle different transporter types
      if (result.envelope) {
        console.log('✅ Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } else {
        // Fallback transporter (development)
        console.log('📧 Email would be sent (development mode):', result.message?.toString());
        return { success: true, messageId: 'dev-mode-' + Date.now() };
      }
      
    } catch (error: any) {
      console.error('❌ Email sending error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send email';
      
      if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed. Please check your SMTP username and password.';
      } else if (error.code === 'ECONNECTION' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Could not connect to email server. Please check your SMTP host and port settings.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Email sending timed out. Please try again.';
      } else if (error.responseCode === 535) {
        errorMessage = 'Email authentication failed. Please check your credentials.';
      } else if (error.code === 'ESOCKET') {
        errorMessage = 'Socket error. Please check your network connection and SMTP settings.';
      }
      
      throw new Error(errorMessage);
    }
  }
  
  static async sendWelcomeEmail(userEmail: string, userName: string) {
    try {
      await connectDB();
      const settings = await Settings.findOne();
      const appName = settings?.system?.appName || 'ShortLink';
      const appUrl = settings?.system?.appUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0; font-size: 28px;">Welcome to ${appName}!</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p style="margin: 0 0 15px 0; color: #64748b;">
              Welcome to ${appName}! Your account has been created successfully and you can now access all our features.
            </p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; margin-bottom: 15px;">What you can do now:</h3>
            <ul style="color: #64748b; line-height: 1.6;">
              <li>Create and manage shortened URLs</li>
              <li>Track detailed click analytics</li>
              <li>Generate QR codes for your links</li>
              <li>Organize links in custom folders</li>
              <li>Set up custom domains (premium feature)</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${appUrl}/dashboard" 
               style="background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">
              If you have any questions, feel free to contact our support team.
            </p>
            <p style="margin: 10px 0 0 0;">
              Best regards,<br>
              The ${appName} Team
            </p>
          </div>
        </div>
      `;
      
      return this.sendEmail({
        to: userEmail,
        subject: `Welcome to ${appName}!`,
        html
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }
  
  static async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string) {
    try {
      await connectDB();
      const settings = await Settings.findOne();
      const appName = settings?.system?.appName || 'ShortLink';
      const appUrl = settings?.system?.appUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0; font-size: 28px;">Password Reset</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p style="margin: 0 0 15px 0; color: #64748b;">
              We received a request to reset your password for your ${appName} account.
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${resetUrl}" 
               style="background: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              Reset Your Password
            </a>
          </div>
          
          <div style="background: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
              If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin: 10px 0; word-break: break-all; color: #3B82F6;">
              ${resetUrl}
            </p>
            <p style="margin: 10px 0 0 0;">
              Best regards,<br>
              The ${appName} Team
            </p>
          </div>
        </div>
      `;
      
      return this.sendEmail({
        to: userEmail,
        subject: `Reset your ${appName} password`,
        html
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  static async sendTeamInvitation(
    email: string, 
    teamName: string, 
    inviterName: string, 
    invitationToken: string
  ) {
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/team/invite?token=${invitationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Team Invitation</h1>
        <p>${inviterName} has invited you to join the team "${teamName}".</p>
        <p>Click the button below to accept the invitation:</p>
        <a href="${inviteUrl}" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
        <p>This invitation will expire in 7 days.</p>
      </div>
    `;
    
    return this.sendEmail({
      to: email,
      subject: `Invitation to join ${teamName}`,
      html
    });
  }
  
  static async sendUsageLimitWarning(userEmail: string, userName: string, usagePercent: number) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F59E0B;">Usage Limit Warning</h1>
        <p>Hi ${userName},</p>
        <p>You've used ${usagePercent}% of your monthly link limit.</p>
        <p>Consider upgrading to a premium plan for unlimited links and advanced features.</p>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/billing" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Upgrade Plan
        </a>
      </div>
    `;
    
    return this.sendEmail({
      to: userEmail,
      subject: 'Usage Limit Warning',
      html
    });
  }
  static async sendVerificationEmail(userEmail: string, userName: string, token: string) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Verify Your Email Address</h1>
        <p>Hi ${userName},</p>
        <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
        <a href="${verificationUrl}" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email Address
        </a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `;
    
    return this.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email Address',
      html
    });
  }

  static async sendPasswordChangeConfirmation(userEmail: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Password Changed Successfully</h1>
        <p>Hi ${userName},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p>Date: ${new Date().toLocaleString()}</p>
      </div>
    `;
    
    return this.sendEmail({
      to: userEmail,
      subject: 'Password Changed Successfully',
      html
    });
  }
  // Test email configuration
  static async testEmailConfiguration() {
    try {
      const transporter = await this.getTransporter();
      
      // Verify the connection
      const verified = await transporter.verify();
      
      if (verified) {
        console.log('✅ Email configuration is valid');
        return { success: true, message: 'Email configuration is valid' };
      } else {
        throw new Error('Email configuration verification failed');
      }
    } catch (error: any) {
      console.error('❌ Email configuration test failed:', error);
      return { 
        success: false, 
        error: error.message || 'Email configuration test failed' 
      };
    }
  }

  // Clear transporter cache (useful when updating SMTP settings)
  static clearCache() {
    this.transporter = null;
    this.lastConfigUpdate = 0;
    console.log('🔄 Email transporter cache cleared');
  }
}
