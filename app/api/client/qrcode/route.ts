// ============= app/api/client/qrcode/route.ts =============
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { URL } from '@/models/URL';
import { QRCodeGenerator } from '@/lib/qr-generator';
import { QRCodeSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const shortCode = req.nextUrl.searchParams.get('shortCode');

    if (!shortCode) {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    const url = await URL.findOne({
      shortCode,
      userId: session.user.id,
      isDeleted: false
    });

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        qrCode: url.qrCode,
        shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${shortCode}`
      }
    });

  } catch (error) {
    console.error('QR code GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate/update QR code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const validatedData = QRCodeSchema.parse(body);

    const url = await URL.findOne({
      shortCode: validatedData.shortCode,
      userId: session.user.id,
      isDeleted: false
    });

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${validatedData.shortCode}`;

    // Generate QR code with custom options
    const qrCodeDataURL = await QRCodeGenerator.generateQRCode(shortUrl, {
      size: validatedData.size,
      color: validatedData.color,
      backgroundColor: validatedData.backgroundColor,
      format: validatedData.format
    });

    // Update URL with new QR code
    url.qrCode = {
      url: qrCodeDataURL,
      style: {
        size: validatedData.size,
        color: validatedData.color,
        backgroundColor: validatedData.backgroundColor,
        logo: validatedData.logo
      }
    };

    await url.save();

    return NextResponse.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        qrCode: url.qrCode,
        downloadUrl: QRCodeGenerator.getQRCodeDownloadUrl(
          validatedData.shortCode, 
          validatedData.format
        )
      }
    });

  } catch (error) {
    console.error('QR code generation error:', error);
    
    if (error === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Download QR code
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shortCode = req.nextUrl.searchParams.get('shortCode');
    const format = req.nextUrl.searchParams.get('format') || 'png';

    if (!shortCode) {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    await connectDB();

    const url = await URL.findOne({
      shortCode,
      userId: session.user.id,
      isDeleted: false
    });

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${shortCode}`;

    let qrCodeData;
    if (format === 'svg') {
      qrCodeData = await QRCodeGenerator.generateQRCodeSVG(shortUrl, url.qrCode?.style);
      return new NextResponse(qrCodeData, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="qrcode-${shortCode}.svg"`
        }
      });
    } else {
      const buffer = await QRCodeGenerator.generateQRCodeBuffer(shortUrl, url.qrCode?.style);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="qrcode-${shortCode}.png"`
        }
      });
    }

  } catch (error) {
    console.error('QR code download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}