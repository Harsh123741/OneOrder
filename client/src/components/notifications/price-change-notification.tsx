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
      }
    });

    // Update previous prices
    const newPreviousPrices: PreviousPrices = {};
    cartItems.forEach(item => {
      newPreviousPrices[item.id] = parseFloat(item.price);
    });
    setPreviousPrices(newPreviousPrices);
  }, [cartItems, previousPrices, toast]);

  return null; // This component doesn't render anything visible
}