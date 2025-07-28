import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useLocation } from 'wouter';

export function CartSync() {
  const { user } = useAuth();
  const { syncCart, clearCart, setCurrentUser, items } = useCart();
  const [location, setLocation] = useLocation();
  const previousUserIdRef = useRef<number | null>(null);
  const previousItemCountRef = useRef<number>(0);

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
            const flightItems = items.filter(item => item.type === 'flight');
            if (flightItems.length > 0 && location !== '/services') {
              console.log('Cart sync: User has flight in cart, redirecting to services');
              setLocation('/services');
            }
          }, 100);
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
    
    // Only trigger on actual changes after initial load
    if (previousItemCount > 0) {
      // If cart had items but now doesn't (item was removed), clear cart and redirect to home
      if (currentItemCount === 0) {
        console.log('Cart: All items removed, clearing cart and redirecting to home');
        clearCart();
        if (location !== '/') {
          setLocation('/');
        }
      }
      
      // If user specifically removed flights (but other items remain), redirect to home
      else if (currentFlightCount === 0 && currentItemCount > 0) {
        console.log('Cart: Flight removed, redirecting to home');
        if (location !== '/') {
          setLocation('/');
        }
      }
    }
    
    // Update the ref
    previousItemCountRef.current = currentItemCount;
  }, [items, clearCart, location, setLocation]);

  return null; // This is a utility component that doesn't render anything
}