import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';

export async function GET() {
  try {
    await connectDB();
    
    // Get settings from database (excluding sensitive fields)
    let settings = await Settings.findOne({}).select('-system.smtp.password -system.integrations.stripe.secretKey -system.integrations.stripe.webhookSecret -system.integrations.google.clientSecret -system.integrations.facebook.appSecret');
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new Settings({
        lastModifiedBy: 'system'
      });
      await settings.save();
    }

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}