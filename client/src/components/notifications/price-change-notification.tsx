import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PriceChangeNotificationProps {
  cartItems: any[];
}

interface PreviousPrices {
  [key: string]: number;
}

export function PriceChangeNotification({ cartItems }: PriceChangeNotificationProps) {
  const { toast } = useToast();
  const [previousPrices, setPreviousPrices] = useState<PreviousPrices>({});

  useEffect(() => {
    // Only process if we have previous prices to compare against
    if (Object.keys(previousPrices).length === 0) {
      // Initialize previous prices on first load
      const initialPrices: PreviousPrices = {};
      cartItems.forEach(item => {
        initialPrices[item.id] = parseFloat(item.price);
      });
      setPreviousPrices(initialPrices);
      return;
    }

    // Check for price changes
    cartItems.forEach(item => {
      const currentPrice = parseFloat(item.price);
      const previousPrice = previousPrices[item.id];
      
      if (previousPrice !== undefined && previousPrice !== currentPrice) {
        const difference = currentPrice - previousPrice;
        const isIncrease = difference > 0;
        
        toast({
          title: isIncrease ? "Price Increased" : "Price Decreased",
          description: `${item.name} price changed by ${isIncrease ? '+' : ''}$${Math.abs(difference).toFixed(2)}`,
          variant: isIncrease ? "destructive" : "default",
          duration: 5000,
        });
        
        // Update only the changed item's price
        setPreviousPrices(prev => ({
          ...prev,
          [item.id]: currentPrice
        }));
      }
    });
  }, [cartItems, toast]); // Removed previousPrices from dependencies

  return null; // This component doesn't render anything visible
}