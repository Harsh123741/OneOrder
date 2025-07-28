import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';

export function CartSync() {
  const { user } = useAuth();
  const { loadCartFromStorage } = useCart();

  useEffect(() => {
    // Load cart when user authentication state changes
    if (user) {
      // User is logged in, sync with database
      loadCartFromStorage();
    }
    // If user logs out, cart will persist in localStorage via zustand persist middleware
  }, [user, loadCartFromStorage]);

  return null; // This is a utility component that doesn't render anything
}