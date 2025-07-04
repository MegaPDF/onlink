
// ============= lib/security.ts =============
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';

export class SecurityService {
  
  // Generate secure random password
  static generateSecurePassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }
  
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  // Generate 2FA secret
  static generate2FASecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }
  
  // Generate backup codes
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  
  // Check password strength
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');
    
    if (password.length >= 12) score += 1;
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Include special characters');
    
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeated characters');
    
    return { score, feedback };
  }
  
  // Rate limiting
  static rateLimiter = new Map<string, { count: number; resetTime: number }>();
  
  static checkRateLimit(
    identifier: string, 
    maxAttempts: number = 5, 
    windowMs: number = 15 * 60 * 1000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const limit = this.rateLimiter.get(identifier);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimiter.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }
    
    if (limit.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: limit.resetTime };
    }
    
    limit.count++;
    return { 
      allowed: true, 
      remaining: maxAttempts - limit.count, 
      resetTime: limit.resetTime 
    };
  }
  
  // IP validation
  static isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
  
  // Detect suspicious activity
  static async detectSuspiciousActivity(
    userId: string, 
    action: string, 
    context: { ip: string; userAgent: string }
  ): Promise<{ suspicious: boolean; risk: number; factors: string[] }> {
    const factors: string[] = [];
    let risk = 0;
    
    // Check for unusual login times
    const now = new Date();
    const hour = now.getHours();
    if (hour < 6 || hour > 22) {
      factors.push('unusual_time');
      risk += 20;
    }
    
    // Check for new IP address
    const recentLogs = await AuditLog.find({
      userId,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).limit(10);
    
    const knownIPs = new Set(recentLogs.map(log => log.context.ip));
    if (!knownIPs.has(context.ip)) {
      factors.push('new_ip');
      risk += 30;
    }
    
    // Check for new user agent
    const knownUAs = new Set(recentLogs.map(log => log.context.userAgent));
    if (!knownUAs.has(context.userAgent)) {
      factors.push('new_device');
      risk += 15;
    }
    
    // Check for rapid actions
    const recentActions = await AuditLog.countDocuments({
      userId,
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    if (recentActions > 10) {
      factors.push('rapid_actions');
      risk += 25;
    }
    
    // Check for admin actions
    if (['delete_user', 'update_settings', 'create_domain'].includes(action)) {
      factors.push('admin_action');
      risk += 40;
    }
    
    const suspicious = risk >= 50;
    
    return { suspicious, risk, factors };
  }
  
  // Log security event
  static async logSecurityEvent(
    userId: string,
    action: string,
    context: { ip: string; userAgent: string },
    result: { success: boolean; error?: string }
  ) {
    try {
      const user = await User.findById(userId);
      const suspiciousActivity = await this.detectSuspiciousActivity(userId, action, context);
      
      const auditLog = new AuditLog({
        userId,
        userEmail: user?.email,
        userName: user?.name,
        action,
        resource: 'security',
        details: {
          method: 'POST',
          metadata: { suspiciousActivity }
        },
        context,
        result: {
          success: result.success,
          error: result.error
        },
        risk: {
          level: suspiciousActivity.risk >= 80 ? 'critical' : 
                 suspiciousActivity.risk >= 60 ? 'high' : 
                 suspiciousActivity.risk >= 40 ? 'medium' : 'low',
          factors: suspiciousActivity.factors,
          score: suspiciousActivity.risk
        }
      });
      
      await auditLog.save();
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
  
  // Sanitize input
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .trim()
      .slice(0, 1000); // Limit length
  }
  
  // Validate CSRF token
  static validateCSRFToken(token: string, session: string): boolean {
    const expectedToken = crypto
      .createHmac('sha256', process.env.NEXTAUTH_SECRET!)
      .update(session)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  }
}
