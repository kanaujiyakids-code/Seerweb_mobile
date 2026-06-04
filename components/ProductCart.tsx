import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiUrl } from 'apiurl';

export interface ProductVariant {
  id: number;
  size?: string;
  color?: string;
  rate?: number;
  mrp?: number;
  qty: number;
}

export interface Product {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  price: number;
  color?: string;
  stock: number;
  description?: string;
  dealerid: number;
  image?: string | null;
  attributes?: Record<string, string>;
  business_type_id?: number | null;
  variants?: ProductVariant[];
}

export interface CartItem {
  productId: number;
  variantId: number;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  stock: number;
}

interface ProductCartProps {
  product: Product;
  showSize?: boolean;
  cart: CartItem[];
  onAddVariant: (productId: number, variant: ProductVariant, qty: number) => void;
  onUpdateVariantQty: (productId: number, variantId: number, qty: number) => void;
  onRemoveVariant: (productId: number, variantId: number) => void;
  onAddSimple: (productId: number) => void;
  onUpdateSimpleQty: (productId: number, qty: number) => void;
  onRemoveSimple: (productId: number) => void;
}

const BLUE = '#0F172A';
const NAVY = '#111827';
const GOLD = '#F59E0B';
const BORDER = '#E2E8F0';

const getImageUri = (img: string | null | undefined): string | null => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${apiUrl}/${img}`;
};

const resolveColor = (product: Product): string => {
  const direct = String(product.color ?? '').trim();
  if (direct && direct !== 'null' && direct !== 'undefined') return direct;

  const attrColor = String(product.attributes?.color ?? '').trim();
  if (attrColor && attrColor !== 'null' && attrColor !== 'undefined') return attrColor;

  return '';
};

const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

function sortVariantSizes(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((left, right) => {
    const leftSize = String(left.size ?? '').toUpperCase();
    const rightSize = String(right.size ?? '').toUpperCase();
    const leftIndex = sizeOrder.indexOf(leftSize);
    const rightIndex = sizeOrder.indexOf(rightSize);
    const safeLeft = leftIndex >= 0 ? leftIndex : sizeOrder.length + leftSize.charCodeAt(0);
    const safeRight = rightIndex >= 0 ? rightIndex : sizeOrder.length + rightSize.charCodeAt(0);
    return safeLeft - safeRight;
  });
}

export default function ProductCart({
  product,
  showSize = false,
  cart,
  onAddVariant,
  onUpdateVariantQty,
  onAddSimple,
  onUpdateSimpleQty,
}: ProductCartProps) {
  const [imgError, setImgError] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [pendingSetQty, setPendingSetQty] = useState('1');
  const [pieceQuantities, setPieceQuantities] = useState<Record<number, string>>({});

  const variants = useMemo(() => sortVariantSizes(product.variants ?? []), [product.variants]);
  const imageUri = getImageUri(product.image);
  const productColor = resolveColor(product);
  const hasVariants = variants.length > 0;
  const isGarmentProduct = Number(product.business_type_id) === 2 && hasVariants;
  const isMobileVariantProduct = !isGarmentProduct && hasVariants;

  useEffect(() => {
    if (!isGarmentProduct) return;

    setPieceQuantities((current) => {
      const nextState: Record<number, string> = {};
      variants.forEach((variant) => {
        nextState[variant.id] = current[variant.id] ?? '';
      });
      return nextState;
    });
  }, [isGarmentProduct, variants]);

  const getCartVariant = (variantId: number): CartItem | undefined =>
    cart.find((entry) => entry.productId === product.id && entry.variantId === variantId);

  const getCartSimple = (): CartItem | undefined =>
    cart.find((entry) => entry.productId === product.id && entry.variantId === 0);

  const totalInCart = cart
    .filter((entry) => entry.productId === product.id)
    .reduce((sum, entry) => sum + entry.quantity, 0);

  const setSummary = variants
    .map((variant) => variant.size || 'NA')
    .join(' + ');

  const handleAddSelectedSize = () => {
    if (!selectedVariantId) return;
    const variant = variants.find((entry) => entry.id === selectedVariantId);
    if (!variant) return;
    onAddVariant(product.id, variant, 1);
  };

  const handlePieceQtyChange = (variantId: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setPieceQuantities((current) => ({
      ...current,
      [variantId]: sanitized,
    }));
  };

  const selectedPieceEntries = useMemo(
    () =>
      variants
        .map((variant) => {
          const rawQuantity = parseInt(pieceQuantities[variant.id] ?? '', 10);
          const quantity = Number.isNaN(rawQuantity) ? 0 : rawQuantity;
          return quantity > 0 ? { variant, quantity } : null;
        })
        .filter(Boolean) as { variant: ProductVariant; quantity: number }[],
    [pieceQuantities, variants]
  );

  const selectedPieceCount = selectedPieceEntries.reduce((sum, entry) => sum + entry.quantity, 0);

  const handleAddSelectedSizes = () => {
    if (selectedPieceEntries.length === 0) return;

    selectedPieceEntries.forEach(({ variant, quantity }) => {
      onAddVariant(product.id, variant, quantity);
    });

    setPieceQuantities((current) =>
      Object.keys(current).reduce<Record<number, string>>((acc, key) => {
        acc[Number(key)] = '';
        return acc;
      }, {})
    );
  };

  const handleAddSet = () => {
    const count = parseInt(pendingSetQty, 10);
    if (Number.isNaN(count) || count <= 0) return;

    variants.forEach((variant) => {
      onAddVariant(product.id, variant, count);
    });

    setPendingSetQty('1');
  };

  const cartSimple = getCartSimple();

  return (
    <View style={[styles.card, totalInCart > 0 && styles.cardActive]}>
      <View style={styles.imageShell}>
        {imageUri && !imgError ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" onError={() => setImgError(true)} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productCode}>
              {product.attributes?.design || product.model || 'DESIGN PENDING'}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {product.name}
            </Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>MRP</Text>
            <Text style={styles.priceValue}>{formatINR(product.price)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>Ready to Order</Text>
          </View>
          {(product.attributes?.fabric || product.attributes?.material || product.brand) ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {product.attributes?.fabric || product.attributes?.material || product.brand}
              </Text>
            </View>
          ) : null}
        </View>

        {productColor ? (
          <>
            <Text style={styles.sectionLabel}>Colors</Text>
            <View style={styles.colorWrap}>
              <View style={styles.activeColorPill}>
                <Text style={styles.activeColorText}>{productColor}</Text>
              </View>
            </View>
          </>
        ) : null}

        {isGarmentProduct ? (
          <>
            {showSize ? <Text style={styles.sectionLabel}>Sizes</Text> : null}
            <View style={styles.sizesWrap}>
              {variants.map((variant) => {
                const inCart = getCartVariant(variant.id)?.quantity ?? 0;

                return (
                  <View
                    key={variant.id}
                    style={[
                      styles.sizePill,
                      styles.sizePillStatic,
                    ]}
                  >
                    <Text
                      style={styles.sizePillText}
                    >
                      {variant.size || 'NA'}
                    </Text>
                    {inCart > 0 ? <Text style={styles.sizeCount}>{inCart}</Text> : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.pieceCard}>
              <View style={styles.pieceHeader}>
                <Text style={styles.pieceHeading}>Piece-Wise Ordering</Text>
                <Text style={styles.pieceHint}>Enter qty per size</Text>
              </View>

              <View style={styles.pieceGrid}>
                {variants.map((variant) => (
                  <View key={variant.id} style={styles.pieceRow}>
                    <View style={styles.pieceSizeChip}>
                      <Text style={styles.pieceSizeChipText}>{variant.size || 'NA'}</Text>
                    </View>
                    <TextInput
                      value={pieceQuantities[variant.id] ?? ''}
                      onChangeText={(value) => handlePieceQtyChange(variant.id, value)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      style={styles.pieceInput}
                    />
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleAddSelectedSizes}
                disabled={selectedPieceEntries.length === 0}
                style={[
                  styles.addToCartBtn,
                  styles.pieceAddButton,
                  selectedPieceEntries.length === 0 && styles.addToCartBtnDisabled,
                ]}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addToCartText}>
                  {selectedPieceCount > 0 ? `Add ${selectedPieceCount} Pc${selectedPieceCount > 1 ? 's' : ''} To Cart` : 'Add To Cart'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.setCard}>
              <View style={styles.setRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.setHeading}>Set Ordering</Text>
                  <Text style={styles.setSubtitle}>1 set = {setSummary}</Text>
                </View>
                <TextInput
                  value={pendingSetQty}
                  onChangeText={setPendingSetQty}
                  keyboardType="number-pad"
                  style={styles.setInput}
                />
              </View>
              <Pressable
                onPress={handleAddSet}
                style={styles.setButton}
              >
                <Feather name="shopping-bag" size={16} color="#FFFFFF" />
                <Text style={styles.setButtonText}>Add Sets To Cart</Text>
              </Pressable>
            </View>
          </>
        ) : isMobileVariantProduct ? (
          <>
            {showSize ? <Text style={styles.sectionLabel}>Sizes</Text> : null}
            <View style={styles.sizesWrap}>
              {variants.map((variant) => {
                const inCart = getCartVariant(variant.id)?.quantity ?? 0;
                const isSelected = selectedVariantId === variant.id;

                return (
                  <Pressable
                  key={variant.id}
                  onPress={() => setSelectedVariantId(variant.id)}
                  style={[
                    styles.sizePill,
                    isSelected && styles.sizePillSelected,
                  ]}
                >
                    <Text
                      style={[
                        styles.sizePillText,
                        isSelected && styles.sizePillTextSelected,
                      ]}
                    >
                      {variant.size || 'NA'}
                    </Text>
                    {inCart > 0 ? <Text style={styles.sizeCount}>{inCart}</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.setCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.setHeading}>Set Ordering</Text>
                <Text style={styles.setSubtitle}>1 set = {setSummary}</Text>
              </View>
              <TextInput
                value={pendingSetQty}
                onChangeText={setPendingSetQty}
                keyboardType="number-pad"
                style={styles.setInput}
              />
              <Pressable
                onPress={handleAddSet}
                style={styles.setButton}
              >
                <Feather name="shopping-bag" size={16} color="#FFFFFF" />
                <Text style={styles.setButtonText}>Add Sets To Cart</Text>
              </Pressable>
            </View>

            <View style={styles.bottomActions}>
              <Pressable
                onPress={handleAddSelectedSize}
                disabled={!selectedVariantId}
                style={[styles.addToCartBtn, !selectedVariantId && styles.addToCartBtnDisabled]}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addToCartText}>Add To Cart</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.simpleRow}>
            <View>
              <Text style={styles.simplePrice}>{formatINR(product.price)}</Text>
              <Text style={styles.simpleStock}>Flexible quantity ordering</Text>
            </View>
            {cartSimple ? (
              <View style={styles.simpleStepper}>
                <Pressable onPress={() => onUpdateSimpleQty(product.id, cartSimple.quantity - 1)} style={styles.simpleStepBtn}>
                  <Feather name="minus" size={16} color={NAVY} />
                </Pressable>
                <Text style={styles.simpleStepQty}>{cartSimple.quantity}</Text>
                <Pressable
                  onPress={() => onUpdateSimpleQty(product.id, cartSimple.quantity + 1)}
                  style={styles.simpleStepBtn}
                >
                  <Feather name="plus" size={16} color={NAVY} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => onAddSimple(product.id)}
                style={styles.addToCartBtn}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addToCartText}>Add To Cart</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardActive: {
    borderColor: '#BFDBFE',
  },
  imageShell: {
    height: 210,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 230,
    height: 210,
  },
  imagePlaceholder: {
    width: 230,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  body: {
    padding: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  productCode: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#B45309',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '800',
    color: BLUE,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: BLUE,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metaChipText: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  colorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeColorPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: NAVY,
  },
  activeColorText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sizesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizePill: {
    minWidth: 44,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  sizePillStatic: {
    backgroundColor: '#FFFFFF',
  },
  sizePillSelected: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  sizePillDisabled: {
    opacity: 0.35,
  },
  sizePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sizePillTextSelected: {
    color: '#FFFFFF',
  },
  sizePillTextDisabled: {
    color: '#94A3B8',
  },
  sizeCount: {
    position: 'absolute',
    right: 2,
    top: 1,
    fontSize: 9,
    color: GOLD,
    fontWeight: '800',
  },
  pieceCard: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  pieceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pieceHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  pieceHint: {
    fontSize: 12,
    color: '#64748B',
  },
  pieceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  pieceRow: {
    width: '47%',
    minWidth: 135,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pieceSizeChip: {
    minWidth: 52,
    height: 38,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pieceSizeChipDisabled: {
    backgroundColor: '#CBD5E1',
  },
  pieceSizeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pieceInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 16,
    color: BLUE,
  },
  pieceInputDisabled: {
    backgroundColor: '#E2E8F0',
    color: '#94A3B8',
  },
  pieceAddButton: {
    marginTop: 16,
  },
  setCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
    borderRadius: 24,
    backgroundColor: '#FFFBEB',
    padding: 14,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  setSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  setInput: {
    height: 48,
    width: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 16,
    color: BLUE,
  },
  setButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  setButtonDisabled: {
    opacity: 0.45,
  },
  setButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomActions: {
    marginTop: 18,
  },
  addToCartBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addToCartBtnDisabled: {
    opacity: 0.45,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  simpleRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  simplePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE,
  },
  simpleStock: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  simpleStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  simpleStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  simpleStepQty: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
});
