// app/api/client/billing/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';
import { StripeService } from '@/lib/stripe';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user to find Stripe customer ID
    const user = await User.findById(session.user.id);
    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No invoices found'
      });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');

    // Fetch invoices from Stripe
    const stripeInvoices = await StripeService.getCustomerInvoices(
      user.stripeCustomerId,
      limit
    );

    // Transform Stripe invoices to our format
    const invoices = stripeInvoices.data.map(invoice => ({
      id: invoice.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status as 'paid' | 'pending' | 'failed' | 'draft',
      description: invoice.description || `Invoice for ${invoice.lines.data[0]?.description}`,
      paidAt: invoice.status_transitions.paid_at ? 
        new Date(invoice.status_transitions.paid_at * 1000) : 
        undefined,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      url: invoice.hosted_invoice_url,
      downloadUrl: invoice.invoice_pdf,
      items: invoice.lines.data.map(line => ({
        description: line.description || '',
        amount: line.amount,
        quantity: line.quantity || 1
      }))
    }));

    // Also get invoices from subscription payment history
    const subscription = await Subscription.findOne({
      userId: session.user.id
    });

    let allInvoices = invoices;
    
    if (subscription?.paymentHistory?.length) {
      const paymentHistoryInvoices = subscription.paymentHistory.map(payment => ({
        id: payment.stripeInvoiceId,
        stripeInvoiceId: payment.stripeInvoiceId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status as 'paid' | 'pending' | 'failed' | 'draft',
        description: `Payment for subscription`,
        paidAt: payment.paidAt,
        dueDate: payment.dueDate,
        url: payment.url,
        items: [{
          description: `Subscription payment`,
          amount: payment.amount,
          quantity: 1
        }]
      }));

      // Merge and deduplicate invoices
      const invoiceMap = new Map();
      [...invoices, ...paymentHistoryInvoices].forEach(invoice => {
        invoiceMap.set(invoice.stripeInvoiceId, invoice);
      });
      
      allInvoices = Array.from(invoiceMap.values());
    }

    // Sort by date (newest first)
    allInvoices.sort((a, b) => 
      new Date(b.dueDate ?? 0).getTime() - new Date(a.dueDate ?? 0).getTime()
    );

    return NextResponse.json({
      success: true,
      data: allInvoices,
      pagination: {
        page,
        limit,
        total: allInvoices.length,
        hasNextPage: allInvoices.length === limit,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('GET invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}