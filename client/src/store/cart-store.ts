import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  currentUserId: number | null;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncCart: () => Promise<void>;
  loadCartFromStorage: () => Promise<void>;
  setCurrentUser: (userId: number | null) => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getSubtotal: () => number;
  getTaxes: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  console.log('isAuthenticated check:', { token: !!token });
  return !!token;
};

// Helper function to get auth headers for API requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper function to get current user ID from token
const getCurrentUserId = (): number | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch {
    return null;
  }
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,
      currentUserId: null,
      
      addItem: async (item) => {
        try {
          set({ isLoading: true });
          const currentUserId = get().currentUserId;
          
          if (currentUserId && isAuthenticated()) {
            // Save to database
            const cartItemData = {
              itemId: item.id,
              type: item.type,
              name: item.name,
              description: item.description,
              price: item.price.toString(),
              quantity: item.quantity,
              flightId: item.flightId || null,
              serviceId: item.serviceId || null,
              seatId: item.seatId || null,
              passengerId: item.passengerId || null,
              details: item.details || {},
            };
            
            console.log('Cart add: Saving item to database:', cartItemData);
            const response = await apiRequest('POST', '/api/cart/add', cartItemData);
            const savedItem = await response.json();
            console.log('Cart add: Item saved successfully:', savedItem);
            
            // Update the item with database ID for future operations
            item.databaseId = savedItem.id;
          }
          
          // Update local state
          set((state) => {
            const existingItem = state.items.find(i => i.id === item.id);
            if (existingItem) {
              return {
                items: state.items.map(i =>
                  i.id === item.id
                    ? { ...i, quantity: i.quantity + item.quantity }
                    : i
                ),
              };
            }
            return { items: [...state.items, item] };
          });
        } catch (error) {
          console.error('Failed to add item to cart:', error);
          // Fallback to local storage only
          set((state) => {
            const existingItem = state.items.find(i => i.id === item.id);
            if (existingItem) {
              return {
                items: state.items.map(i =>
                  i.id === item.id
                    ? { ...i, quantity: i.quantity + item.quantity }
                    : i
                ),
              };
            }
            return { items: [...state.items, item] };
          });
        } finally {
          set({ isLoading: false });
        }
      },
      
      removeItem: async (id) => {
        try {
          set({ isLoading: true });
          const currentUserId = get().currentUserId;
          
          if (currentUserId && isAuthenticated()) {
            // Find the database ID for this cart item
            const currentItems = get().items;
            const item = currentItems.find(i => i.id === id);
            
            if (item && item.databaseId) {
              await apiRequest('DELETE', `/api/cart/${item.databaseId}`);
            }
          }
          
          // Update local state
          set((state) => ({
            items: state.items.filter(item => item.id !== id),
          }));
        } catch (error) {
          console.error('Failed to remove item from cart:', error);
          // Fallback to local removal only
          set((state) => ({
            items: state.items.filter(item => item.id !== id),
          }));
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateQuantity: async (id, quantity) => {
        try {
          set({ isLoading: true });
          const currentUserId = get().currentUserId;
          
          if (currentUserId && isAuthenticated()) {
            const currentItems = get().items;
            const item = currentItems.find(i => i.id === id);
            
            if (item && item.databaseId) {
              await apiRequest('PUT', `/api/cart/${item.databaseId}`, { quantity });
            }
          }
          
          // Update local state
          set((state) => ({
            items: state.items.map(item =>
              item.id === id ? { ...item, quantity } : item
            ),
          }));
        } catch (error) {
          console.error('Failed to update cart item:', error);
          // Fallback to local update only
          set((state) => ({
            items: state.items.map(item =>
              item.id === id ? { ...item, quantity } : item
            ),
          }));
        } finally {
          set({ isLoading: false });
        }
      },
      
      clearCart: async () => {
        try {
          set({ isLoading: true });
          
          if (isAuthenticated()) {
            await apiRequest('DELETE', '/api/cart/clear');
          }
          
          // Clear local state
          set({ items: [] });
        } catch (error) {
          console.error('Failed to clear cart:', error);
          // Fallback to local clear only
          set({ items: [] });
        } finally {
          set({ isLoading: false });
        }
      },
      
      setCurrentUser: (userId: number | null) => {
        const currentUserId = get().currentUserId;
        console.log(`Cart: User changing from ${currentUserId} to ${userId}`);
        
        // Always update the user ID and clear cart when user changes
        if (currentUserId !== userId) {
          if (userId === null) {
            console.log('Cart: User logging out, clearing cart');
          } else {
            console.log('Cart: User logging in, preparing to sync cart');
          }
          set({ currentUserId: userId, items: [] });
        }
      },
      
      syncCart: async () => {
        const currentUserId = get().currentUserId;
        console.log('Cart sync: Current user ID in store:', currentUserId);
        
        if (!currentUserId || !isAuthenticated()) {
          // Clear cart if not authenticated
          console.log('Cart sync: User not authenticated or no user ID, clearing cart');
          set({ items: [] });
          return;
        }
        
        try {
          console.log('Cart sync: Loading cart from database...');
          set({ isLoading: true });
          const response = await apiRequest('GET', '/api/cart');
          
          if (!response.ok) {
            throw new Error(`Failed to fetch cart: ${response.status}`);
          }
          
          const dbCartItems = await response.json();
          
          console.log('Cart sync: Received cart items from database:', dbCartItems);
          
          // Convert database cart items to local cart format
          const convertedItems = dbCartItems.map((dbItem: any) => ({
            id: dbItem.itemId,
            databaseId: dbItem.id,
            type: dbItem.type,
            name: dbItem.name,
            description: dbItem.description,
            price: parseFloat(dbItem.price),
            quantity: dbItem.quantity,
            flightId: dbItem.flightId,
            serviceId: dbItem.serviceId,
            seatId: dbItem.seatId,
            passengerId: dbItem.passengerId,
            details: dbItem.details,
          }));
          
          console.log('Cart sync: Converted items:', convertedItems);
          console.log(`Cart sync: Loaded ${convertedItems.length} items for user`);
          
          // Replace items with user's cart from database
          set({ items: convertedItems });
        } catch (error) {
          console.error('Failed to sync cart:', error);
          // Don't clear cart on error - keep local items if sync fails
          console.log('Cart sync: Keeping local cart items due to sync error');
        } finally {
          set({ isLoading: false });
        }
      },
      
      loadCartFromStorage: async () => {
        if (isAuthenticated()) {
          // If authenticated, load from database
          await get().syncCart();
        }
        // If not authenticated, cart will load from localStorage via persist middleware
      },
      
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      
      setCartOpen: (open) => set({ isOpen: open }),
      
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      
      getTaxes: () => {
        const subtotal = get().getSubtotal();
        return subtotal * 0.12; // 12% tax
      },
      
      getTotal: () => {
        const { getSubtotal, getTaxes } = get();
        return getSubtotal() + getTaxes();
      },
      
      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'airline-cart-storage',
      // Only persist basic state, not items (items should come from database for authenticated users)
      partialize: (state) => ({
        isOpen: state.isOpen,
        currentUserId: state.currentUserId,
        // Only persist items for guest users (no currentUserId)
        items: state.currentUserId ? [] : state.items,
      }),
    }
  )
);
