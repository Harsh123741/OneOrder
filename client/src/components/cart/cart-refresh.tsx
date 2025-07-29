import { useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { apiRequest } from '@/lib/queryClient';
import { useNotificationStore } from '@/store/notification-store';

interface CartRefreshProps {
  enabled?: boolean;
  interval?: number;
}

export function CartRefresh({ enabled = true, interval = 60000 }: CartRefreshProps) {
  const { items, updateItemDetails } = useCart();
  const { addNotification } = useNotificationStore();

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

                // Add price change notification
                addNotification({
                  itemId: item.id,
                  itemName: item.name,
                  itemType: 'service',
                  oldPrice: oldPrice,
                  newPrice: newPrice,
                  trend: isIncrease ? 'up' : 'down'
                });
              }
            }
          } catch (error) {
            console.error(`Failed to refresh pricing for service ${item.serviceId}:`, error);
          }
        } else if (item.type === 'flight' && item.flightId) {
          // Update flight prices for flights without fare hold
          try {
            const response = await apiRequest('GET', `/api/flights/${item.flightId}`);
            const updatedFlight = await response.json();

            // Check if flight has an active fare hold (locked price)
            const hasFareHold = updatedFlight.dynamicPricing?.userFareHold || 
                               (item.details && item.details.fareHold);

            if (!hasFareHold && updatedFlight.dynamicPricing) {
              const oldPrice = parseFloat(item.price.toString());
              const newPrice = parseFloat(updatedFlight.dynamicPricing.currentPrice);

              // Check if price changed
              if (Math.abs(oldPrice - newPrice) > 0.01) {
                const difference = newPrice - oldPrice;
                const isIncrease = difference > 0;

                console.log(`Cart flight price update for ${item.name}: ${oldPrice} -> ${newPrice}`);

                // Update cart item with new flight pricing
                await updateItemDetails(item.id, {
                  price: newPrice,
                  details: {
                    ...item.details,
                    dynamicPricing: updatedFlight.dynamicPricing
                  }
                });

                // Add flight price change notification
                addNotification({
                  itemId: item.id,
                  itemName: item.name,
                  itemType: 'flight',
                  oldPrice: oldPrice,
                  newPrice: newPrice,
                  trend: isIncrease ? 'up' : 'down',
                  fareHoldStatus: hasFareHold ? 'protected' : 'live'
                });
              }
            }
          } catch (error) {
            console.error(`Failed to refresh pricing for flight ${item.flightId}:`, error);
          }
        }
      }
    };

    const intervalId = setInterval(refreshCartPricing, interval);

    return () => clearInterval(intervalId);
  }, [items, enabled, interval, addNotification, updateItemDetails]);

  return null; // This component doesn't render anything
}