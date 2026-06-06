import React, { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiUrl } from 'apiurl';
import { useCart } from '../context/CartContext';

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
  attributes?: Record<string, any>;
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
  setQuantity?: number;
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
const BORDER = '#E2E8F0';
const GOLD = '#F59E0B';

const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

function sortVariants(variants: ProductVariant[]) {
  return [...variants].sort((left, right) => {
    const leftSize = String(left.size ?? '').trim().toUpperCase();
    const rightSize = String(right.size ?? '').trim().toUpperCase();
    const leftIndex = sizeOrder.indexOf(leftSize);
    const rightIndex = sizeOrder.indexOf(rightSize);

    const safeLeft = leftIndex >= 0 ? leftIndex : sizeOrder.length + leftSize.charCodeAt(0);
    const safeRight = rightIndex >= 0 ? rightIndex : sizeOrder.length + rightSize.charCodeAt(0);
    return safeLeft - safeRight;
  });
}

function getImageUri(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${apiUrl}/${image}`;
}

function resolveTextAttribute(attributes: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text && text !== 'null' && text !== 'undefined') {
        return text;
      }
    }
  }
  return '';
}

function resolveTextList(attributes: Record<string, any>, keys: string[]): string[] {
  for (const key of keys) {
    const value = attributes[key];
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function resolveColor(product: Product): string {
  const direct = String(product.color ?? '').trim();
  if (direct && direct !== 'null' && direct !== 'undefined') return direct;

  const attrColor = String(product.attributes?.color ?? '').trim();
  if (attrColor && attrColor !== 'null' && attrColor !== 'undefined') return attrColor;

  const colorList = resolveTextList(product.attributes ?? {}, ['available_colors', 'colors']);
  if (colorList.length > 0) return colorList[0];

  return '';
}

function getAvailableColors(product: Product): string[] {
  const colorList = resolveTextList(product.attributes ?? {}, ['available_colors', 'colors']);
  if (colorList.length > 0) return colorList;
  const fallback = resolveColor(product);
  return fallback ? [fallback] : [];
}

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function isGarmentBusiness(product: Product) {
  return Number(product.business_type_id) === 2;
}

export default function ProductCart({
  product,
  showSize = false,
  cart,
  onAddVariant,
  onUpdateVariantQty,
  onRemoveVariant,
  onAddSimple,
  onUpdateSimpleQty,
  onRemoveSimple,
}: ProductCartProps) {
  const { addGarmentBundle } = useCart();
  const [imgError, setImgError] = useState(false);
  const [selectedColor, setSelectedColor] = useState(() => resolveColor(product));
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [pieceQuantities, setPieceQuantities] = useState<Record<string, string>>({});
  const [setQty, setSetQty] = useState('1');
  const [qtyState, setQtyState] = useState<Record<number, string>>({});

  const variants = useMemo(() => sortVariants(product.variants ?? []), [product.variants]);
  const imageUri = getImageUri(product.image);
  const productColor = resolveColor(product);
  const colors = getAvailableColors(product);
  const garmentBusiness = isGarmentBusiness(product);
  const hasVariants = variants.length > 0;

  const attrPills = Object.entries(product.attributes ?? {})
    .filter(([key, value]) => {
      if (!value) return false;
      return ![
        'mrp',
        'size',
        'color',
        'brand',
        'model',
        'available_colors',
        'colors',
        'design_number',
        'designNumber',
        'fabric_type',
        'fabricType',
        'booking_type',
        'bookingType',
        'gallery_images',
        'galleryImages',
        'product_tags',
        'productTags',
      ].includes(key);
    })
    .slice(0, 3);

  const inCartCount = cart
    .filter((entry) => entry.productId === product.id)
    .reduce((sum, entry) => sum + entry.quantity, 0);

  const cartVariant = (variantId: number) =>
    cart.find((entry) => entry.productId === product.id && entry.variantId === variantId);

  const cartSimple = cart.find((entry) => entry.productId === product.id && entry.variantId === 0);

  useEffect(() => {
    if (garmentBusiness) {
      setSelectedColor((current) => current || productColor);
    }
  }, [garmentBusiness, productColor]);

  useEffect(() => {
    if (!hasVariants || garmentBusiness) return;

    setQtyState((current) => {
      const next: Record<number, string> = {};
      variants.forEach((variant) => {
        next[variant.id] = current[variant.id] ?? '1';
      });
      return next;
    });
  }, [hasVariants, garmentBusiness, variants]);

  useEffect(() => {
    if (!garmentBusiness) return;

    setPieceQuantities((current) => {
      const next: Record<string, string> = {};
      selectedSizes.forEach((size) => {
        next[size] = current[size] ?? '1';
      });
      return next;
    });
  }, [garmentBusiness, selectedSizes]);

  const garmentMeta = useMemo(
    () => ({
      designNumber: resolveTextAttribute(product.attributes ?? {}, ['design_number', 'designNumber']),
      fabricType: resolveTextAttribute(product.attributes ?? {}, ['fabric_type', 'fabricType']),
      bookingType: resolveTextAttribute(product.attributes ?? {}, ['booking_type', 'bookingType']),
      selectedColor,
      selectedSizes,
      productTags: resolveTextList(product.attributes ?? {}, ['product_tags', 'productTags']),
      galleryImages: resolveTextList(product.attributes ?? {}, ['gallery_images', 'galleryImages']),
    }),
    [product.attributes, selectedColor, selectedSizes]
  );

  const handleAddGarmentPieces = () => {
    if (!canProceed()) return;

    const selectedVariants = variants
      .filter((variant) => selectedSizes.includes(String(variant.size ?? '').trim()))
      .map((variant) => ({
        ...variant,
        quantity: Number.parseInt(pieceQuantities[String(variant.size ?? '').trim()] ?? '1', 10) || 0,
        color: selectedColor,
      }))
      .filter((variant) => variant.quantity > 0);

    if (selectedVariants.length === 0) {
      Alert.alert('Invalid selection', 'Select at least one size and quantity.');
      return;
    }

    addGarmentBundle(
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        image: product.image,
        price: product.price,
        stock: product.stock,
        business_type_id: product.business_type_id ?? null,
        attributes: product.attributes ?? {},
      },
      selectedVariants,
      garmentMeta
    );

    setSelectedSizes([]);
    setPieceQuantities({});
  };

  const handleAddGarmentSet = () => {
    if (!canProceed()) return;

    const qty = Number.parseInt(setQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid quantity.');
      return;
    }

    const bundle = variants.map((variant) => ({
      ...variant,
      quantity: qty,
      color: selectedColor,
      setQuantity: qty,
    }));

    addGarmentBundle(
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        image: product.image,
        price: product.price,
        stock: product.stock,
        business_type_id: product.business_type_id ?? null,
        attributes: product.attributes ?? {},
      },
      bundle,
      garmentMeta
    );

    setSetQty('1');
  };

  const canProceed = () => true;

  const handleAddVariant = (variant: ProductVariant) => {
    const quantity = Number.parseInt(qtyState[variant.id] ?? '1', 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid quantity.');
      return;
    }

    onAddVariant(product.id, variant, quantity);
    setQtyState((current) => ({ ...current, [variant.id]: '1' }));
  };

  const handleAddSimple = () => {
    onAddSimple(product.id);
  };

  return (
    <View
      style={[
        styles.card,
        inCartCount > 0 ? styles.cardActive : null,
      ]}
    >
      <View style={styles.imageShell}>
        {imageUri && !imgError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={22} color="#94A3B8" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {garmentBusiness && product.attributes?.design_number ? (
              <Text style={styles.designText} numberOfLines={1}>
                {product.attributes.design_number}
              </Text>
            ) : null}
            <Text style={styles.title} numberOfLines={2}>
              {product.name}
            </Text>
            {(product.brand || product.model) && (
              <Text style={styles.metaText} numberOfLines={1}>
                {[product.brand, product.model].filter(Boolean).join(' • ')}
              </Text>
            )}
          </View>

          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>MRP</Text>
            <Text style={styles.priceValue}>{formatCurrency(product.price)}</Text>
          </View>
        </View>

        {attrPills.length > 0 && !garmentBusiness ? (
          <View style={styles.pillWrap}>
            {attrPills.map(([key, value]) => (
              <View key={key} style={styles.attrPill}>
                <Text style={styles.attrPillText} numberOfLines={1}>
                  {String(value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {!garmentBusiness && productColor ? (
          <View style={styles.infoBlock}>
            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorWrap}>
              <View style={styles.colorPill}>
                <Text style={styles.colorPillText}>{productColor}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {!garmentBusiness && hasVariants ? (
          <View style={styles.variantBlock}>
            <View style={styles.variantHeader}>
              <Text style={styles.sectionLabel}>{showSize ? 'Size Variants' : 'Variants'}</Text>
            </View>
            <View style={styles.variantTableHead}>
              {showSize ? <Text style={[styles.variantHeadText, styles.variantSizeCol]}>Size</Text> : null}
              <Text style={[styles.variantHeadText, styles.variantPriceCol]}>Price</Text>
              <Text style={[styles.variantHeadText, styles.variantQtyCol]}>Qty</Text>
              <View style={styles.variantActionCol} />
            </View>

            <View style={styles.variantList}>
              {variants.map((variant) => {
                const inCart = cartVariant(variant.id);
                const currentQty = qtyState[variant.id] ?? '1';
                const price = Number(variant.rate ?? variant.mrp ?? product.price ?? 0);

                return (
                  <View
                    key={variant.id}
                    style={[
                      styles.variantRow,
                      inCart ? styles.variantRowActive : null,
                    ]}
                  >
                    {showSize ? (
                      <View style={styles.variantSizeBadge}>
                        <Text style={styles.variantSizeText}>{variant.size || '—'}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.variantPriceText}>{formatCurrency(price)}</Text>

                    {inCart ? (
                      <View style={styles.stepper}>
                        <Pressable
                          onPress={() =>
                            onUpdateVariantQty(product.id, variant.id, inCart.quantity - 1)
                          }
                          style={styles.stepperBtn}
                        >
                          <Feather name="minus" size={14} color={BLUE} />
                        </Pressable>
                        <Text style={styles.stepperQty}>{inCart.quantity}</Text>
                        <Pressable
                          onPress={() =>
                            onUpdateVariantQty(product.id, variant.id, inCart.quantity + 1)
                          }
                          style={styles.stepperBtn}
                        >
                          <Feather name="plus" size={14} color={BLUE} />
                        </Pressable>
                      </View>
                    ) : (
                      <TextInput
                        keyboardType="number-pad"
                        value={currentQty}
                        onChangeText={(value) =>
                          setQtyState((current) => ({
                            ...current,
                            [variant.id]: value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        style={styles.qtyInput}
                      />
                    )}

                    {inCart ? (
                      <Pressable onPress={() => onRemoveVariant(product.id, variant.id)} style={styles.removeBtn}>
                        <Feather name="trash-2" size={12} color="#DC2626" />
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => handleAddVariant(variant)} style={styles.addBtn}>
                        <Feather name="plus" size={12} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Add</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {garmentBusiness ? (
          <>
            {colors.length > 0 ? (
              <View style={styles.infoBlock}>
                <Text style={styles.sectionLabel}>Colors</Text>
                <View style={styles.colorWrap}>
                  {colors.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.garmentColorPill,
                        selectedColor === color ? styles.garmentColorPillActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.garmentColorText,
                          selectedColor === color ? styles.garmentColorTextActive : null,
                        ]}
                      >
                        {color}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>Sizes</Text>
              <View style={styles.sizeWrap}>
                {variants.map((variant) => {
                  const size = String(variant.size ?? '').trim() || 'NA';
                  const active = selectedSizes.includes(size);
                  const inCart = cartVariant(variant.id)?.quantity ?? 0;

                  return (
                    <Pressable
                      key={variant.id}
                      onPress={() =>
                        setSelectedSizes((current) =>
                          current.includes(size)
                            ? current.filter((entry) => entry !== size)
                            : [...current, size]
                        )
                      }
                      style={[
                        styles.sizePill,
                        active ? styles.sizePillActive : null,
                      ]}
                    >
                      <Text style={[styles.sizePillText, active ? styles.sizePillTextActive : null]}>
                        {size}
                      </Text>
                      {inCart > 0 ? <Text style={styles.sizeCount}>{inCart}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {selectedSizes.length > 0 ? (
              <View style={styles.garmentCard}>
                <View style={styles.garmentCardHeader}>
                  <Text style={styles.garmentCardTitle}>Piece-Wise Ordering</Text>
                  <Text style={styles.garmentCardHint}>Enter qty per size</Text>
                </View>

                <View style={styles.garmentGrid}>
                  {variants
                    .filter((variant) => selectedSizes.includes(String(variant.size ?? '').trim() || 'NA'))
                    .map((variant) => {
                      const size = String(variant.size ?? '').trim() || 'NA';
                      return (
                        <View key={variant.id} style={styles.garmentRow}>
                          <View style={styles.garmentSizeChip}>
                            <Text style={styles.garmentSizeChipText}>{size}</Text>
                          </View>
                          <TextInput
                            value={pieceQuantities[size] ?? '1'}
                            onChangeText={(value) =>
                              setPieceQuantities((current) => ({
                                ...current,
                                [size]: value.replace(/[^0-9]/g, ''),
                              }))
                            }
                            keyboardType="number-pad"
                            style={styles.garmentQtyInput}
                          />
                        </View>
                      );
                    })}
                </View>

                <Pressable onPress={handleAddGarmentPieces} style={styles.primaryButton}>
                  <Feather name="plus" size={14} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Add To Cart</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.garmentSetCard}>
              <View style={styles.garmentSetRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.garmentSetTitle}>Set Ordering</Text>
                  <Text style={styles.garmentSetSubtitle}>
                    1 set = {variants.map((variant) => variant.size || 'NA').join(' + ') || 'All sizes'}
                  </Text>
                </View>
                <TextInput
                  value={setQty}
                  onChangeText={(value) => setSetQty(value.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  style={styles.setQtyInput}
                />
              </View>
              <Pressable onPress={handleAddGarmentSet} style={styles.setButton}>
                <Feather name="shopping-bag" size={14} color="#FFFFFF" />
                <Text style={styles.setButtonText}>Add Sets To Cart</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {!garmentBusiness && !hasVariants ? (
          <View style={styles.simpleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.simplePrice}>{formatCurrency(product.price)}</Text>
              <Text style={styles.simpleHint}>Flexible quantity ordering</Text>
            </View>

            {cartSimple ? (
              <View style={styles.simpleStepper}>
                <Pressable
                  onPress={() => onUpdateSimpleQty(product.id, cartSimple.quantity - 1)}
                  style={styles.simpleStepBtn}
                >
                  <Feather name="minus" size={15} color={BLUE} />
                </Pressable>
                <Text style={styles.simpleStepQty}>{cartSimple.quantity}</Text>
                <Pressable
                  onPress={() => onUpdateSimpleQty(product.id, cartSimple.quantity + 1)}
                  style={styles.simpleStepBtn}
                >
                  <Feather name="plus" size={15} color={BLUE} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleAddSimple} style={styles.primaryButton}>
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Add To Cart</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardActive: {
    borderColor: '#BFDBFE',
  },
  imageShell: {
    height: 176,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  body: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  designText: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#B45309',
    marginBottom: 4,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: BLUE,
  },
  metaText: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748B',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '900',
    color: BLUE,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  attrPill: {
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attrPillText: {
    fontSize: 10,
    color: '#475569',
  },
  infoBlock: {
    marginTop: 12,
  },
  sectionLabel: {
    marginBottom: 7,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  colorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: BLUE,
  },
  colorPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  garmentColorPill: {
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  garmentColorPillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  garmentColorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  garmentColorTextActive: {
    color: '#FFFFFF',
  },
  variantBlock: {
    marginTop: 12,
  },
  variantHeader: {
    marginBottom: 6,
  },
  variantTableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  variantHeadText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  variantSizeCol: {
    width: 50,
  },
  variantPriceCol: {
    flex: 1,
  },
  variantQtyCol: {
    width: 82,
    textAlign: 'center',
  },
  variantActionCol: {
    width: 54,
  },
  variantList: {
    gap: 6,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
    padding: 6,
  },
  variantRowActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  variantSizeBadge: {
    width: 50,
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantSizeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BLUE,
  },
  variantPriceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  qtyInput: {
    width: 82,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 13,
    color: BLUE,
  },
  stepper: {
    width: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: BLUE,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  addBtn: {
    width: 54,
    minHeight: 34,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: BLUE,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sizeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  sizePill: {
    minWidth: 38,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  sizePillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  sizePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  sizePillTextActive: {
    color: '#FFFFFF',
  },
  sizeCount: {
    position: 'absolute',
    right: 3,
    top: 2,
    fontSize: 9,
    color: GOLD,
    fontWeight: '800',
  },
  garmentCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  garmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  garmentCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
  },
  garmentCardHint: {
    fontSize: 10,
    color: '#64748B',
  },
  garmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  garmentRow: {
    width: '47%',
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  garmentSizeChip: {
    minWidth: 42,
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  garmentSizeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  garmentQtyInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    fontSize: 13,
    color: BLUE,
  },
  garmentSetCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    padding: 10,
  },
  garmentSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  garmentSetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
  },
  garmentSetSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: '#64748B',
  },
  setQtyInput: {
    height: 40,
    width: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    fontSize: 13,
    color: BLUE,
    textAlign: 'center',
  },
  setButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  setButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  simpleRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  simplePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE,
  },
  simpleHint: {
    marginTop: 2,
    fontSize: 10,
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
