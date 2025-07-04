// ============= hooks/use-analytics.ts =============
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from './use-toast';
import type { URLAnalytics } from '@/types/url';

interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  shortCode?: string;
  country?: string;
  device?: string;
  referrer?: string;
}

interface AnalyticsData {
  totalClicks: number;
  uniqueClicks: number;
  clickRate: number;
  geography: { country: string; count: number }[];
  devices: { type: string; count: number }[];
  browsers: { browser: string; count: number }[];
  referrers: { domain: string; count: number }[];
  dailyStats: { date: string; clicks: number }[];
}

export function useAnalytics(initialShortCode?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    },
    shortCode: initialShortCode
  });
  
  const toast = useToast();

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (customFilters?: Partial<AnalyticsFilters>) => {
    const queryFilters = { ...filters, ...customFilters };
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: queryFilters.dateRange.start.toISOString(),
        endDate: queryFilters.dateRange.end.toISOString(),
        ...(queryFilters.shortCode && { shortCode: queryFilters.shortCode }),
        ...(queryFilters.country && { country: queryFilters.country }),
        ...(queryFilters.device && { device: queryFilters.device }),
        ...(queryFilters.referrer && { referrer: queryFilters.referrer })
      });

      const response = await fetch(`/api/client/analytics?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch analytics');
      }

      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  // Export analytics data
  const exportAnalytics = useCallback(async (format: 'csv' | 'pdf' = 'csv') => {
    const loadingToast = toast.loading('Exporting analytics...');

    try {
      const params = new URLSearchParams({
        startDate: filters.dateRange.start.toISOString(),
        endDate: filters.dateRange.end.toISOString(),
        format,
        ...(filters.shortCode && { shortCode: filters.shortCode })
      });

      const response = await fetch(`/api/client/analytics/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Analytics exported successfully');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Export failed');
    }
  }, [filters, toast]);

  // Real-time analytics (for dashboard)
  const startRealTimeUpdates = useCallback((intervalMs: number = 30000) => {
    return setInterval(() => {
      fetchAnalytics();
    }, intervalMs);
  }, [fetchAnalytics]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Set date range presets
  const setDateRange = useCallback((preset: 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'custom', customRange?: { start: Date; end: Date }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let start: Date, end: Date;

    switch (preset) {
      case 'today':
        start = today;
        end = now;
        break;
      case 'yesterday':
        start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        end = today;
        break;
      case '7days':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '30days':
        start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '90days':
        start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'custom':
        if (!customRange) return;
        start = customRange.start;
        end = customRange.end;
        break;
      default:
        return;
    }

    updateFilters({
      dateRange: { start, end }
    });
  }, [updateFilters]);

  // Calculated metrics
  const metrics = useMemo(() => {
    if (!data) return null;

    const totalDays = Math.max(1, Math.ceil((filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
    const averageClicksPerDay = Math.round(data.totalClicks / totalDays);
    
    // Calculate growth (comparing to previous period)
    const previousPeriodClicks = data.dailyStats.slice(0, Math.floor(data.dailyStats.length / 2))
      .reduce((sum, day) => sum + day.clicks, 0);
    const currentPeriodClicks = data.dailyStats.slice(Math.floor(data.dailyStats.length / 2))
      .reduce((sum, day) => sum + day.clicks, 0);
    
    const growth = previousPeriodClicks > 0 
      ? ((currentPeriodClicks - previousPeriodClicks) / previousPeriodClicks) * 100 
      : 0;

    return {
      totalClicks: data.totalClicks,
      uniqueClicks: data.uniqueClicks,
      clickRate: data.uniqueClicks > 0 ? (data.totalClicks / data.uniqueClicks) : 0,
      averageClicksPerDay,
      growth: Math.round(growth * 100) / 100,
      topCountry: data.geography[0]?.country || 'N/A',
      topDevice: data.devices[0]?.type || 'N/A',
      topReferrer: data.referrers[0]?.domain || 'Direct'
    };
  }, [data, filters]);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (filters) {
      fetchAnalytics();
    }
  }, [filters]);

  return {
    // Data
    data,
    metrics,
    isLoading,
    error,
    filters,
    
    // Actions
    fetchAnalytics,
    exportAnalytics,
    startRealTimeUpdates,
    updateFilters,
    setDateRange,
    
    // Utilities
    refresh: () => fetchAnalytics(),
    clearFilters: () => setFilters({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    })
  };
}