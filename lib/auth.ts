// ============= lib/auth.ts =============
import { NextAuthOptions, User as NextAuthUser, Session, DefaultSession, DefaultUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { connectDB } from './mongodb';
import type { AuthUser } from '@/types/auth';

// Extend NextAuth types to include custom fields
declare module 'next-auth' {
  interface User extends DefaultUser {
    role?: string;
    plan?: string;
    team?: any;
  }
  interface Session {
    user: {
      id: string;
      role?: string;
      plan?: string;
      team?: any;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    plan?: string;
    team?: any;
  }
}

const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = Promise.resolve(client);

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
     
     async authorize(credentials, req) {
       if (!credentials?.email || !credentials?.password) {
         return null;
       }
     
       try {
         await connectDB();
         
         const user = await User.findOne({ 
           email: credentials.email.toLowerCase(),
           isDeleted: false 
         });
     
         if (!user || !user.password) {
           await logLoginAttempt(credentials.email, req, false, 'Invalid credentials');
           return null;
         }
     
         // Check if account is locked
         if (user.security.lockedUntil && user.security.lockedUntil > new Date()) {
           await logLoginAttempt(credentials.email, req, false, 'Account locked');
           return null;
         }
     
         // Use the comparePassword method
         const isValid = await user.comparePassword(credentials.password);
         
         if (!isValid) {
           // Increment login attempts
           user.security.loginAttempts += 1;
           
           // Lock account after max attempts
           if (user.security.loginAttempts >= 5) {
             user.security.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
           }
           
           await user.save();
           await logLoginAttempt(credentials.email, req, false, 'Invalid password');
           return null;
         }
     
         // Check if account is active
         if (!user.isActive) {
           await logLoginAttempt(credentials.email, req, false, 'Account inactive');
           return null;
         }
     
         // Reset login attempts on successful login
         user.security.loginAttempts = 0;
         user.security.lockedUntil = undefined;
         user.lastLoginAt = new Date();
         user.lastActiveAt = new Date();
         await user.save();
     
         // Log successful login
         await logLoginAttempt(credentials.email, req, true);
     
         return {
           id: user._id.toString(),
           name: user.name,
           email: user.email,
           image: user.image,
           role: user.role,
           plan: user.plan,
           emailVerified: user.emailVerified,
           isActive: user.isActive,
           team: user.team
         };
       } catch (error) {
         console.error('Auth error:', error);
         return null;
       }
     }
    }),
    
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.plan = user.plan;
        token.team = user.team;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
        session.user.team = token.team as any;
      }
      return session;
    },
    
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectDB();
          
          const existingUser = await User.findOne({ 
            email: user.email,
            isDeleted: false 
          });

          if (existingUser) {
            // Update last login
            existingUser.lastLoginAt = new Date();
            existingUser.lastActiveAt = new Date();
            await existingUser.save();
            return true;
          }

          // Create new user for Google sign-in
          const newUser = new User({
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: new Date(),
            isEmailVerified: true,
            plan: 'free',
            role: 'user',
            usage: {
              linksCount: 0,
              clicksCount: 0,
              monthlyLinks: 0,
              monthlyClicks: 0,
              resetDate: new Date(),
              lastUpdated: new Date()
            },
            preferences: {
              timezone: 'UTC',
              language: 'en',
              dateFormat: 'MM/DD/YYYY',
              notifications: {
                email: true,
                marketing: false,
                security: true,
                analytics: true
              },
              privacy: {
                publicProfile: false,
                shareAnalytics: false
              }
            },
            security: {
              twoFactorEnabled: false,
              loginAttempts: 0,
              ipWhitelist: []
            }
          });

          await newUser.save();
          return true;
        } catch (error) {
          console.error('Google sign-in error:', error);
          return false;
        }
      }
      return true;
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
    error: '/auth/error'
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to log login attempts
async function logLoginAttempt(
  email: string, 
  req: any, 
  success: boolean, 
  failureReason?: string
) {
  try {
    const ip = req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    const auditLog = new AuditLog({
      userEmail: email,
      action: success ? 'login_success' : 'login_failed',
      resource: 'auth',
      details: {
        method: 'POST',
        endpoint: '/api/auth/callback/credentials',
        metadata: { failureReason }
      },
      context: {
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent
      },
      result: {
        success,
        statusCode: success ? 200 : 401,
        error: failureReason
      },
      risk: {
        level: success ? 'low' : 'medium',
        factors: success ? [] : ['failed_login'],
        score: success ? 10 : 50
      }
    });

    await auditLog.save();
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}