import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useLocation } from 'wouter';

export function CartSync() {
  const { user } = useAuth();
  const cartStore = useCart();
  const { syncCart, clearCart, setCurrentUser, items } = cartStore;
  const [location, setLocation] = useLocation();
  const previousUserIdRef = useRef<number | null>(null);
  const previousItemCountRef = useRef<number>(0);
  const previousFlightCountRef = useRef<number>(0);

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
        // Add a small delay to ensure the user state and authentication is properly set
        setTimeout(async () => {
          await syncCart();
          
          // After syncing cart, check if user has flight items and redirect to services
          setTimeout(() => {
            const currentItems = cartStore.items; // Get fresh items from store
            const flightItems = currentItems.filter(item => item.type === 'flight');
            if (flightItems.length > 0 && location !== '/services') {
              console.log('Cart sync: User has flight in cart, redirecting to services');
              setLocation('/services');
            }
          }, 500);
        }, 200);
      } else {
        console.log('Cart sync: User logged out, cart cleared');
      }
      
      // Update the ref with current user ID
      previousUserIdRef.current = currentUserId;
    }
  }, [user, syncCart, setCurrentUser]);

  // Monitor cart items for flight removal
  useEffect(() => {
    const currentItemCount = items.length;
    const currentFlightCount = items.filter(item => item.type === 'flight').length;
    const previousItemCount = previousItemCountRef.current;
    const previousFlightCount = previousFlightCountRef.current;
    
    // Only trigger on actual changes after initial load
    if (previousItemCount > 0 || previousFlightCount > 0) {
      // If user removed flights (flight count went from >0 to 0), clear entire cart and redirect
      if (previousFlightCount > 0 && currentFlightCount === 0) {
        console.log('Cart: Flight removed, clearing entire cart and redirecting to home');
        clearCart();
        if (location !== '/') {
          setLocation('/');
        }
      }
      // If cart had items but now doesn't (all items removed), redirect to home
      else if (previousItemCount > 0 && currentItemCount === 0) {
        console.log('Cart: All items removed, redirecting to home');
        if (location !== '/') {
          setLocation('/');
        }
      }
    }
    
    // Update the refs
    previousItemCountRef.current = currentItemCount;
    previousFlightCountRef.current = currentFlightCount;
  }, [items, clearCart, location, setLocation]);

  return null; // This is a utility component that doesn't render anything
}