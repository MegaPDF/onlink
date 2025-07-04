// scripts/test-login.ts - Test the admin user login
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

async function testAdminLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Dynamic import to avoid module issues
    const { User } = await import('../models/User');

    // Find the admin user
    const adminUser = await User.findOne({ 
      email: 'admin@onlink.local',
      isDeleted: false 
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      
      // Create admin user with proper password hashing
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await User.create({
        name: 'System Admin',
        email: 'admin@onlink.local',
        password: hashedPassword,
        role: 'admin',
        plan: 'enterprise',
        isEmailVerified: true,
        isActive: true,
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

      console.log('✅ Admin user created:', newAdmin.email);
      return;
    }

    console.log('👤 Admin user found:', adminUser.email);
    console.log('🔧 Role:', adminUser.role);
    console.log('📦 Plan:', adminUser.plan);
    console.log('✅ Active:', adminUser.isActive);
    console.log('📧 Email verified:', adminUser.isEmailVerified);
    console.log('🔐 Has password:', !!adminUser.password);

    // Test password comparison
    if (adminUser.password) {
      const testPassword = 'admin123';
      const isValidDirect = await bcrypt.compare(testPassword, adminUser.password);
      console.log('🔑 Direct bcrypt compare:', isValidDirect);

      // Test the model method if it exists
      if (typeof adminUser.comparePassword === 'function') {
        const isValidMethod = await adminUser.comparePassword(testPassword);
        console.log('🔑 Model method compare:', isValidMethod);
      } else {
        console.log('⚠️  comparePassword method not available');
      }
    }

    // Check for any account locks
    if (adminUser.security.lockedUntil) {
      const now = new Date();
      const isLocked = adminUser.security.lockedUntil > now;
      console.log('🔒 Account locked:', isLocked);
      if (isLocked) {
        console.log('⏰ Locked until:', adminUser.security.lockedUntil);
        
        // Unlock the account
        adminUser.security.lockedUntil = undefined;
        adminUser.security.loginAttempts = 0;
        await adminUser.save();
        console.log('🔓 Account unlocked');
      }
    }

    console.log('🔢 Login attempts:', adminUser.security.loginAttempts);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('💾 Database connection closed');
  }
}

testAdminLogin();
