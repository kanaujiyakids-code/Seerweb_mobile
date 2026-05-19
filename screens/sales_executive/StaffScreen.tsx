import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  View, Text, ScrollView, TextInput, FlatList,
  Pressable, ActivityIndicator, Linking, Platform, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabNavigator from 'components/BottomTabNavigator';
import CustomAlert from 'components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { cachedGet } from 'src/lib/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';
import ProductCart, { Product, ProductVariant, CartItem } from 'components/ProductCart';
import { useCart } from '../../context/CartContext';

/* -------------------- INTERFACES -------------------- */

interface Retailer {
  id: number;
  name: string;
  store_name: string;
  phone: string;
  address: string;
  city: string;
}

/* -------------------- MEMOIZED PRODUCT CARD -------------------- */

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

const MemoProductCard = memo(({
  item, cart,
  onAddVariant, onUpdateVariantQty, onRemoveVariant,
  onAddSimple, onUpdateSimpleQty, onRemoveSimple,
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
));
MemoProductCard.displayName = 'MemoProductCard';

/* -------------------- MAIN SCREEN -------------------- */

export default function StaffScreen() {
  const navigation = useNavigation();
  const { cart, addToCart, updateCartQuantity, removeFromCart } = useCart();

  const [user, setUser]                           = useState<any>(null);
  const [retailers, setRetailers]                 = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer]   = useState<Retailer | null>(null);
  const [products, setProducts]                   = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts]   = useState<Product[]>([]);
  const [search, setSearch]                       = useState('');
  const [loading, setLoading]                     = useState(true);
  const [alertVisible, setAlertVisible]           = useState(false);
  const [alertMsg, setAlertMsg]                   = useState('');
  const [activeTab, setActiveTab]                 = useState<'customers' | 'products'>('customers');

  /* -------------------- ALERT -------------------- */

  const showAlert = useCallback((msg: string) => {
    setAlertMsg(msg);
    setAlertVisible(true);
  }, []);

  /* -------------------- CART HELPERS (same as RetailerHome) -------------------- */

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
      if (qty <= 0) removeFromCart(productId, variantId);
      else updateCartQuantity(productId, variantId, Math.min(qty, 999));
    },
    [removeFromCart, updateCartQuantity]
  );

  const handleRemoveVariant = useCallback(
    (productId: number, variantId: number) => removeFromCart(productId, variantId),
    [removeFromCart]
  );

  const handleAddSimple = useCallback(
    (productId: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product || product.stock === 0) return;
      addToCart({ productId, variantId: 0, price: product.price, quantity: 1, stock: product.stock });
      showAlert('Added to cart');
    },
    [products, addToCart, showAlert]
  );

  const handleUpdateSimpleQty = useCallback(
    (productId: number, qty: number) => {
      if (qty <= 0) removeFromCart(productId, 0);
      else updateCartQuantity(productId, 0, Math.min(qty, 999));
    },
    [removeFromCart, updateCartQuantity]
  );

  const handleRemoveSimple = useCallback(
    (productId: number) => removeFromCart(productId, 0),
    [removeFromCart]
  );

  /* -------------------- CART TOTALS -------------------- */

  const totalCartItems = useMemo(
    () => cart.reduce((s, c) => s + c.quantity, 0),
    [cart]
  );

  const cartTotalPrice = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.quantity, 0).toLocaleString('en-IN'),
    [cart]
  );

  /* -------------------- RETAILER SELECTION -------------------- */

  const handleSelectRetailer = async (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    await AsyncStorage.setItem('selectedRetailer', JSON.stringify(retailer));
    setActiveTab('products');
  };

  /* -------------------- SEARCH -------------------- */

  const handleRetailerSearch = (query: string) => {
    if (!query.trim()) return setFilteredRetailers(retailers);
    const lower = query.toLowerCase();
    setFilteredRetailers(retailers.filter(r =>
      r.name.toLowerCase().includes(lower) ||
      r.store_name.toLowerCase().includes(lower) ||
      r.phone.includes(lower) ||
      r.address.toLowerCase().includes(lower)
    ));
  };

  const handleProductSearch = useCallback((query: string) => {
    setSearch(query);
    const q = query.toLowerCase();
    setFilteredProducts(
      !query.trim() ? products : products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        (p.model ?? '').toLowerCase().includes(q) ||
        Object.values(p.attributes ?? {}).some(v => String(v).toLowerCase().includes(q))
      )
    );
  }, [products]);

  /* -------------------- FETCH DATA -------------------- */

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userData, token] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('token'),
        ]);
        if (cancelled) return;
        if (!userData || !token) { navigation.navigate('Login' as never); return; }

        const userObj = JSON.parse(userData);
        setUser(userObj);
        if (userObj.role !== 'staff') { navigation.navigate('RetailerHome' as never); return; }

        const [retData, prodData] = await Promise.all([
          cachedGet(`/staff/get_retailers_by_executive?executiveid=${userObj.id}`, token),
          cachedGet(`/products?dealerid=${userObj.dealer_id}`, token),
        ]);
        if (cancelled) return;

        setRetailers(retData);
        setFilteredRetailers(retData);

        // Same mapping as RetailerHome
        const formatted: Product[] = (prodData || []).map((item: any) => {
          let attrs: Record<string, string> = {};
          if (item.attributes) {
            attrs = typeof item.attributes === 'string'
              ? JSON.parse(item.attributes) : item.attributes;
          }
          return {
            id:               Number(item.id),
            name:             item.name || '',
            brand:            item.brand || attrs.brand || '',
            model:            item.model || attrs.model || '',
            price:            Number(item.price),
            stock:            Number(item.stock),
            description:      item.description || '',
            dealerid:         Number(item.dealerid),
            image:            item.image || null,
            attributes:       attrs,
            business_type_id: item.business_type_id ?? null,
            variants:         item.variants ?? [],
          };
        });

        setProducts(formatted);
        setFilteredProducts(formatted);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [navigation]);

  /* -------------------- RENDER ITEM -------------------- */

  const renderItem = useCallback(({ item }: { item: Product }) => (
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
  ), [cart, handleAddVariant, handleUpdateVariantQty, handleRemoveVariant,
      handleAddSimple, handleUpdateSimpleQty, handleRemoveSimple]);

  /* -------------------- MAIN RETURN -------------------- */

  return (
    <SafeAreaView style={{ flex: 1}} edges={['top']}>
      <Navbar user={user?.name} />

      {/* ---------- TOP TABS ---------- */}
      <View style={{
        backgroundColor: '#fff', padding: 12, margin: 12,
        borderRadius: 12, elevation: 3,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
        flexDirection: 'row',
      }}>
        {(['customers', 'products'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              backgroundColor: activeTab === tab ? '#e5e7eb' : 'transparent',
              paddingVertical: 8, paddingHorizontal: 14,
              borderRadius: 10, marginRight: tab === 'customers' ? 8 : 0,
            }}
          >
            <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
              {tab === 'customers' ? 'Customers' : 'Create Order'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ---------- CUSTOMERS TAB ---------- */}
      {activeTab === 'customers' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 100 }}>
          <Text style={{ fontSize: 22, fontWeight: '500', marginBottom: 8 }}>
            Select Customer
          </Text>

          <TextInput
            placeholder="Search customers..."
            style={{
              borderWidth: 0.5, borderColor: '#D1D5DB', borderRadius: 10,
              paddingHorizontal: 14, height: 42, backgroundColor: '#fff',
              marginBottom: 12,
            }}
            onChangeText={handleRetailerSearch}
          />

          <FlatList
            data={filteredRetailers}
            keyExtractor={(r) => r.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectRetailer(item)}
                style={{
                  backgroundColor: '#fff', padding: 14, marginBottom: 10,
                  borderRadius: 12, elevation: 2,
                  borderWidth: selectedRetailer?.id === item.id ? 2 : 0.5,
                  borderColor: selectedRetailer?.id === item.id ? '#3b82f6' : '#E5E7EB',
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontWeight: '600', fontSize: 15 }}>{item.store_name}</Text>
                    <Text style={{ color: '#6B7280', marginTop: 2 }}>
                      {item.name} · {item.phone}
                    </Text>
                    <Text style={{ color: '#9CA3AF', marginTop: 2, fontSize: 12 }}
                      numberOfLines={2}>
                      {item.address}
                    </Text>
                  </View>

                  <View style={{ justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => item.phone
                        ? Linking.openURL(`tel:${item.phone}`)
                        : showAlert('Phone not available')}
                      style={{
                        backgroundColor: '#3b82f6', padding: 8,
                        borderRadius: 50, marginBottom: 6,
                      }}
                    >
                      <Ionicons name="call" size={18} color="white" />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (!item.address) return showAlert('Address not available');
                        const url = Platform.select({
                          ios: `maps:0,0?q=${encodeURIComponent(item.address)}`,
                          android: `geo:0,0?q=${encodeURIComponent(item.address)}`,
                        });
                        if (url) Linking.openURL(url);
                      }}
                      style={{ backgroundColor: '#10b981', padding: 8, borderRadius: 50 }}
                    >
                      <Ionicons name="location" size={18} color="white" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </ScrollView>
      )}

      {/* ---------- PRODUCTS TAB ---------- */}
      {activeTab === 'products' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Selected customer banner / warning */}
          {selectedRetailer ? (
            <View style={{
              backgroundColor: '#EFF6FF', borderRadius: 10,
              padding: 10, marginBottom: 12, flexDirection: 'row',
              alignItems: 'center', borderWidth: 0.5, borderColor: '#BFDBFE',
            }}>
              <Ionicons name="storefront-outline" size={18} color="#3b82f6" />
              <Text style={{ marginLeft: 8, color: '#1D4ED8', fontWeight: '500', flex: 1 }}>
                {selectedRetailer.store_name}
              </Text>
              <Pressable onPress={() => setActiveTab('customers')}>
                <Text style={{ color: '#3b82f6', fontSize: 12 }}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{
              backgroundColor: '#FFFBEB', borderRadius: 10,
              padding: 10, marginBottom: 12, flexDirection: 'row',
              alignItems: 'center', borderWidth: 0.5, borderColor: '#FCD34D',
            }}>
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <Text style={{ marginLeft: 8, color: '#92400E', flex: 1, fontSize: 13 }}>
                Please select a customer first
              </Text>
              <Pressable onPress={() => setActiveTab('customers')}>
                <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '600' }}>
                  Go →
                </Text>
              </Pressable>
            </View>
          )}

          {/* Cart summary strip */}
          {totalCartItems > 0 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#EFF6FF', borderRadius: 10,
              padding: 10, marginBottom: 12,
              borderWidth: 0.5, borderColor: '#BFDBFE', gap: 8,
            }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '500' }}>
                  {totalCartItems}
                </Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: '#185FA5', fontWeight: '500' }}>
                {totalCartItems} item{totalCartItems !== 1 ? 's' : ''} in cart
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#185FA5' }}>
                ₹{cartTotalPrice}
              </Text>
            </View>
          )}

          {/* Search */}
          <TextInput
            placeholder="Search by name, brand, or model..."
            value={search}
            onChangeText={handleProductSearch}
            style={{
              borderWidth: 0.5, borderColor: '#D1D5DB', borderRadius: 10,
              paddingHorizontal: 14, height: 42, backgroundColor: '#fff',
              marginBottom: 14, fontSize: 14, color: '#111827',
            }}
            placeholderTextColor="#9CA3AF"
          />

          {loading ? (
            <ActivityIndicator size="large" color="#185FA5" style={{ marginTop: 40 }} />
          ) : filteredProducts.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 40 }}>
              No products found.
            </Text>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              scrollEnabled={false}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={10}
              removeClippedSubviews={true}
            />
          )}
        </ScrollView>
      )}

      <CustomAlert
        visible={alertVisible}
        message={alertMsg}
        onClose={() => setAlertVisible(false)}
      />

      <BottomTabNavigator />
    </SafeAreaView>
  );
}