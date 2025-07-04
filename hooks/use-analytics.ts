import { useState, useEffect, useCallback, useMemo } from 'react';
import { ensureDate } from '@/lib/utils';

interface AnalyticsData {
  totalClicks: number;
  uniqueClicks: number;
  dailyStats: Array<{ date: string; clicks: number }>;
  geography: Array<{ country: string; count: number }>;
  devices: Array<{ type: string; count: number }>;
  referrers: Array<{ domain: string; count: number }>;
}

interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface UseAnalyticsOptions {
  shortCode?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAnalytics({ 
  shortCode, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: UseAnalyticsOptions = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }
  });

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (shortCode) {
        params.append('shortCode', shortCode);
      }
      
      // Ensure dates are properly formatted
      const startDate = ensureDate(filters.dateRange.start);
      const endDate = ensureDate(filters.dateRange.end);
      
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

      const response = await fetch(`/api/client/analytics?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result.data.analytics || result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [shortCode, filters]);

  const exportAnalytics = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const startDate = ensureDate(filters.dateRange.start);
      const endDate = ensureDate(filters.dateRange.end);
      
      const params = new URLSearchParams({
        type: 'analytics',
        format,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (shortCode) {
        params.append('shortCode', shortCode);
      }

      const response = await fetch(`/api/client/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }, [filters, shortCode]);

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      dateRange: {
        ...prev.dateRange,
        ...newFilters.dateRange
      }
    }));
  }, []);

  const setDateRange = useCallback((preset: string, customRange?: { start: Date; end: Date }) => {
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
        start = ensureDate(customRange.start);
        end = ensureDate(customRange.end);
        break;
      default:
        return;
    }

    updateFilters({
      dateRange: { start, end }
    });
  }, [updateFilters]);

  // Calculated metrics - FIXED date handling
  const metrics = useMemo(() => {
    if (!data) return null;

    const startTime = ensureDate(filters.dateRange.start).getTime();
    const endTime = ensureDate(filters.dateRange.end).getTime();
    const totalDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
    const averageClicksPerDay = Math.round(data.totalClicks / totalDays);
    
    // Calculate growth (comparing to previous period)
    const halfLength = Math.floor(data.dailyStats.length / 2);
    const previousPeriodClicks = data.dailyStats.slice(0, halfLength)
      .reduce((sum, day) => sum + day.clicks, 0);
    const currentPeriodClicks = data.dailyStats.slice(halfLength)
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

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(fetchAnalytics, refreshInterval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, fetchAnalytics]);

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
