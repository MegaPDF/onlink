// ============= scripts/debug-auth.ts =============
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function debugAuth() {
  console.log('🔍 Starting authentication debug...\n');

  // 1. Check environment variables
  console.log('📝 Environment Variables:');
  console.log('- NEXTAUTH_SECRET:', !!process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
  console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Missing');
  console.log('- MONGODB_URI:', !!process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log();

  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI is required. Please set it in .env.local');
    return;
  }

  try {
    // 2. Test database connection
    console.log('🔌 Testing database connection...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully\n');

    // 3. Load models
    const { User } = await import('../models/User');

    // 4. Check if admin user exists
    console.log('👤 Checking admin user...');
    let adminUser = await User.findOne({ 
      email: 'admin@onlink.local',
      isDeleted: false 
    });

    if (!adminUser) {
      console.log('📝 Creating admin user...');
      
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@onlink.local',
        password: 'admin123', // This will be hashed by the pre-save middleware
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
      
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user exists');
    }

    // 5. Test password comparison
    console.log('\n🔐 Testing password comparison:');
    console.log('- Email:', adminUser.email);
    console.log('- Active:', adminUser.isActive);
    console.log('- Email verified:', adminUser.isEmailVerified);
    console.log('- Role:', adminUser.role);
    console.log('- Has password:', !!adminUser.password);
    console.log('- Login attempts:', adminUser.security.loginAttempts);
    console.log('- Locked until:', adminUser.security.lockedUntil || 'Not locked');

    if (adminUser.password) {
      const testPassword = 'admin123';
      
      // Test direct bcrypt comparison
      const directCompare = await bcrypt.compare(testPassword, adminUser.password);
      console.log('- Direct bcrypt compare:', directCompare ? '✅ Valid' : '❌ Invalid');
      
      // Test model method comparison
      if (typeof adminUser.comparePassword === 'function') {
        const methodCompare = await adminUser.comparePassword(testPassword);
        console.log('- Model method compare:', methodCompare ? '✅ Valid' : '❌ Invalid');
      } else {
        console.log('- Model method compare: ❌ Method not found');
      }
    }

    // 6. Reset any account locks
    if (adminUser.security.lockedUntil) {
      adminUser.security.lockedUntil = undefined;
      adminUser.security.loginAttempts = 0;
      await adminUser.save();
      console.log('🔓 Account unlocked');
    }

    console.log('\n✅ Debug completed successfully!');
    console.log('\nTest login with:');
    console.log('- Email: admin@onlink.local');
    console.log('- Password: admin123');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n💾 Database connection closed');
  }
}

// Run the debug script
debugAuth().catch(console.error);