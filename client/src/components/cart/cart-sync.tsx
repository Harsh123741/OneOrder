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

    // Always update the current user in cart store to handle user switching
    setCurrentUser(currentUserId);

    // If user changed (including login/logout), handle cart sync
    if (currentUserId !== previousUserId) {
      if (currentUserId) {
        // User logged in or switched - sync with their cart
        syncCart();
      }
      // Note: clearCart is now handled by setCurrentUser when user changes
      
      // Update the ref with current user ID
      previousUserIdRef.current = currentUserId;
    }
  }, [user, syncCart, clearCart, setCurrentUser]);

  return null; // This is a utility component that doesn't render anything
}