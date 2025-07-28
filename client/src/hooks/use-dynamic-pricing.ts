import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DynamicPricingHookOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onPriceChange?: (serviceId: number, oldPrice: number, newPrice: number) => void;
}

export function useDynamicPricing(phase?: string, options: DynamicPricingHookOptions = {}) {
  const { 
    enabled = true, 
    interval = 30000, // 30 seconds
    onPriceChange 
  } = options;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previousPrices, setPreviousPrices] = useState<{[key: number]: number}>({});

  // Fetch services with dynamic pricing
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['services', phase],
    queryFn: async () => {
      const url = phase ? `/api/services?phase=${phase}` : '/api/services';
      const response = await apiRequest('GET', url);
      return response.json();
    },
    enabled,
    refetchInterval: interval,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Track price changes and notify user
  useEffect(() => {
    if (services.length > 0) {
      services.forEach((service: any) => {
        if (service.dynamicPricing) {
          const serviceId = service.id;
          const currentPrice = service.dynamicPricing.currentPrice;
          const previousPrice = previousPrices[serviceId];
          
          if (previousPrice !== undefined && previousPrice !== currentPrice) {
            const difference = currentPrice - previousPrice;
            const isIncrease = difference > 0;
            
            // Call custom callback if provided
            if (onPriceChange) {
              onPriceChange(serviceId, previousPrice, currentPrice);
            }
            
            // Show toast notification
            toast({
              title: isIncrease ? "Price Increased" : "Price Decreased",
              description: `${service.name}: ${isIncrease ? '+' : ''}$${Math.abs(difference).toFixed(2)}`,
              variant: isIncrease ? "destructive" : "default",
              duration: 4000,
            });
          }
        }
      });
      
      // Update previous prices
      const newPreviousPrices: {[key: number]: number} = {};
      services.forEach((service: any) => {
        if (service.dynamicPricing) {
          newPreviousPrices[service.id] = service.dynamicPricing.currentPrice;
        }
      });
      setPreviousPrices(newPreviousPrices);
    }
  }, [services, previousPrices, onPriceChange, toast]);

  // Manual refresh function
  const refreshPricing = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
  };

  return {
    services,
    isLoading,
    error,
    refreshPricing,
    isRefreshing: isLoading
  };
}