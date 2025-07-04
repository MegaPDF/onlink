// ============= app/api/admin/settings/route.ts =============
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { User } from "@/models/User";
import { UpdateSettingsSchema } from "@/lib/validations";
import { AuditLog } from "@/models/AuditLog";

// Default settings structure that matches your Settings model
const createDefaultSettings = (lastModifiedBy: string) => ({
  system: {
    appName: "OnLink",
    appDescription: "Professional URL shortening service",
    appUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
    supportEmail: "support@onlink.local",
    smtp: {
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
      fromName: "OnLink",
      fromEmail: "noreply@onlink.local",
    },
    security: {
      enforceSSL: process.env.NODE_ENV === "production",
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      sessionTimeout: 24,
      passwordMinLength: 8,
      requireEmailVerification: false,
      enableTwoFactor: false,
    },
    analytics: {
      provider: "internal",
      trackingCode: "",
      enableCustomAnalytics: true,
      retentionDays: 365,
    },
    integrations: {
      stripe: {
        enabled: false,
        publicKey: "",
        secretKey: "",
        webhookSecret: "",
      },
      google: {
        enabled: false,
        clientId: "",
        clientSecret: "",
      },
      facebook: {
        enabled: false,
        appId: "",
        appSecret: "",
      },
    },
  },
  features: {
    enableSignup: true,
    enableTeams: true,
    enableCustomDomains: true,
    enableQRCodes: true,
    enableBulkOperations: true,
    enableAPIAccess: true,
    enableWhiteLabel: false,
    maintenanceMode: false,
  },
  defaultLimits: {
    free: {
      linksPerMonth: 5,
      clicksPerMonth: 1000,
      customDomains: 0,
      analytics: false,
    },
    premium: {
      linksPerMonth: -1,
      clicksPerMonth: -1,
      customDomains: 3,
      analytics: true,
    },
    enterprise: {
      linksPerMonth: -1,
      clicksPerMonth: -1,
      customDomains: -1,
      analytics: true,
    },
  },
  lastModifiedBy,
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get settings from database
    let settings = await Settings.findOne();

    if (!settings) {
      console.log(
        "No settings found in database, creating default settings..."
      );

      // Create new settings document with all required fields
      const defaultSettingsData = createDefaultSettings(session.user.id);

      settings = new Settings(defaultSettingsData);
      await settings.save();

      console.log("Default settings created and saved to database");
    }

    // Convert to plain object to avoid Mongoose document issues
    const settingsObj = settings.toObject();

    // Remove sensitive data for client
    if (settingsObj.system?.smtp?.password) {
      settingsObj.system.smtp.password = "[HIDDEN]";
    }
    if (settingsObj.system?.integrations?.stripe?.secretKey) {
      settingsObj.system.integrations.stripe.secretKey = "[HIDDEN]";
    }
    if (settingsObj.system?.integrations?.google?.clientSecret) {
      settingsObj.system.integrations.google.clientSecret = "[HIDDEN]";
    }
    if (settingsObj.system?.integrations?.facebook?.appSecret) {
      settingsObj.system.integrations.facebook.appSecret = "[HIDDEN]";
    }

    return NextResponse.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    console.log('Received settings data:', JSON.stringify(body, null, 2));
    
    // Create a more lenient validation approach
    let validatedData;
    try {
      validatedData = UpdateSettingsSchema.parse(body);
    } catch (validationError: any) {
      console.error('Settings validation error:', validationError);
      
      // Provide detailed validation error information
      if (validationError.errors) {
        const errorDetails = validationError.errors.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: err.received
        }));
        
        return NextResponse.json({ 
          error: 'Validation failed',
          details: errorDetails,
          rawBody: process.env.NODE_ENV === 'development' ? body : undefined
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Invalid settings data format',
        details: process.env.NODE_ENV === 'development' ? validationError.message : undefined
      }, { status: 400 });
    }

    // Get current settings
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      const defaultSettingsData = createDefaultSettings(session.user.id);
      settings = new Settings(defaultSettingsData);
    }

    // Track changes for audit log
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    // Function to safely update nested objects
    const safeUpdate = (target: any, source: any, prefix = '') => {
      if (!source || typeof source !== 'object') return;
      
      Object.keys(source).forEach(key => {
        if (key.startsWith('_') || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
          return; // Skip metadata fields
        }
        
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const oldValue = target[key];
        const newValue = source[key];
        
        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          // Handle nested objects
          if (!target[key]) target[key] = {};
          safeUpdate(target[key], newValue, fieldPath);
        } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          // Track changes
          changes.push({
            field: fieldPath,
            oldValue,
            newValue
          });
          
          // Update value
          target[key] = newValue;
        }
      });
    };

    // Update settings using safe update function
    if (validatedData.system) {
      if (!settings.system) settings.system = {};
      safeUpdate(settings.system, validatedData.system, 'system');
    }

    if (validatedData.features) {
      if (!settings.features) settings.features = {};
      safeUpdate(settings.features, validatedData.features, 'features');
    }

    if (validatedData.defaultLimits) {
      if (!settings.defaultLimits) settings.defaultLimits = {};
      safeUpdate(settings.defaultLimits, validatedData.defaultLimits, 'defaultLimits');
    }

    // Update metadata
    settings.lastModifiedBy = session.user.id;
    
    // Save the updated settings
    try {
      await settings.save();
      console.log(`Settings updated successfully with ${changes.length} changes`);
    } catch (saveError) {
      console.error('Error saving settings:', saveError);
      return NextResponse.json({ 
        error: 'Failed to save settings',
        details: process.env.NODE_ENV === 'development' ? saveError : undefined
      }, { status: 500 });
    }

    // Create audit log entry
    try {
      const auditLog = new AuditLog({
        userId: session.user.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: 'update_settings',
        resource: 'settings',
        resourceId: settings._id.toString(),
        details: {
          method: 'PUT',
          changes,
          changesCount: changes.length
        },
        context: {
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || ''
        },
        result: {
          success: true,
          statusCode: 200
        },
        risk: {
          level: 'high',
          factors: ['admin_action', 'system_settings'],
          score: 80
        }
      });

      await auditLog.save();
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error('Failed to create audit log:', auditError);
    }

    // Remove sensitive data before returning
    const responseSettings = settings.toObject();
    if (responseSettings.system?.smtp?.password) {
      responseSettings.system.smtp.password = '[HIDDEN]';
    }
    if (responseSettings.system?.integrations?.stripe?.secretKey) {
      responseSettings.system.integrations.stripe.secretKey = '[HIDDEN]';
    }
    if (responseSettings.system?.integrations?.google?.clientSecret) {
      responseSettings.system.integrations.google.clientSecret = '[HIDDEN]';
    }
    if (responseSettings.system?.integrations?.facebook?.appSecret) {
      responseSettings.system.integrations.facebook.appSecret = '[HIDDEN]';
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: responseSettings,
      changesCount: changes.length,
      changes: process.env.NODE_ENV === 'development' ? changes : undefined
    });

  } catch (error: any) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
