import { useState, useEffect, useCallback, useMemo } from 'react';
import { ensureDate } from '@/lib/utils';

interface AnalyticsData {
  totalClicks: number;
  uniqueClicks: number;
  dailyStats: Array<{ date: string; clicks: number }>;
  geography: Array<{ country: string; count: number }>;
  devices: Array<{ type: string; count: number }>;
  referrers: Array<{ domain: string; count: number }>;
  browsers?: Array<{ browser: string; count: number }>;
  operatingSystems?: Array<{ os: string; count: number }>;
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
      
      // FIXED: Add URL parameter correctly
      if (shortCode && shortCode !== 'all') {
        params.append('url', shortCode);
      }
      
      // Ensure dates are properly formatted
      const startDate = ensureDate(filters.dateRange.start);
      const endDate = ensureDate(filters.dateRange.end);
      
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

      console.log('🔍 Fetching analytics with params:', params.toString());

      const response = await fetch(`/api/client/analytics?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      console.log('📊 Analytics API response:', result);
      
      let analyticsData;
      
      // FIXED: Handle different response structures
      if (result.success) {
        if (shortCode && shortCode !== 'all') {
          // For specific URL analytics
          analyticsData = result.data;
        } else {
          // For aggregate analytics (all URLs)
          if (result.data.summary) {
            // Transform summary data to match expected structure
            analyticsData = {
              totalClicks: result.data.summary.totalClicks || 0,
              uniqueClicks: 0, // Summary doesn't have unique clicks
              dailyStats: [],
              geography: [],
              devices: [],
              referrers: [],
              browsers: [],
              operatingSystems: []
            };
          } else {
            analyticsData = result.data;
          }
        }
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
      
      // FIXED: Ensure all required arrays exist with default values
      const normalizedData: AnalyticsData = {
        totalClicks: analyticsData?.totalClicks || 0,
        uniqueClicks: analyticsData?.uniqueClicks || 0,
        dailyStats: Array.isArray(analyticsData?.dailyStats) ? analyticsData.dailyStats : [],
        geography: Array.isArray(analyticsData?.geography) ? analyticsData.geography : [],
        devices: Array.isArray(analyticsData?.devices) ? analyticsData.devices : [],
        referrers: Array.isArray(analyticsData?.referrers) ? analyticsData.referrers : [],
        browsers: Array.isArray(analyticsData?.browsers) ? analyticsData.browsers : [],
        operatingSystems: Array.isArray(analyticsData?.operatingSystems) ? analyticsData.operatingSystems : []
      };
      
      console.log('✅ Normalized analytics data:', normalizedData);
      setData(normalizedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Analytics fetch error:', err);
      
      // Set empty data structure on error to prevent undefined access
      setData({
        totalClicks: 0,
        uniqueClicks: 0,
        dailyStats: [],
        geography: [],
        devices: [],
        referrers: [],
        browsers: [],
        operatingSystems: []
      });
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

      if (shortCode && shortCode !== 'all') {
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
      a.download = `analytics-${shortCode || 'all'}-${Date.now()}.${format}`;
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

  // Calculated metrics - FIXED with null checks and safe array access
  const metrics = useMemo(() => {
    if (!data) return null;

    const startTime = ensureDate(filters.dateRange.start).getTime();
    const endTime = ensureDate(filters.dateRange.end).getTime();
    const totalDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
    const averageClicksPerDay = Math.round(data.totalClicks / totalDays);
    
    // Calculate growth (comparing to previous period) - SAFE array access
    let growth = 0;
    if (data.dailyStats && Array.isArray(data.dailyStats) && data.dailyStats.length > 0) {
      const halfLength = Math.floor(data.dailyStats.length / 2);
      const previousPeriodClicks = data.dailyStats.slice(0, halfLength)
        .reduce((sum, day) => sum + (day?.clicks || 0), 0);
      const currentPeriodClicks = data.dailyStats.slice(halfLength)
        .reduce((sum, day) => sum + (day?.clicks || 0), 0);
      
      growth = previousPeriodClicks > 0 
        ? ((currentPeriodClicks - previousPeriodClicks) / previousPeriodClicks) * 100 
        : 0;
    }

    // Safe access to array elements with fallbacks
    const topCountry = (data.geography && Array.isArray(data.geography) && data.geography.length > 0) 
      ? data.geography[0]?.country || 'N/A' 
      : 'N/A';
      
    const topDevice = (data.devices && Array.isArray(data.devices) && data.devices.length > 0) 
      ? data.devices[0]?.type || 'N/A' 
      : 'N/A';
      
    const topReferrer = (data.referrers && Array.isArray(data.referrers) && data.referrers.length > 0) 
      ? data.referrers[0]?.domain || 'Direct' 
      : 'Direct';

    return {
      totalClicks: data.totalClicks || 0,
      uniqueClicks: data.uniqueClicks || 0,
      clickRate: data.uniqueClicks > 0 ? (data.totalClicks / data.uniqueClicks) : 0,
      averageClicksPerDay,
      growth: Math.round(growth * 100) / 100,
      topCountry,
      topDevice,
      topReferrer
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

  // FIXED: Re-fetch when shortCode changes
  useEffect(() => {
    console.log('🔄 Analytics hook: shortCode changed to:', shortCode);
    fetchAnalytics();
  }, [shortCode]); // Re-fetch when shortCode changes

  // Refetch when filters change
  useEffect(() => {
    if (filters) {
      console.log('🔄 Analytics hook: filters changed:', filters);
      fetchAnalytics();
    }
  }, [filters.dateRange.start, filters.dateRange.end]); // Only re-fetch when date range actually changes

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