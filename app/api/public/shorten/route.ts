// app/api/public/shorten/route.ts (Super simple version)
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { generateShortCode } from '@/lib/utils';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    
    if (!body.originalUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const { originalUrl } = body;

    console.log('📝 Received URL:', originalUrl);

    // Normalize URL - be smarter about protocol handling
    let normalizedUrl = originalUrl.trim();
    
    console.log('📝 After trim:', normalizedUrl);
    
    // Only add https:// if there's no protocol at all
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
      console.log('📝 Added https://', normalizedUrl);
    } else {
      console.log('📝 Protocol already exists:', normalizedUrl);
    }
    
    // Validate that we have a proper URL
    try {
      const testUrl = new URL(normalizedUrl);
      if (!testUrl.hostname || testUrl.hostname.length < 2) {
        throw new Error('Invalid hostname');
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Please enter a valid URL (e.g., google.com or https://google.com)' 
      }, { status: 400 });
    }

    console.log('Creating URL with:', normalizedUrl);

    // Generate short code
    let shortCode = generateShortCode(8);
    
    // Simple uniqueness check using collection directly
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }
    const collection = mongoose.connection.db.collection('urls');
    let existing = await collection.findOne({ shortCode, isDeleted: false });
    while (existing) {
      shortCode = generateShortCode(8);
      existing = await collection.findOne({ shortCode, isDeleted: false });
    }

    // Create expiration date (30 days)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Get clean base URL for domain field
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '').replace(/^https?:\/\/https?:\/\//, 'http://');

    // Create minimal URL document (no customSlug field at all)
    const urlDocument = {
      originalUrl: normalizedUrl,
      shortCode,
      userId: null,
      teamId: null,
      folderId: null,
      title: null,
      description: null,
      tags: [],
      favicon: null,
      domain: cleanBaseUrl,
      isActive: true,
      isPublic: true,
      isPasswordProtected: false,
      password: null,
      expiresAt: expirationDate,
      clickLimit: null,
      clicks: {
        total: 0,
        unique: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastUpdated: new Date()
      },
      isAnonymous: true,
      createdBy: 'anonymous',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Inserting document with shortCode:', shortCode);

    // Insert directly to bypass mongoose validation
    const result = await collection.insertOne(urlDocument);
    
    console.log('✅ Document inserted with ID:', result.insertedId);

    // Build shortUrl properly without double protocol
    const shortUrl = `${cleanBaseUrl}/${shortCode}`;

    console.log('🔗 Generated shortUrl:', shortUrl);

    return NextResponse.json({
      success: true,
      message: 'URL shortened successfully',
      data: {
        id: result.insertedId,
        originalUrl: normalizedUrl,
        shortUrl,
        shortCode,
        favicon: null,
        qrCode: null,
        expiresAt: expirationDate,
        clicks: { total: 0 },
        createdAt: new Date(),
        isAnonymous: true,
        expiresIn: '30 days'
      }
    });

  } catch (error) {
    console.error('Anonymous URL shortening error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Anonymous URL shortening API',
    status: 'active',
    note: 'This version bypasses customSlug to avoid index conflicts'
  });
}