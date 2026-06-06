import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiUrl } from 'apiurl';
import BottomTabNavigator from 'components/BottomTabNavigator';
import CartLineItem from 'components/CartLineItem';
import CustomAlert from 'components/CustomAlert';
import GarmentCartGroupCard from 'components/GarmentCartGroupCard';
import Navbar from 'components/Navbar';
import OrderSummary from 'components/OrderSummary';
import { useCart } from '../context/CartContext';
import {
  buildCartDisplayItems,
  buildCartRows,
  buildGarmentCartSummary,
  mapProductPayload,
  type CartDisplayItem,
  type CartProductDetail,
} from '../src/lib/cart';
import { cachedGet } from '../src/lib/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const BLUE = '#185FA5';

export default function CartScreen() {
  const { cart, addToCart, updateCartQuantity, removeFromCart, clearCart } = useCart();
  const [productsById, setProductsById] = useState<Record<number, CartProductDetail>>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [removeModal, setRemoveModal] = useState(false);
  const [removeItem, setRemoveItem] = useState<{
    productId: number;
    variantIds: number[];
    name: string;
  } | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [notes, setNotes] = useState('');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const scaleValue = useState(new Animated.Value(1))[0];

  const showAlert = useCallback((message: string) => {
    setAlertMsg(message);
    setAlertVisible(true);
  }, []);

  const fetchProducts = useCallback(async (dealerId: number) => {
    try {
      const token = (await AsyncStorage.getItem('token')) ?? undefined;
      const data = await cachedGet(`/products?dealerid=${dealerId}`, token);
      const list = (data.products || data).map(mapProductPayload);
      const nextMap: Record<number, CartProductDetail> = {};

      list.forEach((product: CartProductDetail) => {
        nextMap[product.id] = product;
      });

      setProductsById(nextMap);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (!userStr) return;
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        await fetchProducts(parsedUser.dealer_id);
      } catch (error) {
        console.error('CartScreen boot error:', error);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [fetchProducts]);

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

  const increment = useCallback(
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

  const decrement = useCallback(
    (productId: number, variantId: number, currentQty: number) => {
      if (currentQty <= 1) removeFromCart(productId, variantId);
      else updateCartQuantity(productId, variantId, currentQty - 1);
    },
    [removeFromCart, updateCartQuantity]
  );

  const submitOrder = async () => {
    if (!user || totalItems === 0) return;
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

      const payload = {
        retailerId: user.id,
        retailerName: user.name,
        dealerId: user.dealer_id,
        total: totalPrice,
        notes,
        order_by: user?.role,
        order_by_id: user?.id,
        items: orderItems,
      };

      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Order failed');

      clearCart();
      setConfirmModal(false);
      setNotes('');
      showAlert('Order placed successfully!');
    } catch (error) {
      console.error('Order submission error:', error);
      showAlert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCartEmpty = cartDisplayItems.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Navbar user={user?.name} />

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <Text style={styles.pageTitle}>Your Cart</Text>
        <Text style={styles.pageSubtitle}>Review your items and confirm the order.</Text>

        {loading && isCartEmpty ? (
          <ActivityIndicator size="large" color={BLUE} style={styles.loader} />
        ) : isCartEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="shopping-cart" size={36} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add products from the catalog to place an order.
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
                  onImagePress={(imageUri) => {
                    setSelectedImageUri(imageUri);
                    setImageModalVisible(true);
                    scaleValue.setValue(1);
                  }}
                  onDecrementSize={(variantId, currentQty) =>
                    decrement(item.productId, variantId, currentQty)
                  }
                  onIncrementSize={(variantId, currentQty) =>
                    increment(item.productId, variantId, currentQty)
                  }
                  onRemoveSize={(variantId) => {
                    const sizeItem = item.sizes.find((entry) => entry.variantId === variantId);
                    setRemoveItem({
                      productId: item.productId,
                      variantIds: [variantId],
                      name: `${item.name}${sizeItem ? ` (${sizeItem.sizeLabel})` : ''}`,
                    });
                    setRemoveModal(true);
                  }}
                  onRemoveProduct={() => {
                    setRemoveItem({
                      productId: item.productId,
                      variantIds: item.sizes.map((size) => size.variantId),
                      name: item.name,
                    });
                    setRemoveModal(true);
                  }}
                />
              ) : (
                <CartLineItem
                  key={item.key}
                  row={item}
                  onImagePress={(imageUri) => {
                    setSelectedImageUri(imageUri);
                    setImageModalVisible(true);
                    scaleValue.setValue(1);
                  }}
                  onDecrement={() => decrement(item.productId, item.variantId, item.quantity)}
                  onIncrement={() => increment(item.productId, item.variantId, item.quantity)}
                  onRemove={() => {
                    setRemoveItem({
                      productId: item.productId,
                      variantIds: [item.variantId],
                      name: item.name,
                    });
                    setRemoveModal(true);
                  }}
                />
              )
            )}

            <OrderSummary
              totalItems={totalItems}
              totalPrice={totalPrice}
              onCheckout={() => setConfirmModal(true)}
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
            />
          </>
        )}
      </ScrollView>

      <Modal transparent visible={confirmModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Order</Text>
            <Text style={styles.modalSubtitle}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} · ₹
              {(isGarmentBusiness ? garmentSummary?.finalAmount ?? totalPrice : totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>

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
              <Pressable onPress={() => setConfirmModal(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitOrder} disabled={isSubmitting} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={removeModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove item?</Text>
            <Text style={styles.modalSubtitle}>{removeItem?.name}</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setRemoveModal(false);
                  setRemoveItem(null);
                }}
                style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  removeItem?.variantIds.forEach((variantId) =>
                    removeFromCart(removeItem.productId, variantId)
                  );
                  setRemoveModal(false);
                  setRemoveItem(null);
                }}
                style={[styles.primaryBtn, styles.removeBtn]}>
                <Text style={styles.primaryBtnText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setImageModalVisible(false);
          setSelectedImageUri(null);
        }}>
        <View style={styles.imageModal}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setImageModalVisible(false);
              setSelectedImageUri(null);
            }}
          />
          <PinchGestureHandler
            onGestureEvent={Animated.event([{ nativeEvent: { scale: scaleValue } }], {
              useNativeDriver: true,
            })}>
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <Image
                source={{ uri: selectedImageUri || '' }}
                resizeMode="contain"
                style={{ width: screenWidth * 0.9, height: screenHeight * 0.7 }}
              />
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </Modal>

      <CustomAlert
        visible={alertVisible}
        message={alertMsg}
        onClose={() => setAlertVisible(false)}
      />
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
  modalList: {
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
    backgroundColor: '#DC2626',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
