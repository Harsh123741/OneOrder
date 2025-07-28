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
      
      // First, update the current user in cart store
      setCurrentUser(currentUserId).then(() => {
        // After user is set, sync cart if user is logged in
        if (currentUserId) {
          console.log(`Cart sync: User logged in (ID: ${currentUserId}), syncing cart...`);
          // Add a small delay to ensure the user state and authentication is properly set
          setTimeout(() => {
            syncCart();
          }, 200);
        } else {
          console.log('Cart sync: User logged out, cart cleared');
        }
      });
      
      // Update the ref with current user ID
      previousUserIdRef.current = currentUserId;
    }
  }, [user, syncCart, setCurrentUser]);

  return null; // This is a utility component that doesn't render anything
}