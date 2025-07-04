// ============= Updated scripts/migrate.ts =============
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Dynamic imports to avoid module resolution issues
async function loadModels() {
  const { User } = await import('../models/User');
  const { URL } = await import('../models/URL');
  const { Domain } = await import('../models/Domain');
  const { Team } = await import('../models/Team');
  const { Folder } = await import('../models/Folder');
  const { Settings } = await import('../models/Settings');
  const { AuditLog } = await import('../models/AuditLog');
  const { Analytics } = await import('../models/Analytics');
  
  return { User, URL, Domain, Team, Folder, Settings, AuditLog, Analytics };
}

async function createIndexes() {
  console.log('🔧 Creating database indexes...');
  
  try {
    const { User, URL, Domain, Team, Folder, Settings, AuditLog, Analytics } = await loadModels();
    
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ 'subscription.stripeCustomerId': 1 });
    await User.collection.createIndex({ role: 1, plan: 1 });
    await User.collection.createIndex({ isDeleted: 1 });
    console.log('✅ User indexes created');
    
    // URL indexes
    await URL.collection.createIndex({ shortCode: 1 }, { unique: true });
    await URL.collection.createIndex({ userId: 1, isDeleted: 1 });
    await URL.collection.createIndex({ domain: 1, shortCode: 1 });
    await URL.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await URL.collection.createIndex({ 'clicks.lastUpdated': 1 });
    console.log('✅ URL indexes created');
    
    // Domain indexes
    await Domain.collection.createIndex({ domain: 1 }, { unique: true });
    await Domain.collection.createIndex({ userId: 1, isDeleted: 1 });
    await Domain.collection.createIndex({ type: 1, isActive: 1 });
    console.log('✅ Domain indexes created');
    
    // Team indexes
    await Team.collection.createIndex({ 'members.userId': 1 });
    await Team.collection.createIndex({ ownerId: 1 });
    await Team.collection.createIndex({ slug: 1 }, { unique: true });
    console.log('✅ Team indexes created');
    
    // Folder indexes
    await Folder.collection.createIndex({ userId: 1, isDeleted: 1 });
    await Folder.collection.createIndex({ path: 1 });
    console.log('✅ Folder indexes created');
    
    // Analytics indexes
    await Analytics.collection.createIndex({ urlId: 1, timestamp: 1 });
    await Analytics.collection.createIndex({ timestamp: 1 });
    await Analytics.collection.createIndex({ 'location.country': 1 });
    console.log('✅ Analytics indexes created');
    
    // Audit Log indexes
    await AuditLog.collection.createIndex({ userId: 1, timestamp: 1 });
    await AuditLog.collection.createIndex({ action: 1, resource: 1 });
    await AuditLog.collection.createIndex({ timestamp: 1 });
    console.log('✅ Audit Log indexes created');
    
    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function createOrFixAdminUser() {
  console.log('👤 Creating/fixing admin user...');
  
  try {
    const { User } = await loadModels();
    
    // Check if admin user exists
    let adminUser = await User.findOne({ 
      email: 'admin@onlink.local',
      isDeleted: false 
    });

    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (!adminUser) {
      console.log('📝 Creating new admin user...');
      
      // Create admin user with pre-hashed password to avoid middleware issues
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@onlink.local',
        password: hashedPassword, // Pre-hashed
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

      console.log('✅ Admin user created successfully');
      
    } else {
      console.log('✅ Admin user found');
      
      // Check if password exists and is valid
      if (!adminUser.password) {
        console.log('🔧 Admin user has no password, setting password...');
        
        // Update password directly in database to bypass middleware
        await User.updateOne(
          { _id: adminUser._id },
          { 
            $set: { 
              password: hashedPassword,
              'security.loginAttempts': 0,
              'security.lockedUntil': null,
              lastPasswordChange: new Date()
            }
          }
        );
        
        console.log('✅ Admin password set successfully');
        
      } else {
        console.log('✅ Admin user already has password');
        
        // Test if current password works
        const isValidPassword = await bcrypt.compare(adminPassword, adminUser.password);
        if (!isValidPassword) {
          console.log('🔧 Admin password invalid, updating...');
          
          await User.updateOne(
            { _id: adminUser._id },
            { 
              $set: { 
                password: hashedPassword,
                'security.loginAttempts': 0,
                'security.lockedUntil': null,
                lastPasswordChange: new Date()
              }
            }
          );
          
          console.log('✅ Admin password updated successfully');
        }
      }
      
      // Ensure account is not locked
      if (adminUser.security.lockedUntil) {
        await User.updateOne(
          { _id: adminUser._id },
          { 
            $unset: { 'security.lockedUntil': 1 },
            $set: { 'security.loginAttempts': 0 }
          }
        );
        console.log('🔓 Admin account unlocked');
      }
    }

    // Verify the password works
    const updatedUser = await User.findOne({ email: 'admin@onlink.local' });
    if (updatedUser && updatedUser.password) {
      const passwordTest = await bcrypt.compare(adminPassword, updatedUser.password);
      if (passwordTest) {
        console.log('✅ Admin password verification: PASSED');
        console.log('📧 Admin credentials: admin@onlink.local / admin123');
      } else {
        console.log('❌ Admin password verification: FAILED');
      }
    }

    return updatedUser;
    
  } catch (error) {
    console.error('❌ Error creating/fixing admin user:', error);
    throw error;
  }
}

async function seedDefaultData() {
  console.log('🌱 Seeding default data...');
  
  try {
    const { User, Settings, Domain } = await loadModels();
    
    // Create/fix admin user first
    const adminUser = await createOrFixAdminUser();
    
    // Check if settings already exist
    const existingSettings = await Settings.findOne();
    if (existingSettings) {
      console.log('ℹ️  Settings already exist, skipping settings creation...');
    } else {
      // Create default settings
      await Settings.create({
        system: {
          appName: 'OnLink',
          appDescription: 'Professional URL shortening service',
          appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
          supportEmail: 'support@onlink.local',
          smtp: {
            host: '',
            port: 587,
            secure: false,
            username: '',
            password: '',
            fromName: 'OnLink',
            fromEmail: 'noreply@onlink.local'
          },
          security: {
            enforceSSL: false, // Development mode
            maxLoginAttempts: 5,
            lockoutDuration: 15,
            sessionTimeout: 24,
            passwordMinLength: 8,
            requireMFA: false
          },
          analytics: {
            provider: 'internal',
            trackingCode: '',
            enableCustomAnalytics: true,
            retentionDays: 365
          },
          integrations: {
            stripe: { enabled: false },
            google: { enabled: false },
            facebook: { enabled: false }
          }
        },
        defaultLimits: {
          free: {
            linksPerMonth: 5,
            clicksPerMonth: 1000,
            customDomains: 0,
            analytics: false
          },
          premium: {
            linksPerMonth: -1,
            clicksPerMonth: -1,
            customDomains: 3,
            analytics: true
          },
          enterprise: {
            linksPerMonth: -1,
            clicksPerMonth: -1,
            customDomains: -1,
            analytics: true
          }
        },
        features: {
          enableSignup: true,
          enableTeams: true,
          enableCustomDomains: true,
          enableQRCodes: true,
          enableBulkOperations: true,
          enableAPIAccess: true,
          enableWhiteLabel: false,
          maintenanceMode: false
        },
        lastModifiedBy: adminUser._id
      });

      console.log('✅ Default settings created');
    }

    // Check if default domain exists
    const existingDomain = await Domain.findOne({ domain: 'localhost:3000' });
    if (existingDomain) {
      console.log('ℹ️  Default domain already exists, skipping domain creation...');
    } else {
      // Create default system domain
      await Domain.create({
        domain: 'localhost:3000',
        type: 'system',
        isCustom: false,
        isVerified: true,
        isActive: true,
        sslEnabled: false,
        settings: {
          redirectType: 301,
          forceHttps: false, // Development mode
          enableCompression: true,
          cacheControl: 'public, max-age=3600',
          branding: {},
          security: {
            enableCaptcha: false,
            ipWhitelist: [],
            ipBlacklist: [],
            rateLimiting: {
              enabled: true,
              requestsPerMinute: 60
            }
          }
        },
        usage: {
          linksCount: 0,
          clicksCount: 0,
          bandwidthUsed: 0,
          lastUpdated: new Date()
        }
      });

      console.log('✅ Default domain created');
    }
    
    console.log('🎉 Default data seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding default data:', error);
    throw error;
  }
}

async function migrate() {
  try {
    console.log('🚀 Starting database migration...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Create indexes
    await createIndexes();
    
    // Seed default data (includes admin user fix)
    await seedDefaultData();
    
    console.log('🎉 Database migration completed successfully!');
    console.log('📧 Use these credentials to login:');
    console.log('   Email: admin@onlink.local');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('💾 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

export { migrate, createIndexes, seedDefaultData, createOrFixAdminUser };