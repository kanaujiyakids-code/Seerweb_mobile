import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { MinusCircle, PlusCircle } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import OrderSummary from 'components/OrderSummary';
import Navbar from 'components/Navbar';
import { apiUrl } from 'apiurl';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';

interface ProductDetail {
  id: number;
  name: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  variants?: any[];
}

interface Retailer {
  id: number;
  name: string;
  store_name: string;
  phone: string;
  address: string;
  city: string;
}

export default function StaffCartScreen() {
  const { cart, updateCartQuantity, removeFromCart, clearCart } = useCart();
  const [productDetails, setProductDetails] = useState<Record<number, ProductDetail>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{
    productId: number; variantId: number; name: string;
  } | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const boot = async () => {
      try {
        const [userData, retailerData] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('selectedRetailer'),
        ]);
        if (!userData) { setLoading(false); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        if (retailerData) setSelectedRetailer(JSON.parse(retailerData));
        await fetchProductDetails(parsedUser.dealer_id);
      } catch (error) {
        console.error('StaffCartScreen boot error:', error);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const fetchProductDetails = async (dealerId: number) => {
    try {
      const res = await fetch(`${apiUrl}/products?dealerid=${dealerId}`);
      const raw = await res.json();
      const list: ProductDetail[] = Array.isArray(raw) ? raw : Array.isArray(raw?.products) ? raw.products : [];
      const map: Record<number, ProductDetail> = {};
      list.forEach((p) => { map[Number(p.id)] = p; });
      setProductDetails(map);
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  };

  const cartRows = useMemo(() => {
    return cart.map((item) => {
      const detail = productDetails[item.productId];
      const variantLabel = item.size || item.color
        ? [item.size, item.color].filter(Boolean).join(' / ') : null;
      return {
        key: `${item.productId}-${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId,
        name: detail?.name ?? `Product #${item.productId}`,
        brand: detail?.brand ?? '',
        model: detail?.model ?? '',
        variantLabel,
        price: item.price,
        quantity: item.quantity,
      };
    });
  }, [cart, productDetails]);

  const totalItems = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);

  const handleIncrement = useCallback((productId: number, variantId: number, currentQty: number) => {
    updateCartQuantity(productId, variantId, Math.min(currentQty + 1, 999));
  }, [updateCartQuantity]);

  const handleDecrement = useCallback((productId: number, variantId: number, currentQty: number) => {
    if (currentQty <= 1) removeFromCart(productId, variantId);
    else updateCartQuantity(productId, variantId, currentQty - 1);
  }, [updateCartQuantity, removeFromCart]);

  const handleRemoveConfirm = useCallback((productId: number, variantId: number, name: string) => {
    setPendingRemove({ productId, variantId, name });
    setRemoveModalVisible(true);
  }, []);

  const confirmRemove = useCallback(() => {
    if (pendingRemove) removeFromCart(pendingRemove.productId, pendingRemove.variantId);
    setRemoveModalVisible(false);
    setPendingRemove(null);
  }, [pendingRemove, removeFromCart]);

  const cancelRemove = useCallback(() => {
    setRemoveModalVisible(false);
    setPendingRemove(null);
  }, []);

  const handleSubmitOrder = async () => {
    if (!user || cart.length === 0) return;
    if (!selectedRetailer) {
      Alert.alert('Select customer', 'Choose a customer before submitting the order.');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const orderPayload = {
        retailerId: selectedRetailer?.id,
        retailerName: selectedRetailer?.store_name,
        dealerId: user.dealer_id,
        total: totalPrice,
        notes: '',
        order_by: user.role,
        order_by_id: user.id,
        items: cart.map((c) => ({
          productId: c.productId,
          ...(c.variantId !== 0 ? { variantId: c.variantId } : {}),
          quantity: c.quantity,
          price: c.price,
        })),
      };
      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('Order failed:', res.status, body);
        throw new Error('Failed to submit order');
      }
      clearCart();
      setIsModalVisible(false);
      Alert.alert('Success', 'Order submitted successfully!');
      navigation.replace('StaffOrderScreen');
    } catch (error) {
      console.error('Order submission error:', error);
      Alert.alert('Error', 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Navbar user={user?.name} />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          Your Cart
        </Text>

        {/* Selected retailer banner */}
        {selectedRetailer && (
          <View style={{
            backgroundColor: '#eff6ff', borderRadius: 12,
            padding: 12, marginBottom: 16,
            flexDirection: 'row', alignItems: 'center',
            borderWidth: 0.5, borderColor: '#bfdbfe',
          }}>
            <Feather name="user" size={16} color="#3b82f6" />
            <Text style={{ marginLeft: 8, color: '#1d4ed8', fontWeight: '500', flex: 1 }}>
              {selectedRetailer.store_name}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#5b74f1" style={{ marginTop: 40 }} />
        ) : cart.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
            <Feather name="shopping-cart" size={52} color="#d1d5db" />
            <Text style={{ textAlign: 'center', color: '#9ca3af', marginTop: 16, fontSize: 16 }}>
              Your cart is empty.
            </Text>
            <Text style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 4 }}>
              Go to Customers tab to add products.
            </Text>
          </View>
        ) : (
          <>
            {cartRows.map((row) => (
              <View key={row.key} style={{
                backgroundColor: '#fff', padding: 16, marginBottom: 16,
                borderRadius: 14,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{row.name}</Text>

                {(row.brand || row.model) && (
                  <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 2 }}>
                    {[row.brand, row.model].filter(Boolean).join(' | ')}
                  </Text>
                )}

                {row.variantLabel && (
                  <Text style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>
                    {row.variantLabel}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: 'bold' }}>
                    ₹ {row.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => handleDecrement(row.productId, row.variantId, row.quantity)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MinusCircle size={26} color="#ef4444" />
                    </Pressable>
                    <Text style={{ marginHorizontal: 16, fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 20, textAlign: 'center' }}>
                      {row.quantity}
                    </Text>
                    <Pressable
                      onPress={() => handleIncrement(row.productId, row.variantId, row.quantity)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <PlusCircle size={26} color="#10b981" />
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveConfirm(row.productId, row.variantId, row.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={22} color="#ef4444" />
                  </Pressable>
                </View>

                <Text style={{ textAlign: 'right', fontSize: 13, marginTop: 8, color: '#4b5563', fontWeight: '500' }}>
                  Subtotal: ₹ {(row.price * row.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}

            <OrderSummary
              totalItems={totalItems}
              totalPrice={totalPrice}
              onCheckout={() => setIsModalVisible(true)}
            />
          </>
        )}
      </ScrollView>

      {/* Confirm Order Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: '#fff', padding: 24, borderRadius: 16, width: 320,
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: '#111827' }}>
              Confirm Order
            </Text>
            <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 14, marginBottom: 20 }}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} · ₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: '#1f2937', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitOrder}
                disabled={isSubmitting}
                style={{ backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {isSubmitting ? 'Submitting…' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Item Modal */}
      <Modal visible={removeModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: '#fff', padding: 24, borderRadius: 16, width: 320,
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: '#111827' }}>
              Remove Item
            </Text>
            <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 14, marginBottom: 20 }}>
              Remove "{pendingRemove?.name}" from cart?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                onPress={cancelRemove}
                style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: '#1f2937', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemove}
                style={{ backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}