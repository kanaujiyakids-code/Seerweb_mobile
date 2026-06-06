import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiUrl } from 'apiurl';
import BottomTabNavigator from 'components/BottomTabNavigator';
import CartLineItem from 'components/CartLineItem';
import GarmentCartGroupCard from 'components/GarmentCartGroupCard';
import Navbar from 'components/Navbar';
import OrderSummary from 'components/OrderSummary';
import { useCart } from '../context/CartContext';
import type { RootStackParamList } from '../types/navigation';
import {
  buildCartDisplayItems,
  buildCartRows,
  buildGarmentCartSummary,
  mapProductPayload,
  type CartDisplayItem,
  type CartProductDetail,
} from '../src/lib/cart';

interface Retailer {
  id: number;
  name: string;
  store_name: string;
  phone: string;
  address: string;
  city: string;
}

const BLUE = '#185FA5';
const RED = '#DC2626';

export default function StaffCartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, addToCart, updateCartQuantity, removeFromCart, clearCart } = useCart();
  const [productsById, setProductsById] = useState<Record<number, CartProductDetail>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{
    productId: number;
    variantIds: number[];
    name: string;
  } | null>(null);
  const [notes, setNotes] = useState('');

  const fetchProductDetails = useCallback(async (dealerId: number) => {
    try {
      const response = await fetch(`${apiUrl}/products?dealerid=${dealerId}`);
      const raw = await response.json();
      const list = (
        Array.isArray(raw?.products) ? raw.products : Array.isArray(raw) ? raw : []
      ).map(mapProductPayload);
      const nextMap: Record<number, CartProductDetail> = {};

      list.forEach((product: CartProductDetail) => {
        nextMap[product.id] = product;
      });

      setProductsById(nextMap);
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        const [userData, retailerData] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('selectedRetailer'),
        ]);

        if (!userData) return;

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
  }, [fetchProductDetails]);

  const cartRows = useMemo(() => buildCartRows(cart, productsById), [cart, productsById]);
  const cartDisplayItems = useMemo(
    () => buildCartDisplayItems(cartRows, productsById),
    [cartRows, productsById]
  );
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const isGarmentBusiness = Number(user?.business_type_id) === 2;
  const garmentSummary = useMemo(
    () => (isGarmentBusiness ? buildGarmentCartSummary(cartDisplayItems, totalPrice) : null),
    [cartDisplayItems, isGarmentBusiness, totalPrice]
  );

  useEffect(() => {
    const validProductIds = new Set(Object.keys(productsById).map(Number));
    const staleItems = cart.filter(
      (item) => Object.keys(productsById).length > 0 && !validProductIds.has(item.productId)
    );
    if (staleItems.length === 0) return;

    staleItems.forEach((item) => removeFromCart(item.productId, item.variantId));
  }, [cart, productsById, removeFromCart]);

  const handleIncrement = useCallback(
    (productId: number, variantId: number, currentQty: number) => {
      if (currentQty <= 0) {
        const product = productsById[productId];
        const variant = product?.variants?.find((entry) => Number(entry.id) === Number(variantId));
        if (!variant) return;
        const fallbackColor = String(product?.attributes?.color ?? product?.color ?? '').trim();
        const garmentMeta = {
          designNumber:
            String(product?.attributes?.design_number ?? product?.attributes?.designNumber ?? '').trim() ||
            undefined,
          fabricType:
            String(product?.attributes?.fabric_type ?? product?.attributes?.fabricType ?? '').trim() ||
            undefined,
          bookingType:
            String(product?.attributes?.booking_type ?? product?.attributes?.bookingType ?? '').trim() ||
            undefined,
          selectedColor: variant.color || fallbackColor || undefined,
          selectedSizes: Array.isArray(product?.attributes?.selected_sizes)
            ? product?.attributes?.selected_sizes.map((value: any) => String(value)).filter(Boolean)
            : [],
          productTags: Array.isArray(product?.attributes?.product_tags)
            ? product?.attributes?.product_tags.map((value: any) => String(value)).filter(Boolean)
            : [],
          galleryImages: Array.isArray(product?.attributes?.gallery_images)
            ? product?.attributes?.gallery_images.map((value: any) => String(value)).filter(Boolean)
            : [],
        };

        addToCart({
          productId,
          variantId,
          size: variant.size,
          color: variant.color,
          price: Number(variant.rate ?? variant.mrp ?? product?.price ?? 0),
          quantity: 1,
          stock: Number(variant.qty ?? 0),
          brand: product?.brand,
          model: product?.model,
          image: product?.image ?? null,
          productName: product?.name,
          businessTypeId: product?.business_type_id ?? null,
          attributes: product?.attributes ?? {},
          garmentMeta,
        });
        return;
      }

      updateCartQuantity(productId, variantId, currentQty + 1);
    },
    [addToCart, productsById, updateCartQuantity]
  );

  const handleDecrement = useCallback(
    (productId: number, variantId: number, currentQty: number) => {
      if (currentQty <= 1) removeFromCart(productId, variantId);
      else updateCartQuantity(productId, variantId, currentQty - 1);
    },
    [removeFromCart, updateCartQuantity]
  );

  const handleSubmitOrder = async () => {
    if (!user || cart.length === 0) return;

    if (!selectedRetailer) return;

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const orderItems = cart.map((item) => {
        const product = productsById[item.productId];
        const variant =
          item.variantId !== 0
            ? product?.variants?.find((entry) => Number(entry.id) === Number(item.variantId))
            : undefined;
        const garmentMeta = item.garmentMeta ?? undefined;

        return {
          productId: item.productId,
          ...(item.variantId !== 0 ? { variantId: item.variantId } : {}),
          size: item.size ?? variant?.size,
          color: item.color ?? variant?.color,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          rack: '',
          attributes_snapshot: {
            ...(item.attributes ?? {}),
            brand: item.brand || product?.brand || '',
            model: item.model || product?.model || '',
            business_type_id: product?.business_type_id ?? item.businessTypeId ?? null,
            color: item.color ?? variant?.color ?? garmentMeta?.selectedColor ?? '',
            design_number: garmentMeta?.designNumber ?? '',
            fabric_type: garmentMeta?.fabricType ?? '',
            booking_type: garmentMeta?.bookingType ?? '',
            garment_meta: garmentMeta,
            selected_sizes: garmentMeta?.selectedSizes ?? [],
            product_tags: garmentMeta?.productTags ?? [],
            gallery_images: garmentMeta?.galleryImages ?? [],
            set_quantity: item.setQuantity ?? 0,
          },
        };
      });

      const orderPayload = {
        retailerId: selectedRetailer.id,
        retailerName: selectedRetailer.store_name,
        dealerId: user.dealer_id,
        total: isGarmentBusiness ? (garmentSummary?.finalAmount ?? totalPrice) : totalPrice,
        notes,
        order_by: user.role,
        order_by_id: user.id,
        items: orderItems,
      };

      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('Order failed:', response.status, body);
        throw new Error('Failed to submit order');
      }

      clearCart();
      setConfirmModalVisible(false);
      setNotes('');
      navigation.replace('StaffOrderScreen');
    } catch (error) {
      console.error('Order submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Navbar user={user?.name} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Your Cart</Text>
        <Text style={styles.pageSubtitle}>Review the customer order before submitting it.</Text>

        {selectedRetailer ? (
          <View style={styles.retailerBanner}>
            <View style={styles.retailerIconWrap}>
              <Feather name="user" size={15} color={BLUE} />
            </View>
            <Text style={styles.retailerName} numberOfLines={1}>
              {selectedRetailer.store_name}
            </Text>
            <View style={styles.retailerBadge}>
              <Text style={styles.retailerBadgeText}>Customer</Text>
            </View>
          </View>
        ) : (
          <View style={styles.warningBanner}>
            <Feather name="alert-triangle" size={16} color="#B45309" />
            <Text style={styles.warningText}>Select a customer before submitting the order.</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={styles.loader} />
        ) : cartDisplayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="shopping-cart" size={36} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Go to the customer products tab and add items to continue.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.countStrip}>
              <Text style={styles.countText}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
              </Text>
              <Text style={styles.countPrice}>
                ₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {cartDisplayItems.map((item: CartDisplayItem) =>
              item.kind === 'garment-group' ? (
                <GarmentCartGroupCard
                  key={item.key}
                  group={item}
                  onDecrementSize={(variantId, currentQty) =>
                    handleDecrement(item.productId, variantId, currentQty)
                  }
                  onIncrementSize={(variantId, currentQty) =>
                    handleIncrement(item.productId, variantId, currentQty)
                  }
                  onRemoveSize={(variantId) => {
                    const sizeItem = item.sizes.find((entry) => entry.variantId === variantId);
                    setPendingRemove({
                      productId: item.productId,
                      variantIds: [variantId],
                      name: `${item.name}${sizeItem ? ` (${sizeItem.sizeLabel})` : ''}`,
                    });
                    setRemoveModalVisible(true);
                  }}
                  onRemoveProduct={() => {
                    setPendingRemove({
                      productId: item.productId,
                      variantIds: item.sizes.map((size) => size.variantId),
                      name: item.name,
                    });
                    setRemoveModalVisible(true);
                  }}
                />
              ) : (
                <CartLineItem
                  key={item.key}
                  row={item}
                  onDecrement={() => handleDecrement(item.productId, item.variantId, item.quantity)}
                  onIncrement={() => handleIncrement(item.productId, item.variantId, item.quantity)}
                  onRemove={() => {
                    setPendingRemove({
                      productId: item.productId,
                      variantIds: [item.variantId],
                      name: item.name,
                    });
                    setRemoveModalVisible(true);
                  }}
                />
              )
            )}

            <OrderSummary
              totalItems={totalItems}
              totalPrice={totalPrice}
              customerName={selectedRetailer?.store_name || selectedRetailer?.name}
              checkoutLabel={selectedRetailer ? 'Checkout' : 'Select Customer First'}
              disabled={!selectedRetailer}
              helperText={!selectedRetailer ? 'Select a customer to proceed' : null}
              summaryRows={
                isGarmentBusiness && garmentSummary
                  ? [
                      { label: 'Products', value: String(garmentSummary.productCount) },
                      { label: 'Total Pieces', value: String(garmentSummary.totalPieces) },
                      { label: 'Total Sets', value: String(garmentSummary.totalSets) },
                      {
                        label: 'GST',
                        value: `₹${garmentSummary.gst.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                      },
                    ]
                  : undefined
              }
              totalLabel={isGarmentBusiness ? 'Grand Total' : 'Total'}
              totalAmount={isGarmentBusiness ? garmentSummary?.finalAmount : totalPrice}
              onCheckout={() => setConfirmModalVisible(true)}
            />
          </>
        )}
      </ScrollView>

      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Feather name="shopping-bag" size={24} color={BLUE} />
            </View>
            <Text style={styles.modalTitle}>Confirm Order</Text>
            <Text style={styles.modalSubtitle}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} · ₹
              {(isGarmentBusiness ? garmentSummary?.finalAmount ?? totalPrice : totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            {selectedRetailer ? (
              <Text style={styles.modalRetailer}>For: {selectedRetailer.store_name}</Text>
            ) : null}

            <View style={styles.modalList}>
              {cartDisplayItems.map((item) => (
                <View key={item.key} style={styles.modalListRow}>
                  <Text style={styles.modalListLabel} numberOfLines={1}>
                    {item.name}
                    {'quantity' in item ? ` ×${item.quantity}` : ` ×${item.totalQuantity}`}
                  </Text>
                  <Text style={styles.modalListValue}>
                    ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}
            </View>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any special instructions..."
              placeholderTextColor="#9CA3AF"
              multiline
              style={styles.notesInput}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setConfirmModalVisible(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitOrder}
                disabled={isSubmitting}
                style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={removeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, styles.modalIconRed]}>
              <Feather name="trash-2" size={24} color={RED} />
            </View>
            <Text style={styles.modalTitle}>Remove Item?</Text>
            <Text style={styles.modalSubtitle}>{pendingRemove?.name}</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setRemoveModalVisible(false);
                  setPendingRemove(null);
                }}
                style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  pendingRemove?.variantIds.forEach((variantId) =>
                    removeFromCart(pendingRemove.productId, variantId)
                  );
                  setRemoveModalVisible(false);
                  setPendingRemove(null);
                }}
                style={[styles.primaryBtn, styles.removeBtn]}>
                <Text style={styles.primaryBtnText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
    color: '#6B7280',
  },
  retailerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  retailerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retailerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  retailerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },
  retailerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 10,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#92400E',
  },
  loader: {
    marginTop: 60,
  },
  countStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  countPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginBottom: 14,
  },
  modalIconRed: {
    backgroundColor: '#FEF2F2',
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  modalRetailer: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
  modalList: {
    width: '100%',
    marginTop: 16,
    maxHeight: 180,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  modalListLabel: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  modalListValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  notesInput: {
    width: '100%',
    marginTop: 14,
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: BLUE,
    paddingVertical: 12,
    alignItems: 'center',
  },
  removeBtn: {
    backgroundColor: RED,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
