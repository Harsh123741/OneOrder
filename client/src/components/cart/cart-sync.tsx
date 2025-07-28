import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';

export function CartSync() {
  const { user } = useAuth();
  const { syncCart, clearCart, setCurrentUser } = useCart();
  const previousUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = previousUserIdRef.current;

    // If user changed (including login/logout), handle cart sync
    if (currentUserId !== previousUserId) {
      console.log(`Cart sync: User changed from ${previousUserId} to ${currentUserId}`);
      
      // Always update the current user in cart store to handle user switching
      setCurrentUser(currentUserId);
      
      if (currentUserId) {
        console.log(`Cart sync: User logged in (ID: ${currentUserId}), syncing cart...`);
        // User logged in or switched - sync with their cart from database
        // Add a small delay to ensure the user state is properly set
        setTimeout(() => {
          syncCart();
        }, 100);
      } else {
        console.log('Cart sync: User logged out, cart cleared');
      }
      // Note: clearCart is now handled by setCurrentUser when user changes
      
      // Update the ref with current user ID
      previousUserIdRef.current = currentUserId;
    }
  }, [user, syncCart, clearCart, setCurrentUser]);

  return null; // This is a utility component that doesn't render anything
}