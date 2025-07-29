import { useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CartRefreshProps {
  enabled?: boolean;
  interval?: number;
}

export function CartRefresh({ enabled = true, interval = 60000 }: CartRefreshProps) {
  const { items, updateItemDetails } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const refreshCartPricing = async () => {
      for (const item of items) {
        if (item.type === 'service' && item.serviceId) {
          try {
            const response = await apiRequest('GET', `/api/services/${item.serviceId}`);
            const updatedService = await response.json();
            
            if (updatedService.dynamicPricing) {
              const oldPrice = parseFloat(item.price.toString());
              const newPrice = updatedService.dynamicPricing.currentPrice;
              
              // Check if price changed
              if (Math.abs(oldPrice - newPrice) > 0.01) {
                const difference = newPrice - oldPrice;
                const isIncrease = difference > 0;
                
                console.log(`Cart price update for ${item.name}: ${oldPrice} -> ${newPrice}`);
                
                // Update cart item with new pricing information
                await updateItemDetails(item.id, {
                  price: newPrice,
                  details: {
                    ...item.details,
                    dynamicPricing: updatedService.dynamicPricing
                  }
                });
                
                // Notify user of price change
                toast({
                  title: `Cart Price ${isIncrease ? 'Increase' : 'Decrease'}`,
                  description: `${item.name}: ${isIncrease ? '+' : ''}$${Math.abs(difference).toFixed(2)}`,
                  variant: isIncrease ? "destructive" : "default",
                  duration: 6000,
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to refresh pricing for service ${item.serviceId}:`, error);
          }
        }
      }
    };

    const intervalId = setInterval(refreshCartPricing, interval);
    
    return () => clearInterval(intervalId);
  }, [items, enabled, interval, toast, updateItemDetails]);

  return null; // This component doesn't render anything
}