// app/api/client/billing/invoices/[invoiceId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';
import Stripe from 'stripe';
import { connectDB } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = params;

    if (!invoiceId) {
      return NextResponse.json({ 
        error: 'Invoice ID is required' 
      }, { status: 400 });
    }

    // Get user to verify ownership
    const user = await User.findById(session.user.id);
    if (!user?.subscription?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No billing account found' 
      }, { status: 404 });
    }

    try {
      // Fetch invoice from Stripe
      const invoice = await stripe.invoices.retrieve(invoiceId);

      // Verify the invoice belongs to this customer
      if (invoice.customer !== user.subscription.stripeCustomerId) {
        return NextResponse.json({ 
          error: 'Invoice not found or access denied' 
        }, { status: 404 });
      }

      // Check if invoice has a PDF
      if (!invoice.invoice_pdf) {
        return NextResponse.json({ 
          error: 'Invoice PDF not available' 
        }, { status: 404 });
      }

      // Fetch the PDF from Stripe's URL
      const pdfResponse = await fetch(invoice.invoice_pdf);
      
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch invoice PDF');
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();

      // Return the PDF with appropriate headers
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
          'Content-Length': pdfBuffer.byteLength.toString()
        }
      });

    } catch (stripeError) {
      console.error('Stripe error fetching invoice:', stripeError);
      
      if (stripeError instanceof Error && stripeError.message.includes('No such invoice')) {
        return NextResponse.json({ 
          error: 'Invoice not found' 
        }, { status: 404 });
      }
      
      throw stripeError;
    }

  } catch (error) {
    console.error('GET invoice download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}