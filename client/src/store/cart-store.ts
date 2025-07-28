import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncCart: () => Promise<void>;
  loadCartFromStorage: () => Promise<void>;
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
  return !!token;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,
      
      addItem: async (item) => {
        try {
          set({ isLoading: true });
          
          if (isAuthenticated()) {
            // Save to database
            const cartItemData = {
              itemId: item.id,
              type: item.type,
              name: item.name,
              description: item.description,
              price: item.price,
              quantity: item.quantity,
              flightId: item.flightId,
              serviceId: item.serviceId || null,
              seatId: item.seatId || null,
              passengerId: item.passengerId || null,
              details: item.details || null,
            };
            
            await apiRequest('POST', '/api/cart/add', cartItemData);
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
          
          if (isAuthenticated()) {
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
          
          if (isAuthenticated()) {
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
      
      syncCart: async () => {
        if (!isAuthenticated()) return;
        
        try {
          set({ isLoading: true });
          const response = await apiRequest('GET', '/api/cart');
          const dbCartItems = await response.json();
          
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
          
          set({ items: convertedItems });
        } catch (error) {
          console.error('Failed to sync cart:', error);
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
    }
  )
);
