// ============= hooks/use-billing.ts =============
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import type { 
  Subscription, 
  PricingPlan, 
  Invoice, 
  PaymentMethod,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest
} from '@/types/billing';

export function useBilling() {
  const { user, refreshSession } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/client/billing/subscription');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch subscription');
      }

      setSubscription(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/client/billing/invoices');
      const result = await response.json();

      if (response.ok) {
        setInvoices(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  }, [user]);

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/client/billing/payment-methods');
      const result = await response.json();

      if (response.ok) {
        setPaymentMethods(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    }
  }, [user]);

  // Create subscription
  const createSubscription = useCallback(async (data: CreateSubscriptionRequest) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/client/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create subscription');
      }

      // Handle Stripe checkout
      if (result.data.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
        return { success: true };
      }

      await fetchSubscription();
      await refreshSession();
      toast.success('Subscription created successfully!');
      
      return { success: true, data: result.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscription, refreshSession, toast]);

  // Update subscription
  const updateSubscription = useCallback(async (data: UpdateSubscriptionRequest) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/client/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update subscription');
      }

      await fetchSubscription();
      await refreshSession();
      toast.success('Subscription updated successfully!');
      
      return { success: true, data: result.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subscription';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscription, refreshSession, toast]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (data: CancelSubscriptionRequest) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/client/billing/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel subscription');
      }

      await fetchSubscription();
      await refreshSession();
      toast.success(
        data.cancelImmediately 
          ? 'Subscription canceled successfully.' 
          : 'Subscription will be canceled at the end of the current period.'
      );
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscription, refreshSession, toast]);

  // Create billing portal session
  const openBillingPortal = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/client/billing/portal', {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to open billing portal');
      }

      window.location.href = result.data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open billing portal';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Download invoice
  const downloadInvoice = useCallback(async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/client/billing/invoices/${invoiceId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully');
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  }, [toast]);

  // Get current plan info
  const currentPlan = useCallback((): PricingPlan | null => {
    if (!user) return null;

    const plans: PricingPlan[] = [
      {
        id: 'free',
        name: 'Free',
        description: 'Perfect for personal use',
        price: { monthly: 0, yearly: 0 },
        stripePriceIds: { monthly: '', yearly: '' },
        features: {
          maxLinks: 5,
          maxClicks: 1000,
          customDomains: 0,
          analytics: false,
          qrCodes: false,
          bulkOperations: false,
          apiAccess: false,
          prioritySupport: false,
          whiteLabel: false
        },
        popular: false
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'For professionals and small businesses',
        price: { monthly: 999, yearly: 9999 },
        stripePriceIds: { monthly: 'price_premium_monthly', yearly: 'price_premium_yearly' },
        features: {
          maxLinks: -1,
          maxClicks: -1,
          customDomains: 3,
          analytics: true,
          qrCodes: true,
          bulkOperations: true,
          apiAccess: true,
          prioritySupport: false,
          whiteLabel: false
        },
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price: { monthly: 4999, yearly: 49999 },
        stripePriceIds: { monthly: 'price_enterprise_monthly', yearly: 'price_enterprise_yearly' },
        features: {
          maxLinks: -1,
          maxClicks: -1,
          customDomains: -1,
          analytics: true,
          qrCodes: true,
          bulkOperations: true,
          apiAccess: true,
          prioritySupport: true,
          whiteLabel: true
        },
        popular: false
      }
    ];

    return plans.find(plan => plan.id === user.plan) || plans[0];
  }, [user]);

  // Check if user can upgrade/downgrade
  const canUpgrade = useCallback((): boolean => {
    if (!user) return false;
    return user.plan !== 'enterprise';
  }, [user]);

  const canDowngrade = useCallback((): boolean => {
    if (!user) return false;
    return user.plan !== 'free';
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchInvoices();
      fetchPaymentMethods();
    }
  }, [user, fetchSubscription, fetchInvoices, fetchPaymentMethods]);

return {
  // Data
  subscription,
  invoices,
  paymentMethods,
  currentPlan: currentPlan(),
  isLoading,
  error,
  
  // Actions
  createSubscription,
  updateSubscription,
  cancelSubscription,
  openBillingPortal,
  downloadInvoice,
  
  // Utilities
  canUpgrade: canUpgrade(),
  canDowngrade: canDowngrade(),
  refresh: () => {
    fetchSubscription();
    fetchInvoices();
    fetchPaymentMethods();
  },
  
  // Subscription status helpers - Updated to handle free plan
  isActive: user?.plan === 'free' ? true : subscription?.status === 'active',
  isTrialing: subscription?.status === 'trialing',
  isCanceled: subscription?.status === 'canceled',
  isPastDue: subscription?.status === 'past_due',
  
  // Free plan helper
  isFree: user?.plan === 'free',
  
  // Overall account status
  isAccountActive: user?.plan === 'free' ? true : subscription?.status === 'active'
};
}