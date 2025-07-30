import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';

interface PriceChange {
  itemId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  type: 'increase' | 'decrease';
  tag?: string;
  message?: string;
}

interface UsePriceChangeNotificationsReturn {
  priceChanges: PriceChange[];
  dismissNotifications: () => void;
  hasNewChanges: boolean;
}

export function usePriceChangeNotifications(): UsePriceChangeNotificationsReturn {
  const { items } = useCart();
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [hasNewChanges, setHasNewChanges] = useState(false);
  const previousPricesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const currentPrices = new Map<string, number>();
    const newChanges: PriceChange[] = [];

    // Check each item for price changes
    items.forEach(item => {
      const currentPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      const previousPrice = previousPricesRef.current.get(item.id);
      
      currentPrices.set(item.id, currentPrice);

      // If we have a previous price and it's different from current
      if (previousPrice !== undefined && Math.abs(previousPrice - currentPrice) > 0.01) {
        const change: PriceChange = {
          itemId: item.id,
          name: item.name,
          oldPrice: previousPrice,
          newPrice: currentPrice,
          type: currentPrice > previousPrice ? 'increase' : 'decrease',
          tag: item.details?.dynamicPricing?.pricingTag?.tag || '',
          message: item.details?.dynamicPricing?.pricingTag?.message || ''
        };
        
        newChanges.push(change);
      }
    });

    // Update previous prices reference
    previousPricesRef.current = currentPrices;

    // If there are new changes, show notifications
    if (newChanges.length > 0) {
      setPriceChanges(newChanges);
      setHasNewChanges(true);
    }
  }, [items]);

  const dismissNotifications = () => {
    setPriceChanges([]);
    setHasNewChanges(false);
  };

  return {
    priceChanges,
    dismissNotifications,
    hasNewChanges
  };
}