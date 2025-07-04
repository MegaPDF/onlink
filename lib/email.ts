// ============= lib/email.ts =============
import nodemailer from 'nodemailer';
import { Settings } from '@/models/Settings';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  
  static async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }
    
    // Get SMTP settings from database
    const settings = await Settings.findOne();
    const smtpConfig = settings?.system.smtp;
    
    if (!smtpConfig?.host) {
      throw new Error('SMTP configuration not found');
    }
    
    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.username ? {
        user: smtpConfig.username,
        pass: smtpConfig.password
      } : undefined
    });
    
    return this.transporter;
  }
  
  static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    try {
      const transporter = await this.getTransporter();
      const settings = await Settings.findOne();
      const smtpConfig = settings?.system.smtp;
      
      const mailOptions = {
        from: `${smtpConfig?.fromName || 'URL Shortener'} <${smtpConfig?.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };
      
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }
  
  static async sendWelcomeEmail(userEmail: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Welcome to URL Shortener!</h1>
        <p>Hi ${userName},</p>
        <p>Welcome to our URL shortening service! You can now:</p>
        <ul>
          <li>Shorten unlimited URLs</li>
          <li>Track click analytics</li>
          <li>Generate QR codes</li>
          <li>Organize links in folders</li>
        </ul>
        <p>Get started by creating your first shortened link!</p>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
    `;
    
    return this.sendEmail({
      to: userEmail,
      subject: 'Welcome to URL Shortener!',
      html
    });
  }
  
  static async sendPasswordResetEmail(userEmail: string, resetToken: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Password Reset Request</h1>
        <p>You requested a password reset for your account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;
    
    return this.sendEmail({
      to: userEmail,
      subject: 'Password Reset Request',
      html
    });
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
}
