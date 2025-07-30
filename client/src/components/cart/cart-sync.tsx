import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useCartStore } from '@/store/cart-store';
import { useLocation } from 'wouter';

export function CartSync() {
  const { user } = useAuth();
  const cartStore = useCart();
  const cartStoreState = useCartStore();
  const { syncCart, clearCart, setCurrentUser, items } = cartStore;
  const [location, setLocation] = useLocation();
  const previousUserIdRef = useRef<number | null>(null);
  const previousItemCountRef = useRef<number>(0);
  const previousFlightCountRef = useRef<number>(0);
  const hasRedirectedOnLoginRef = useRef<boolean>(false);

  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = previousUserIdRef.current;

    // If user changed (including login/logout), handle cart sync
    if (currentUserId !== previousUserId) {
      console.log(`Cart sync: User changed from ${previousUserId} to ${currentUserId}`);
      
      // First, update the current user in cart store
      setCurrentUser(currentUserId);
      
      // After user is set, sync cart if user is logged in
      if (currentUserId) {
        console.log(`Cart sync: User logged in (ID: ${currentUserId}), syncing cart...`);
        // Reset redirect flag when user logs in
        hasRedirectedOnLoginRef.current = false;
        // Add a small delay to ensure the user state and authentication is properly set
        setTimeout(async () => {
          await syncCart();
        }, 500);
      } else {
        console.log('Cart sync: User logged out, cart cleared');
        // Reset redirect flag when user logs out
        hasRedirectedOnLoginRef.current = false;
      }
      
      // Update the ref with current user ID
      previousUserIdRef.current = currentUserId;
    }
  }, [user, syncCart, setCurrentUser]);

  // Separate effect to handle redirect after cart items are loaded (only on initial login)
  useEffect(() => {
    // Only check for redirect if user is logged in, we have items, and haven't already redirected
    if (user?.id && items.length > 0 && !hasRedirectedOnLoginRef.current) {
      const flightItems = items.filter(item => item.type === 'flight');
      console.log('Cart sync: Checking for redirect - Items:', items.length, 'Flights:', flightItems.length, 'Location:', location);
      
      if (flightItems.length > 0 && location !== '/services' && location !== '/cart' && location !== '/checkout' && location !== '/payment') {
        console.log('Cart sync: User has flight in cart, redirecting to cart');
        hasRedirectedOnLoginRef.current = true; // Mark that we've redirected
        setLocation('/cart');
      }
    }
  }, [user, items, location, setLocation]);

  // Monitor cart items for flight removal
  useEffect(() => {
    const currentItemCount = items.length;
    const currentFlightCount = items.filter(item => item.type === 'flight').length;
    const previousItemCount = previousItemCountRef.current;
    const previousFlightCount = previousFlightCountRef.current;
    
    // Debug logging
    console.log('Cart sync: Monitoring cart changes', {
      previousItemCount,
      currentItemCount,
      previousFlightCount,
      currentFlightCount,
      isCheckoutFlow: cartStoreState.isCheckoutFlow,
      location
    });
    
    // Only trigger on actual changes after initial load and NOT during checkout flow
    if ((previousItemCount > 0 || previousFlightCount > 0) && !cartStoreState.isCheckoutFlow) {
      // If user removed flights (flight count went from >0 to 0), clear entire cart and redirect
      if (previousFlightCount > 0 && currentFlightCount === 0) {
        console.log('Cart: Flight removed by user, clearing entire cart and redirecting to home');
        clearCart();
        if (location !== '/') {
          setLocation('/');
        }
      }
      // If cart had items but now doesn't (all items removed), redirect to home
      else if (previousItemCount > 0 && currentItemCount === 0) {
        console.log('Cart: All items removed by user, redirecting to home');
        if (location !== '/') {
          setLocation('/');
        }
      }
    } else if (cartStoreState.isCheckoutFlow) {
      console.log('Cart sync: Skipping redirect due to checkout flow');
    }
    
    // Update the refs
    previousItemCountRef.current = currentItemCount;
    previousFlightCountRef.current = currentFlightCount;
  }, [items, clearCart, location, setLocation, cartStoreState.isCheckoutFlow]);

  return null; // This is a utility component that doesn't render anything
}