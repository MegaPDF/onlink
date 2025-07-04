// ============= app/api/client/bulk-shorten/route.ts (FIXED) =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { Folder } from '@/models/Folder';
import { BulkURLSchema } from '@/lib/validations';
import { generateShortCode, getFaviconUrl } from '@/lib/utils';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { UsageMonitor } from '@/lib/usage-monitor';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();
  
  try {
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(userSession.user.id);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 });
    }

    // Check if user has bulk operations feature
    const canUseBulk = await UsageMonitor.canAccessAnalytics(user._id);
    if (!canUseBulk && user.plan === 'free') {
      return NextResponse.json({ 
        error: 'Bulk operations require a premium plan',
        upgradeRequired: true 
      }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const tags = formData.get('tags') ? 
      JSON.parse(formData.get('tags') as string) : [];

    if (!file) {
      // Handle JSON input
      const body = await req.json();
      const validatedData = BulkURLSchema.parse(body);
      
      return await processBulkUrls(validatedData.urls, user, folderId, tags, session);
    }

    // Handle CSV file upload
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json({ 
        error: 'Please upload a CSV file' 
      }, { status: 400 });
    }

    // Parse CSV
    const urls: string[] = [];
    const fileContent = await file.text();
    const stream = Readable.from(fileContent);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          // Support different column names
          const url = row.url || row.URL || row.link || row.Link || row.originalUrl;
          if (url && typeof url === 'string') {
            urls.push(url.trim());
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (urls.length === 0) {
      return NextResponse.json({ 
        error: 'No valid URLs found in the CSV file' 
      }, { status: 400 });
    }

    if (urls.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 URLs allowed per batch' 
      }, { status: 400 });
    }

    return await processBulkUrls(urls, user, folderId, tags, session);

  } catch (error) {
    console.error('Bulk shorten error:', error);
    
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

async function processBulkUrls(
  urls: string[], 
  user: any, 
  folderId?: string, 
  tags: string[] = [],
  dbSession?: mongoose.ClientSession
) {
  const session = dbSession || await mongoose.startSession();
  const shouldManageSession = !dbSession;
  
  try {
    if (shouldManageSession) {
      session.startTransaction();
    }

    // Check usage limits
    const canCreate = await UsageMonitor.canCreateLink(user._id);
    if (!canCreate.allowed) {
      if (shouldManageSession) await session.abortTransaction();
      return NextResponse.json({ 
        error: canCreate.reason,
        upgradeRequired: true 
      }, { status: 403 });
    }

    // Additional check for bulk quantity
    if (user.plan === 'free' && user.usage.monthlyLinks + urls.length > 5) {
      if (shouldManageSession) await session.abortTransaction();
      return NextResponse.json({ 
        error: `Bulk operation would exceed free plan limit. You can create ${5 - user.usage.monthlyLinks} more links this month.`,
        upgradeRequired: true 
      }, { status: 403 });
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        userId: user._id,
        isDeleted: false
      }).session(session);

      if (!folder) {
        if (shouldManageSession) await session.abortTransaction();
        return NextResponse.json({ 
          error: 'Folder not found or access denied' 
        }, { status: 404 });
      }
    }

    const results: Array<{
      originalUrl: string;
      error?: string;
      shortUrl?: string;
      shortCode?: string;
      id?: string;
      createdAt?: Date;
    }> = [];
    let successCount = 0;

    // Process URLs in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      for (const originalUrl of batch) {
        try {
          // Validate URL
          if (!originalUrl || typeof originalUrl !== 'string') {
            results.push({
              originalUrl: originalUrl || 'Invalid URL',
              error: 'Invalid URL format'
            });
            continue;
          }

          // Check URL format
          try {
            new URL(originalUrl);
          } catch {
            results.push({
              originalUrl,
              error: 'Invalid URL format'
            });
            continue;
          }

          // Generate unique short code
          let shortCode = generateShortCode(8);
          while (await URL.findOne({ shortCode, isDeleted: false }).session(session)) {
            shortCode = generateShortCode(8);
          }

          // Get favicon
          const favicon = getFaviconUrl(originalUrl);

          // Create URL record
          const newUrl = new URL({
            originalUrl,
            shortCode,
            userId: user._id,
            teamId: user.team?.teamId,
            folderId: folderId || null,
            tags: tags || [],
            favicon,
            domain: process.env.NEXT_PUBLIC_BASE_URL,
            isActive: true,
            isPublic: true,
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

          await newUrl.save({ session });
          successCount++;

          const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${shortCode}`;

          results.push({
            originalUrl,
            shortUrl,
            shortCode,
            id: newUrl._id,
            createdAt: newUrl.createdAt
          });

        } catch (error) {
          console.error(`Error processing URL ${originalUrl}:`, error);
          results.push({
            originalUrl,
            error: 'Failed to shorten URL'
          });
        }
      }
    }

    // CRITICAL FIX: Update user usage with proper error handling
    if (successCount > 0) {
      try {
        const userUpdateResult = await User.findByIdAndUpdate(
          user._id,
          {
            $inc: { 
              'usage.linksCount': successCount,
              'usage.monthlyLinks': successCount
            },
            'usage.lastUpdated': new Date()
          },
          { 
            new: true, 
            session,
            runValidators: true 
          }
        );

        if (!userUpdateResult) {
          throw new Error('Failed to update user usage statistics');
        }

        console.log('✅ User usage updated successfully (bulk):', {
          userId: user._id,
          linksAdded: successCount,
          newLinksCount: userUpdateResult.usage.linksCount,
          newMonthlyLinks: userUpdateResult.usage.monthlyLinks
        });

      } catch (usageError) {
        console.error('❌ Critical error updating user usage (bulk):', usageError);
        if (shouldManageSession) await session.abortTransaction();
        return NextResponse.json({ 
          error: 'Failed to update usage statistics',
          details: usageError 
        }, { status: 500 });
      }

      // Update folder stats
      if (folderId) {
        try {
          const folderUpdateResult = await Folder.findByIdAndUpdate(
            folderId,
            {
              $inc: { 'stats.urlCount': successCount },
              'stats.lastUpdated': new Date()
            },
            { 
              new: true, 
              session,
              runValidators: true 
            }
          );

          if (!folderUpdateResult) {
            throw new Error('Failed to update folder statistics');
          }

          console.log('✅ Folder stats updated successfully (bulk):', {
            folderId,
            urlsAdded: successCount,
            newUrlCount: folderUpdateResult.stats.urlCount
          });

        } catch (folderError) {
          console.error('❌ Error updating folder stats (bulk):', folderError);
          if (shouldManageSession) await session.abortTransaction();
          return NextResponse.json({ 
            error: 'Failed to update folder statistics',
            details: folderError 
          }, { status: 500 });
        }
      }
    }

    if (shouldManageSession) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      success: true,
      message: `Bulk operation completed. ${successCount} URLs shortened successfully.`,
      data: {
        total: urls.length,
        successful: successCount,
        failed: urls.length - successCount,
        results
      }
    });

  } catch (error) {
    if (shouldManageSession && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (shouldManageSession) {
      await session.endSession();
    }
  }
}