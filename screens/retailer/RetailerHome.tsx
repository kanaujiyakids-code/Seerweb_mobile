import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from 'components/CustomAlert';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { apiUrl } from 'apiurl';
import RefreshWrapper from 'components/RefreshWrapper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';
import ProductCart, { Product, ProductVariant, CartItem } from 'components/ProductCart';
import { useCart } from '../../context/CartContext';

// NOTE: @react-native-voice/voice removed — requires custom native build, not supported in Expo Go.

interface RenderItemProps {
  item: Product;
  cart: CartItem[];
  onAddVariant: (productId: number, variant: ProductVariant, qty: number) => void;
  onUpdateVariantQty: (productId: number, variantId: number, qty: number) => void;
  onRemoveVariant: (productId: number, variantId: number) => void;
  onAddSimple: (productId: number) => void;
  onUpdateSimpleQty: (productId: number, qty: number) => void;
  onRemoveSimple: (productId: number) => void;
}

const MemoProductCard = memo(
  ({
    item,
    cart,
    onAddVariant,
    onUpdateVariantQty,
    onRemoveVariant,
    onAddSimple,
    onUpdateSimpleQty,
    onRemoveSimple,
  }: RenderItemProps) => (
    <ProductCart
      product={item}
      showSize={Number(item.business_type_id) === 2}
      cart={cart}
      onAddVariant={onAddVariant}
      onUpdateVariantQty={onUpdateVariantQty}
      onRemoveVariant={onRemoveVariant}
      onAddSimple={onAddSimple}
      onUpdateSimpleQty={onUpdateSimpleQty}
      onRemoveSimple={onRemoveSimple}
    />
  )
);
MemoProductCard.displayName = 'MemoProductCard';

export default function RetailerHome() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const { cart, addToCart, updateCartQuantity, removeFromCart } = useCart();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const showAlert = useCallback((msg: string) => {
    setAlertMsg(msg);
    setAlertVisible(true);
  }, []);

  const handleAddVariant = useCallback(
    (productId: number, variant: ProductVariant, qty: number) => {
      addToCart({
        productId,
        variantId: variant.id,
        size: variant.size,
        color: variant.color,
        price: variant.rate ?? variant.mrp ?? 0,
        quantity: qty,
        stock: variant.qty,
      });
      showAlert('Added to cart');
    },
    [addToCart, showAlert]
  );

  const handleUpdateVariantQty = useCallback(
    (productId: number, variantId: number, qty: number) => {
      if (qty <= 0) {
        removeFromCart(productId, variantId);
      } else {
        updateCartQuantity(productId, variantId, Math.min(qty, 999));
      }
    },
    [removeFromCart, updateCartQuantity]
  );

  const handleRemoveVariant = useCallback(
    (productId: number, variantId: number) => {
      removeFromCart(productId, variantId);
    },
    [removeFromCart]
  );

  const handleAddSimple = useCallback(
    (productId: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      addToCart({
        productId,
        variantId: 0,
        price: product.price,
        quantity: 1,
        stock: product.stock,
      });
      showAlert('Added to cart');
    },
    [products, addToCart, showAlert]
  );

  const handleUpdateSimpleQty = useCallback(
    (productId: number, qty: number) => {
      if (qty <= 0) {
        removeFromCart(productId, 0);
      } else {
        updateCartQuantity(productId, 0, Math.min(qty, 999));
      }
    },
    [removeFromCart, updateCartQuantity]
  );

  const handleRemoveSimple = useCallback(
    (productId: number) => {
      removeFromCart(productId, 0);
    },
    [removeFromCart]
  );

  const totalCartItems = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);

  const cartTotalPrice = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.quantity, 0).toLocaleString('en-IN'),
    [cart]
  );

  useEffect(() => {
    const fetchUser = async () => {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        navigation.replace('Login');
        return;
      }
      const parsed = JSON.parse(userString);
      if (parsed.role !== 'retailer') {
        navigation.replace('Login');
        return;
      }
    };
    fetchUser();
  }, [navigation]);

  const fetchProducts = useCallback(
    async (dealerId: number) => {
      if (!dealerId) return;
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/products?dealerid=${dealerId}`);
        const data = await response.json();

        const formatted: Product[] = (data.products || data).map((item: any) => {
          let attrs: Record<string, string> = {};
          if (item.attributes) {
            attrs =
              typeof item.attributes === 'string' ? JSON.parse(item.attributes) : item.attributes;
          }
          return {
            id: Number(item.id),
            name: item.name || '',
            brand: item.brand || attrs.brand || '',
            model: item.model || attrs.model || '',
            price: Number(item.price),
            stock: Number(item.stock),
            description: item.description || '',
            dealerid: Number(item.dealerid),
            image: item.image || null,
            attributes: attrs,
            business_type_id: item.business_type_id ?? null,
            variants: item.variants ?? [],
          };
        });

        setProducts(formatted);
        setFilteredProducts(formatted);

        const validIds = new Set(formatted.map((p) => p.id));
        const staleIds = cart
          .filter((c) => !validIds.has(c.productId))
          .map((c) => ({ productId: c.productId, variantId: c.variantId }));

        if (staleIds.length > 0) {
          setTimeout(() => {
            staleIds.forEach(({ productId, variantId }) => removeFromCart(productId, variantId));
          }, 0);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    },
    [cart, removeFromCart]
  );

  useEffect(() => {
    const boot = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        fetchProducts(parsed.dealer_id);
      }
    };
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);
      const q = query.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.brand ?? '').toLowerCase().includes(q) ||
            (p.model ?? '').toLowerCase().includes(q) ||
            Object.values(p.attributes ?? {}).some((v) => String(v).toLowerCase().includes(q))
        )
      );
    },
    [products]
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <MemoProductCard
        item={item}
        cart={cart}
        onAddVariant={handleAddVariant}
        onUpdateVariantQty={handleUpdateVariantQty}
        onRemoveVariant={handleRemoveVariant}
        onAddSimple={handleAddSimple}
        onUpdateSimpleQty={handleUpdateSimpleQty}
        onRemoveSimple={handleRemoveSimple}
      />
    ),
    [
      cart,
      handleAddVariant,
      handleUpdateVariantQty,
      handleRemoveVariant,
      handleAddSimple,
      handleUpdateSimpleQty,
      handleRemoveSimple,
    ]
  );

  const handleRefresh = useCallback(async () => {
    if (user?.dealer_id) await fetchProducts(user.dealer_id);
  }, [user, fetchProducts]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Navbar user={user?.name} />

      {/* Image zoom modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setImageModalVisible(false)}>
          <Image source={{ uri: modalImage! }} style={styles.modalImage} resizeMode="contain" />
        </Pressable>
      </Modal>

      <RefreshWrapper onRefresh={handleRefresh}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>Browse Products</Text>
          <Text style={styles.pageSubtitle}>Add products to your cart for bulk ordering</Text>

          {totalCartItems > 0 && (
            <View style={styles.cartStrip}>
              <View style={styles.cartStripBadge}>
                <Text style={styles.cartStripBadgeText}>{totalCartItems}</Text>
              </View>
              <Text style={styles.cartStripText}>
                {totalCartItems} item{totalCartItems !== 1 ? 's' : ''} in cart
              </Text>
              <Text style={styles.cartStripTotal}>₹{cartTotalPrice}</Text>
            </View>
          )}

          {/* Search bar — mic button removed (voice requires native build) */}
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search by name, brand, or model..."
              value={search}
              onChangeText={handleSearch}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#185FA5" style={{ marginTop: 40 }} />
          ) : filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>No products found.</Text>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={10}
              removeClippedSubviews={true}
            />
          )}

          <CustomAlert
            visible={alertVisible}
            message={alertMsg}
            onClose={() => setAlertVisible(false)}
          />

          <View style={{ height: 16 }} />
        </ScrollView>
      </RefreshWrapper>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  cartStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  cartStripBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#185FA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartStripBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  cartStripText: {
    flex: 1,
    fontSize: 13,
    color: '#185FA5',
    fontWeight: '500',
  },
  cartStripTotal: {
    fontSize: 13,
    fontWeight: '500',
    color: '#185FA5',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#111827',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
  },
});
