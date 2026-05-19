/**
 * CartContext — OPTIMIZED
 *
 * Key fixes:
 * 1. Dynamic import('cache') replaced with static import — no async on clearCart
 * 2. safeCart and cartCount computed in one useMemo (not two)
 * 3. Persist debounce timer ref instead of creating new closure every render
 * 4. EventRegister.emit only when cartCount actually changes (not on every persist)
 * 5. AsyncStorage write batched — only persists when state settles
 */
import React, {
  createContext, useContext, useReducer, useEffect,
  ReactNode, useMemo, useCallback, useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';
import { invalidateCaches } from '../src/lib/cache'; // ✅ static import

export interface ProductVariant {
  id: number; size?: string; color?: string; rate?: number; mrp?: number; qty: number;
}
export interface CartItem {
  productId: number; variantId: number;
  size?: string; color?: string;
  price: number; quantity: number; stock: number;
}

type CartAction =
  | { type: 'LOAD'; payload: CartItem[] }
  | { type: 'ADD'; payload: CartItem }
  | { type: 'UPDATE'; payload: { productId: number; variantId: number; quantity: number } }
  | { type: 'REMOVE'; payload: { productId: number; variantId: number } }
  | { type: 'CLEAR' };

const CART_KEY = 'cart';

const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
  const s = Array.isArray(state) ? state : [];
  switch (action.type) {
    case 'LOAD':
      return Array.isArray(action.payload) ? action.payload : [];
    case 'ADD': {
      const idx = s.findIndex(i => i.productId === action.payload.productId && i.variantId === action.payload.variantId);
      if (idx >= 0) {
        const next = [...s];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + action.payload.quantity };
        return next;
      }
      return [...s, action.payload];
    }
    case 'UPDATE':
      return s
        .map(i => i.productId === action.payload.productId && i.variantId === action.payload.variantId
          ? { ...i, quantity: action.payload.quantity } : i)
        .filter(i => i.quantity > 0);
    case 'REMOVE':
      return s.filter(i => !(i.productId === action.payload.productId && i.variantId === action.payload.variantId));
    case 'CLEAR':
      return [];
    default:
      return s;
  }
};

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, 'stock'> & { stock?: number }) => void;
  updateCartQuantity: (productId: number, variantId: number, quantity: number) => void;
  removeFromCart: (productId: number, variantId: number) => void;
  clearCart: () => void;
  loadCart: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef<number>(0);

  // ── Load persisted cart on mount ───────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then(saved => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) dispatch({ type: 'LOAD', payload: parsed });
        else AsyncStorage.removeItem(CART_KEY);
      } catch {
        AsyncStorage.removeItem(CART_KEY);
      }
    });
  }, []);

  // ✅ FIX: Single useMemo for both safeCart and cartCount
  const { safeCart, cartCount } = useMemo(() => {
    const safeCart = Array.isArray(cart) ? cart : [];
    const cartCount = safeCart.reduce((sum, item) => sum + item.quantity, 0);
    return { safeCart, cartCount };
  }, [cart]);

  // ✅ FIX: Debounced persist with ref-based timer, emit only on count change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(CART_KEY, JSON.stringify(safeCart));
        // Only emit if count actually changed — prevents unnecessary re-renders
        if (prevCountRef.current !== cartCount) {
          prevCountRef.current = cartCount;
          EventRegister.emit('cartChanged', cartCount);
        }
      } catch (e) {
        console.error('Cart save failed:', e);
      }
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [safeCart, cartCount]);

  // ✅ FIX: No dynamic import — invalidateCaches is statically imported
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    invalidateCaches('/products');
    EventRegister.emit('cartChanged', 0);
  }, []);

  const addToCart = useCallback((item: Partial<CartItem> & Pick<CartItem, 'productId' | 'variantId' | 'price' | 'quantity'>) => {
    dispatch({ type: 'ADD', payload: { ...item, stock: item.stock ?? 0 } as CartItem });
  }, []);

  const updateCartQuantity = useCallback((productId: number, variantId: number, quantity: number) => {
    dispatch({ type: 'UPDATE', payload: { productId, variantId, quantity } });
  }, []);

  const removeFromCart = useCallback((productId: number, variantId: number) => {
    dispatch({ type: 'REMOVE', payload: { productId, variantId } });
  }, []);

  const loadCart = useCallback((items: CartItem[]) => {
    dispatch({ type: 'LOAD', payload: Array.isArray(items) ? items : [] });
  }, []);

  const value: CartContextType = useMemo(() => ({
    cart: safeCart,
    cartCount,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    loadCart,
  }), [safeCart, cartCount, addToCart, updateCartQuantity, removeFromCart, clearCart, loadCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};