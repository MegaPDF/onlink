// scripts/migrate.ts
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
    await Team.collection.createIndex({ slug: 1 }, { unique: true });
    await Team.collection.createIndex({ ownerId: 1 });
    await Team.collection.createIndex({ isDeleted: 1 });
    console.log('✅ Team indexes created');
    
    // Folder indexes
    await Folder.collection.createIndex({ userId: 1, isDeleted: 1 });
    await Folder.collection.createIndex({ teamId: 1, isDeleted: 1 });
    await Folder.collection.createIndex({ parentId: 1, isDeleted: 1 });
    await Folder.collection.createIndex({ path: 1 });
    console.log('✅ Folder indexes created');
    
    // Settings indexes
    await Settings.collection.createIndex({ lastModifiedBy: 1 });
    console.log('✅ Settings indexes created');
    
    // AuditLog indexes
    await AuditLog.collection.createIndex({ userId: 1, createdAt: -1 });
    await AuditLog.collection.createIndex({ action: 1, createdAt: -1 });
    await AuditLog.collection.createIndex({ resource: 1, createdAt: -1 });
    await AuditLog.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL
    console.log('✅ AuditLog indexes created');
    
    // Analytics indexes
    await Analytics.collection.createIndex({ urlId: 1, date: -1 });
    await Analytics.collection.createIndex({ userId: 1, date: -1 });
    await Analytics.collection.createIndex({ 'geo.country': 1, date: -1 });
    await Analytics.collection.createIndex({ date: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL
    console.log('✅ Analytics indexes created');
    
    console.log('🎉 All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

async function seedDefaultData() {
  console.log('🌱 Seeding default data...');
  
  try {
    const { User, Settings, Domain } = await loadModels();
    
    // Check if admin user exists
    const existingAdmin = await User.findOne({ email: 'admin@onlink.local' });
    let adminUser;
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists, skipping user creation...');
      adminUser = existingAdmin;
    } else {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      adminUser = await User.create({
        name: 'System Administrator',
        email: 'admin@onlink.local',
        password: hashedPassword,
        role: 'admin',
        plan: 'enterprise',
        isEmailVerified: true,
        isActive: true,
        subscription: {
          status: 'active'
        },
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
        }
      });

      console.log('✅ Default admin user created');
      console.log('📧 Email: admin@onlink.local');
      console.log('🔑 Password: admin123');
    }

    // Check if settings exist
    const existingSettings = await Settings.findOne();
    if (existingSettings) {
      console.log('ℹ️  Settings already exist, updating with pricing data...');
      
      // Update existing settings with pricing data if not present
      if (!existingSettings.pricing) {
        existingSettings.pricing = {
          free: {
            name: 'Free',
            description: 'Perfect for personal use',
            price: { monthly: 0, yearly: 0 },
            stripePriceIds: { monthly: '', yearly: '' },
            popular: false
          },
          premium: {
            name: 'Premium',
            description: 'For professionals and small businesses',
            price: { monthly: 999, yearly: 9999 },
            stripePriceIds: { 
              monthly: 'price_premium_monthly', 
              yearly: 'price_premium_yearly' 
            },
            popular: true,
            badge: 'Most Popular'
          },
          enterprise: {
            name: 'Enterprise',
            description: 'For large organizations',
            price: { monthly: 4999, yearly: 49999 },
            stripePriceIds: { 
              monthly: 'price_enterprise_monthly', 
              yearly: 'price_enterprise_yearly' 
            },
            popular: false
          }
        };
        
        await existingSettings.save();
        console.log('✅ Settings updated with pricing data');
      } else {
        console.log('ℹ️  Pricing data already exists in settings');
      }
    } else {
      // Create default settings with pricing data
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
            enforceSSL: process.env.NODE_ENV === 'production',
            maxLoginAttempts: 5,
            lockoutDuration: 15,
            sessionTimeout: 24,
            passwordMinLength: 8,
            requireEmailVerification: false,
            enableTwoFactor: false
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
        pricing: {
          free: {
            name: 'Free',
            description: 'Perfect for personal use',
            price: { monthly: 0, yearly: 0 },
            stripePriceIds: { monthly: '', yearly: '' },
            popular: false
          },
          premium: {
            name: 'Premium',
            description: 'For professionals and small businesses',
            price: { monthly: 999, yearly: 9999 }, // $9.99/month, $99.99/year
            stripePriceIds: { 
              monthly: 'price_premium_monthly', 
              yearly: 'price_premium_yearly' 
            },
            popular: true,
            badge: 'Most Popular'
          },
          enterprise: {
            name: 'Enterprise',
            description: 'For large organizations',
            price: { monthly: 4999, yearly: 49999 }, // $49.99/month, $499.99/year
            stripePriceIds: { 
              monthly: 'price_enterprise_monthly', 
              yearly: 'price_enterprise_yearly' 
            },
            popular: false
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

      console.log('✅ Default settings created with pricing data');
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

async function updateExistingData() {
  console.log('🔄 Updating existing data...');
  
  try {
    const { User, Settings } = await loadModels();
    
    // Update users without proper subscription status
    const usersWithoutSubscriptionStatus = await User.find({
      'subscription.status': { $exists: false }
    });
    
    if (usersWithoutSubscriptionStatus.length > 0) {
      console.log(`🔄 Updating ${usersWithoutSubscriptionStatus.length} users with subscription status...`);
      
      for (const user of usersWithoutSubscriptionStatus) {
        user.subscription = {
          ...user.subscription,
          status: 'active' // Free plan users are active by default
        };
        await user.save();
      }
      
      console.log('✅ User subscription status updated');
    }
    
    // Update settings with pricing data if missing
    const settings = await Settings.findOne();
    if (settings && !settings.pricing) {
      console.log('🔄 Adding pricing data to existing settings...');
      
      settings.pricing = {
        free: {
          name: 'Free',
          description: 'Perfect for personal use',
          price: { monthly: 0, yearly: 0 },
          stripePriceIds: { monthly: '', yearly: '' },
          popular: false
        },
        premium: {
          name: 'Premium',
          description: 'For professionals and small businesses',
          price: { monthly: 999, yearly: 9999 },
          stripePriceIds: { 
            monthly: 'price_premium_monthly', 
            yearly: 'price_premium_yearly' 
          },
          popular: true,
          badge: 'Most Popular'
        },
        enterprise: {
          name: 'Enterprise',
          description: 'For large organizations',
          price: { monthly: 4999, yearly: 49999 },
          stripePriceIds: { 
            monthly: 'price_enterprise_monthly', 
            yearly: 'price_enterprise_yearly' 
          },
          popular: false
        }
      };
      
      await settings.save();
      console.log('✅ Pricing data added to settings');
    }
    
    console.log('🎉 Data update completed!');
    
  } catch (error) {
    console.error('❌ Error updating existing data:', error);
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
    
    // Seed default data (includes admin user and settings with pricing)
    await seedDefaultData();
    
    // Update existing data
    await updateExistingData();
    
    console.log('🎉 Database migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  ✅ Database indexes created');
    console.log('  ✅ Default admin user created/verified');
    console.log('  ✅ Settings with pricing data initialized');
    console.log('  ✅ Default domain configured');
    console.log('  ✅ Existing data updated');
    console.log('');
    console.log('🔐 Admin Login:');
    console.log('  📧 Email: admin@onlink.local');
    console.log('  🔑 Password: admin123');
    console.log('');
    console.log('💰 Pricing Configuration:');
    console.log('  🆓 Free: $0/month - 5 links, 1K clicks');
    console.log('  ⭐ Premium: $9.99/month - Unlimited links & clicks');
    console.log('  🚀 Enterprise: $49.99/month - All features');
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('  1. Update Stripe price IDs in admin settings');
    console.log('  2. Configure SMTP settings for emails');
    console.log('  3. Set up custom domain if needed');
    console.log('  4. Review and adjust pricing/limits as needed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrate;