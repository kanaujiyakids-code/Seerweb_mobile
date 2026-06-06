import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';
import { invalidateCaches } from '../src/lib/cache';
import { clampCartQuantity } from '../src/lib/cart';

export interface ProductVariant {
  id: number;
  size?: string;
  color?: string;
  rate?: number;
  mrp?: number;
  qty: number;
}

export interface CartItem {
  productId: number;
  variantId: number;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  stock: number;
  brand?: string;
  model?: string;
  image?: string | null;
  productName?: string;
  businessTypeId?: number | null;
  attributes?: Record<string, any>;
  garmentMeta?: {
    designNumber?: string;
    fabricType?: string;
    bookingType?: string;
    selectedColor?: string;
    selectedColorHex?: string;
    selectedSizes?: string[];
    productTags?: string[];
    galleryImages?: string[];
  };
  setQuantity?: number;
}

type CartAction =
  | { type: 'LOAD'; payload: CartItem[] }
  | { type: 'ADD'; payload: CartItem }
  | { type: 'UPDATE'; payload: { productId: number; variantId: number; quantity: number } }
  | { type: 'REMOVE'; payload: { productId: number; variantId: number } }
  | { type: 'CLEAR' };

const CART_KEY = 'cart';

const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
  const safeState = Array.isArray(state) ? state : [];

  switch (action.type) {
    case 'LOAD':
      return Array.isArray(action.payload) ? action.payload : [];

    case 'ADD': {
      const index = safeState.findIndex(
        (item) =>
          item.productId === action.payload.productId && item.variantId === action.payload.variantId
      );

      if (index >= 0) {
        const next = [...safeState];
        const stock =
          action.payload.stock && action.payload.stock > 0
            ? action.payload.stock
            : next[index].stock;

        next[index] = {
          ...next[index],
          ...action.payload,
          stock,
          quantity: clampCartQuantity(next[index].quantity + action.payload.quantity, stock),
        };

        return next.filter((item) => item.quantity > 0);
      }

      const quantity = clampCartQuantity(action.payload.quantity, action.payload.stock);
      if (quantity <= 0) return safeState;

      return [...safeState, { ...action.payload, quantity }];
    }

    case 'UPDATE':
      return safeState
        .map((item) =>
          item.productId === action.payload.productId && item.variantId === action.payload.variantId
            ? {
                ...item,
                quantity: clampCartQuantity(action.payload.quantity, item.stock),
              }
            : item
        )
        .filter((item) => item.quantity > 0);

    case 'REMOVE':
      return safeState.filter(
        (item) =>
          !(
            item.productId === action.payload.productId &&
            item.variantId === action.payload.variantId
          )
      );

    case 'CLEAR':
      return [];

    default:
      return safeState;
  }
};

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, 'stock'> & { stock?: number }) => void;
  addGarmentBundle: (
    product: {
      id: number;
      name: string;
      brand?: string;
      model?: string;
      image?: string | null;
      price: number;
      stock: number;
      business_type_id?: number | null;
      attributes?: Record<string, any>;
    },
    variants: (ProductVariant & {
      quantity: number;
      color?: string;
      setQuantity?: number;
    })[],
    garmentMeta?: CartItem['garmentMeta']
  ) => void;
  updateCartQuantity: (productId: number, variantId: number, quantity: number) => void;
  removeFromCart: (productId: number, variantId: number) => void;
  clearCart: () => void;
  loadCart: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((saved) => {
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

  const { safeCart, cartCount } = useMemo(() => {
    const nextCart = Array.isArray(cart) ? cart : [];
    return {
      safeCart: nextCart,
      cartCount: nextCart.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [cart]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(CART_KEY, JSON.stringify(safeCart));

        if (prevCountRef.current !== cartCount) {
          prevCountRef.current = cartCount;
          EventRegister.emit('cartChanged', cartCount);
        }
      } catch (error) {
        console.error('Cart save failed:', error);
      }
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [safeCart, cartCount]);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    invalidateCaches('/products');
    EventRegister.emit('cartChanged', 0);
  }, []);

  const addToCart = useCallback(
    (item: Partial<CartItem> & Pick<CartItem, 'productId' | 'variantId' | 'price' | 'quantity'>) => {
      dispatch({ type: 'ADD', payload: { ...item, stock: item.stock ?? 0 } as CartItem });
    },
    []
  );

  const addGarmentBundle = useCallback(
    (
      product: {
        id: number;
        name: string;
        brand?: string;
        model?: string;
        image?: string | null;
        price: number;
        stock: number;
        business_type_id?: number | null;
        attributes?: Record<string, any>;
      },
      variants: (ProductVariant & {
        quantity: number;
        color?: string;
        setQuantity?: number;
      })[],
      garmentMeta?: CartItem['garmentMeta']
    ) => {
      const validVariants = variants.filter((variant) => variant.quantity > 0);
      if (validVariants.length === 0) return;

      validVariants.forEach((variant) => {
        addToCart({
          productId: product.id,
          variantId: variant.id,
          size: variant.size,
          color: variant.color || garmentMeta?.selectedColor || product.attributes?.color || '',
          price: Number(variant.rate ?? variant.mrp ?? product.price ?? 0),
          quantity: variant.quantity,
          stock: Number(variant.qty ?? product.stock ?? 0),
          brand: product.brand,
          model: product.model,
          image: product.image,
          productName: product.name,
          businessTypeId: product.business_type_id ?? null,
          attributes: product.attributes ?? {},
          garmentMeta,
          setQuantity: variant.setQuantity,
        });
      });
    },
    [addToCart]
  );

  const updateCartQuantity = useCallback((productId: number, variantId: number, quantity: number) => {
    dispatch({ type: 'UPDATE', payload: { productId, variantId, quantity } });
  }, []);

  const removeFromCart = useCallback((productId: number, variantId: number) => {
    dispatch({ type: 'REMOVE', payload: { productId, variantId } });
  }, []);

  const loadCart = useCallback((items: CartItem[]) => {
    dispatch({ type: 'LOAD', payload: Array.isArray(items) ? items : [] });
  }, []);

  const value = useMemo(
    () => ({
      cart: safeCart,
      cartCount,
      addToCart,
      addGarmentBundle,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      loadCart,
    }),
    [
      safeCart,
      cartCount,
      addToCart,
      addGarmentBundle,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      loadCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
