// ============= app/api/admin/settings/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';
import { User } from '@/models/User';
import { UpdateSettingsSchema } from '@/lib/validations';
import { AuditLog } from '@/models/AuditLog';

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

    // Get or create settings
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings({
        lastModifiedBy: session.user.id
      });
      await settings.save();
    }

    // Remove sensitive data
    const sanitizedSettings = settings.toObject();
    if (sanitizedSettings.system?.smtp?.password) {
      sanitizedSettings.system.smtp.password = '[HIDDEN]';
    }
    if (sanitizedSettings.system?.integrations?.stripe?.secretKey) {
      sanitizedSettings.system.integrations.stripe.secretKey = '[HIDDEN]';
    }

    return NextResponse.json({
      success: true,
      data: sanitizedSettings
    });

  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const validatedData = UpdateSettingsSchema.parse(body);

    // Get current settings for audit log
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings({
        lastModifiedBy: session.user.id
      });
    }

    // Track changes for audit log
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    if (validatedData.system) {
      Object.keys(validatedData.system).forEach(key => {
        if (
          settings.system &&
          validatedData.system &&
          JSON.stringify(settings.system[key]) !== JSON.stringify(validatedData.system[key])
        ) {
          changes.push({
            field: `system.${key}`,
            oldValue: settings.system[key],
            newValue: validatedData.system[key]
          });
        }
      });
    }

    if (validatedData.features && settings.features) {
      Object.keys(validatedData.features).forEach(key => {
        if (settings.features[key] !== validatedData.features?.[key]) {
          changes.push({
            field: `features.${key}`,
            oldValue: settings.features[key],
            newValue: validatedData.features?.[key]
          });
        }
      });
    }

    // Update settings
    if (validatedData.system) {
      Object.assign(settings.system, validatedData.system);
    }
    
    if (validatedData.features) {
      Object.assign(settings.features, validatedData.features);
    }

    // Remove or update this block if defaultLimits is not part of your schema
    // if (validatedData.defaultLimits) {
    //   Object.assign(settings.defaultLimits, validatedData.defaultLimits);
    // }

    settings.lastModifiedBy = session.user.id;
    await settings.save();

    // Create audit log
    const auditLog = new AuditLog({
      userId: session.user.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      action: 'update_settings',
      resource: 'settings',
      resourceId: settings._id.toString(),
      details: {
        method: 'PUT',
        changes
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

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}