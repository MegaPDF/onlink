// ============= app/api/client/shorten/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';
import { CreateURLSchema } from '@/lib/validations';
import { generateShortCode, getFaviconUrl } from '@/lib/utils';
import { QRCodeGenerator } from '@/lib/qr-generator';
import { UsageMonitor } from '@/lib/usage-monitor';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    if (body.customSlug === null || body.customSlug === "" || body.customSlug === undefined) {
      delete body.customSlug;
    }
    if (body.folderId === null || body.folderId === "" || body.folderId === undefined) {
      delete body.folderId;
    }
    
    const validatedData = CreateURLSchema.parse(body);

    // Get user and check permissions
    const user = await User.findById(session.user.id);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 });
    }

    // Check usage limits
    const canCreate = await UsageMonitor.canCreateLink(user._id);
    if (!canCreate.allowed) {
      return NextResponse.json({ 
        error: canCreate.reason,
        upgradeRequired: true 
      }, { status: 403 });
    }

    // Check if custom slug is available
    if (validatedData.customSlug) {
      const existingUrl = await URL.findOne({
        customSlug: validatedData.customSlug,
        isDeleted: false
      });

      if (existingUrl) {
        return NextResponse.json({ 
          error: 'Custom slug is already taken' 
        }, { status: 400 });
      }
    }

    // Validate folder ownership
    if (validatedData.folderId) {
      const folder = await Folder.findOne({
        _id: validatedData.folderId,
        userId: user._id,
        isDeleted: false
      });

      if (!folder) {
        return NextResponse.json({ 
          error: 'Folder not found or access denied' 
        }, { status: 404 });
      }
    }

    // Generate short code
    let shortCode = validatedData.customSlug || generateShortCode(8);
    
    // Ensure short code is unique
    while (await URL.findOne({ shortCode, isDeleted: false })) {
      shortCode = generateShortCode(8);
    }

    // Get favicon
    const favicon = getFaviconUrl(validatedData.originalUrl);

    // Create URL record
    const newUrl = new URL({
      originalUrl: validatedData.originalUrl,
      shortCode,
      customSlug: validatedData.customSlug,
      userId: user._id,
      teamId: user.team?.teamId,
      folderId: validatedData.folderId,
      title: validatedData.title,
      description: validatedData.description,
      tags: validatedData.tags || [],
      favicon,
      domain: process.env.NEXT_PUBLIC_BASE_URL,
      isActive: true,
      isPublic: !validatedData.isPasswordProtected,
      isPasswordProtected: validatedData.isPasswordProtected || false,
      password: validatedData.password,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      clickLimit: validatedData.clickLimit,
      geoRestrictions: validatedData.geoRestrictions,
      deviceRestrictions: validatedData.deviceRestrictions,
      utmParameters: validatedData.utmParameters,
      clicks: {
        total: 0,
        unique: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastUpdated: new Date()
      },
      analyticsCache: {
        topCountries: [],
        topReferrers: [],
        topDevices: [],
        lastSyncAt: new Date()
      }
    });

    await newUrl.save();

    // Generate QR code
    let qrCodeData = null;
    try {
      const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${shortCode}`;
      const qrCodeDataURL = await QRCodeGenerator.generateQRCode(shortUrl);
      
      newUrl.qrCode = {
        url: qrCodeDataURL,
        style: {
          size: 200,
          color: '#000000',
          backgroundColor: '#FFFFFF'
        }
      };
      
      await newUrl.save();
      qrCodeData = newUrl.qrCode;
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
    }

    // Update user usage
    await User.findByIdAndUpdate(user._id, {
      $inc: { 
        'usage.linksCount': 1,
        'usage.monthlyLinks': 1
      },
      'usage.lastUpdated': new Date()
    });

    // Update folder stats if in folder
    if (validatedData.folderId) {
      await Folder.findByIdAndUpdate(validatedData.folderId, {
        $inc: { 'stats.urlCount': 1 },
        'stats.lastUpdated': new Date()
      });
    }

    // Prepare response
    const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${shortCode}`;

    return NextResponse.json({
      success: true,
      message: 'URL shortened successfully',
      data: {
        id: newUrl._id,
        originalUrl: newUrl.originalUrl,
        shortUrl,
        shortCode,
        customSlug: newUrl.customSlug,
        title: newUrl.title,
        description: newUrl.description,
        tags: newUrl.tags,
        favicon: newUrl.favicon,
        qrCode: qrCodeData,
        expiresAt: newUrl.expiresAt,
        clickLimit: newUrl.clickLimit,
        clicks: newUrl.clicks,
        createdAt: newUrl.createdAt
      }
    });

  } catch (error) {
    console.error('URL shortening error:', error);
    
    if (error === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
