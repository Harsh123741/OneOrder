import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SimpleDynamicPricingProps {
  flightId: number;
  currentPrice?: number;
  basePrice?: number;
  className?: string;
}

export default function SimpleDynamicPricing({
  flightId,
  currentPrice,
  basePrice,
  className = ""
}: SimpleDynamicPricingProps) {
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | 'same'>('same');

  // Fetch current pricing data
  const { data: pricingData, error: pricingError } = useQuery({
    queryKey: ['/api/pricing/flight', flightId],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!flightId,
    retry: false
  });

  // Track price changes
  useEffect(() => {
    if (pricingData?.currentPrice) {
      const newPrice = parseFloat(pricingData.currentPrice);
      
      if (lastPrice !== null) {
        if (newPrice > lastPrice) {
          setPriceChangeDirection('up');
        } else if (newPrice < lastPrice) {
          setPriceChangeDirection('down');
        } else {
          setPriceChangeDirection('same');
        }
      }
      
      setLastPrice(newPrice);
    }
  }, [pricingData?.currentPrice, lastPrice]);

  // Use API data if available, otherwise fallback to props
  const pricing = pricingData || { 
    currentPrice: currentPrice?.toString() || '0', 
    basePrice: basePrice?.toString() || '0',
    demandMultiplier: '1.000',
    timeMultiplier: '1.000',
    totalBookings: 0,
    recentBookings: 0
  };

  const currentPriceNum = parseFloat(pricing.currentPrice);
  const basePriceNum = parseFloat(pricing.basePrice);
  const priceDiff = currentPriceNum - basePriceNum;
  const priceChangePercent = ((currentPriceNum - basePriceNum) / basePriceNum) * 100;

  const getDemandLevel = () => {
    const recentBookings = pricing.recentBookings || 0;
    const demandMultiplier = parseFloat(pricing.demandMultiplier || '1.0');
    
    if (recentBookings >= 3 || demandMultiplier > 1.15) {
      return { label: 'High Demand', color: 'bg-red-100 text-red-800' };
    } else if (recentBookings >= 2 || demandMultiplier > 1.05) {
      return { label: 'Fast Booking', color: 'bg-orange-100 text-orange-800' };
    } else if (demandMultiplier < 0.95) {
      return { label: 'Low Demand', color: 'bg-green-100 text-green-800' };
    }
    return { label: 'Normal', color: 'bg-blue-100 text-blue-800' };
  };

  const getTrendIcon = () => {
    switch (priceChangeDirection) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-green-500" />;
      default:
        return <Zap className="w-3 h-3 text-yellow-500" />;
    }
  };

  const demandLevel = getDemandLevel();

  // If there's an error, show basic static pricing
  if (pricingError) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-3xl font-bold text-airline-blue">
          ${currentPrice?.toFixed(0) || '0'}
        </div>
        <div className="text-sm text-gray-600">per person</div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Current Price */}
      <div className="flex items-center gap-2">
        <div className="text-3xl font-bold text-airline-blue">
          ${currentPriceNum.toFixed(0)}
        </div>
        {getTrendIcon()}
      </div>
      
      {/* Base Price and Difference */}
      <div className="space-y-1">
        <div className="text-sm text-gray-600">
          Base: ${basePriceNum.toFixed(0)}
        </div>
        {Math.abs(priceDiff) > 1 && (
          <div className={`text-sm font-medium ${priceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(0)} ({priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(0)}%)
          </div>
        )}
      </div>

      {/* Demand Badge */}
      <Badge className={`text-xs ${demandLevel.color}`}>
        {demandLevel.label}
      </Badge>

      <div className="text-sm text-gray-600">per person</div>
      
      {/* Real-time indicator */}
      {!pricingError && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Live pricing
        </div>
      )}
    </div>
  );
}