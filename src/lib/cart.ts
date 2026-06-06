import { apiUrl } from 'apiurl';

export interface CartSnapshotItem {
  productId: number;
  variantId: number;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  stock?: number;
  businessTypeId?: number | null;
  garmentMeta?: GarmentMeta;
  attributes?: Record<string, any>;
}

export interface CartProductVariant {
  id: number;
  size?: string;
  color?: string;
  rate?: number;
  mrp?: number;
  qty: number;
}

export interface CartProductDetail {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  price: number;
  stock: number;
  image?: string | null;
  business_type_id?: number | null;
  attributes?: Record<string, any>;
  variants?: CartProductVariant[];
}

export interface GarmentMeta {
  designNumber?: string;
  fabricType?: string;
  bookingType?: string;
  selectedColor?: string;
  selectedColorHex?: string;
  selectedSizes?: string[];
  productTags?: string[];
  galleryImages?: string[];
}

export interface CartRow {
  key: string;
  productId: number;
  variantId: number;
  businessTypeId: number | null;
  name: string;
  brand: string;
  model: string;
  variantLabel: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  maxQuantity: number;
  availableStock: number;
  imageUri: string | null;
  categoryLabel: 'Garments' | 'Mobile';
  isVariantBased: boolean;
  isOutOfStock: boolean;
  sizeLabel: string | null;
  colorLabel: string | null;
  garmentMeta?: GarmentMeta;
  attributes?: Record<string, any>;
}

export interface GarmentGroupSize {
  key: string;
  variantId: number;
  sizeLabel: string;
  quantity: number;
  maxQuantity: number;
  availableStock: number;
  price: number;
  subtotal: number;
}

export interface GarmentCartGroup {
  key: string;
  kind: 'garment-group';
  productId: number;
  name: string;
  brand: string;
  model: string;
  imageUri: string | null;
  categoryLabel: 'Garments' | 'Mobile';
  colorLabel: string | null;
  totalQuantity: number;
  subtotal: number;
  maxSetCount: number;
  sizeSummary: string;
  sizes: GarmentGroupSize[];
  garmentMeta?: GarmentMeta;
}

export interface SimpleCartDisplayItem extends CartRow {
  kind: 'simple-row';
}

export type CartDisplayItem = SimpleCartDisplayItem | GarmentCartGroup;

export function clampCartQuantity(quantity: number, stock?: number | null): number {
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
}

export function getImageUri(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${apiUrl}/${image}`;
}

function parseAttributes(attributes?: unknown): Record<string, any> {
  if (!attributes) return {};
  if (typeof attributes === 'string') {
    try {
      const parsed = JSON.parse(attributes);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof attributes === 'object' && attributes !== null ? (attributes as Record<string, any>) : {};
}

function getAttributeText(attributes: Record<string, any>, keys: string[]): string {
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

function getAttributeList(attributes: Record<string, any>, keys: string[]): string[] {
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

export function extractGarmentMeta(
  product?: CartProductDetail,
  item?: CartSnapshotItem
): GarmentMeta | undefined {
  const attributes = parseAttributes(product?.attributes);
  const itemMeta = item?.garmentMeta ?? {};
  const selectedColor =
    item?.color ||
    itemMeta.selectedColor ||
    getAttributeText(attributes, ['selected_color', 'selectedColor', 'color']);
  const meta: GarmentMeta = {
    designNumber: itemMeta.designNumber || getAttributeText(attributes, ['design_number', 'designNumber']),
    fabricType: itemMeta.fabricType || getAttributeText(attributes, ['fabric_type', 'fabricType']),
    bookingType: itemMeta.bookingType || getAttributeText(attributes, ['booking_type', 'bookingType']),
    selectedColor,
    selectedColorHex:
      itemMeta.selectedColorHex || getAttributeText(attributes, ['selected_color_hex', 'selectedColorHex']),
    selectedSizes:
      itemMeta.selectedSizes?.length > 0
        ? itemMeta.selectedSizes
        : getAttributeList(attributes, ['selected_sizes', 'selectedSizes']),
    productTags:
      itemMeta.productTags?.length > 0
        ? itemMeta.productTags
        : getAttributeList(attributes, ['product_tags', 'productTags']),
    galleryImages:
      itemMeta.galleryImages?.length > 0
        ? itemMeta.galleryImages
        : getAttributeList(attributes, ['gallery_images', 'galleryImages']),
  };

  const hasMeta = Object.values(meta).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim())
  );

  return hasMeta ? meta : undefined;
}

function getVariantStock(item: CartSnapshotItem, product?: CartProductDetail): number {
  if (item.variantId !== 0) {
    const variant = product?.variants?.find((entry) => Number(entry.id) === Number(item.variantId));
    return Number(variant?.qty ?? item.stock ?? 0);
  }

  return Number(product?.stock ?? item.stock ?? 0);
}

function getCategoryLabel(
  product?: CartProductDetail,
  item?: CartSnapshotItem
): 'Garments' | 'Mobile' {
  const itemBusinessTypeId = Number(item?.businessTypeId ?? 0);
  const productBusinessTypeId = Number(product?.business_type_id ?? 0);

  if (itemBusinessTypeId === 2 || productBusinessTypeId === 2 || Boolean(item?.garmentMeta)) {
    return 'Garments';
  }

  return 'Mobile';
}

function normalizeLabel(value?: string | null): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (['na', 'n/a', 'null', 'undefined', '-'].includes(lower)) return null;
  return text;
}

function getSizeSortValue(sizeLabel: string): number {
  const value = sizeLabel.trim().toUpperCase();
  const orderedSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
  const index = orderedSizes.indexOf(value);
  if (index >= 0) return index;
  return orderedSizes.length + value.charCodeAt(0);
}

export function mapProductPayload(item: any): CartProductDetail {
  const attributes = parseAttributes(item?.attributes);

  return {
    id: Number(item.id),
    name: item.name || '',
    brand: item.brand || attributes.brand || '',
    model: item.model || attributes.model || '',
    price: Number(item.price ?? 0),
    stock: Number(item.stock ?? 0),
    image: item.image || null,
    business_type_id: item.business_type_id ?? null,
    attributes,
    variants: Array.isArray(item.variants) ? item.variants : [],
  };
}

export function buildCartRows(
  cart: CartSnapshotItem[],
  productsById: Record<number, CartProductDetail>
): CartRow[] {
  return cart
    .map((item) => {
      const product = productsById[item.productId];
      if (!product) return null;
      const productVariant =
        item.variantId !== 0
          ? product.variants?.find((entry) => Number(entry.id) === Number(item.variantId))
          : undefined;

      const availableStock = Math.max(0, getVariantStock(item, product));
      const sizeLabel = normalizeLabel(item.size) ?? normalizeLabel(productVariant?.size);
      const colorLabel = normalizeLabel(item.color) ?? normalizeLabel(productVariant?.color);
      const variantLabel =
        sizeLabel || colorLabel ? [sizeLabel, colorLabel].filter(Boolean).join(' / ') : null;
      const garmentMeta = extractGarmentMeta(product, item);

      return {
        key: `${item.productId}-${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId,
        businessTypeId: Number(item.businessTypeId ?? product?.business_type_id ?? null) || null,
        name: product.name || `Product #${item.productId}`,
        brand: product.brand || '',
        model: product.model || '',
        variantLabel,
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 0),
        subtotal: Number(item.price ?? 0) * Number(item.quantity ?? 0),
        maxQuantity: Number.MAX_SAFE_INTEGER,
        availableStock,
        imageUri: getImageUri(product.image),
        categoryLabel: getCategoryLabel(product, item),
        isVariantBased: item.variantId !== 0,
        isOutOfStock: false,
        sizeLabel,
        colorLabel,
        garmentMeta,
        attributes: product.attributes,
      } satisfies CartRow;
    })
    .filter(Boolean) as CartRow[];
}

export function buildCartDisplayItems(
  rows: CartRow[],
  productsById: Record<number, CartProductDetail>
): CartDisplayItem[] {
  const displayItems: CartDisplayItem[] = [];
  const garmentGroups = new Map<string, GarmentCartGroup>();

  rows.forEach((row) => {
    if (!row.isVariantBased || row.categoryLabel !== 'Garments') {
      displayItems.push({
        ...row,
        kind: 'simple-row',
      });
      return;
    }

    const groupKey = `${row.productId}::${row.colorLabel ?? ''}`;
    const existingGroup = garmentGroups.get(groupKey);

    if (!existingGroup) {
      const group: GarmentCartGroup = {
        key: groupKey,
        kind: 'garment-group',
        productId: row.productId,
        name: row.name,
        brand: row.brand,
        model: row.model,
        imageUri: row.imageUri,
        categoryLabel: row.categoryLabel,
        colorLabel: row.colorLabel,
        totalQuantity: row.quantity,
        subtotal: row.subtotal,
        maxSetCount: row.maxQuantity,
        sizeSummary: row.sizeLabel ? `1 set = ${row.sizeLabel}` : '',
        garmentMeta: row.garmentMeta,
        sizes: [
          {
            key: row.key,
            variantId: row.variantId,
            sizeLabel: row.sizeLabel || 'NA',
            quantity: row.quantity,
            maxQuantity: row.maxQuantity,
            availableStock: row.availableStock,
            price: row.price,
            subtotal: row.subtotal,
          },
        ],
      };

      garmentGroups.set(groupKey, group);
      displayItems.push(group);
      return;
    }

    existingGroup.totalQuantity += row.quantity;
    existingGroup.subtotal += row.subtotal;
    existingGroup.maxSetCount = Math.min(existingGroup.maxSetCount, row.maxQuantity);
    existingGroup.garmentMeta = existingGroup.garmentMeta ?? row.garmentMeta;
    existingGroup.sizes.push({
      key: row.key,
      variantId: row.variantId,
      sizeLabel: row.sizeLabel || 'NA',
      quantity: row.quantity,
      maxQuantity: row.maxQuantity,
      availableStock: row.availableStock,
      price: row.price,
      subtotal: row.subtotal,
    });
  });

  displayItems.forEach((item) => {
  if (item.kind !== 'garment-group') return;

  item.sizes.sort(
    (left, right) => getSizeSortValue(left.sizeLabel) - getSizeSortValue(right.sizeLabel)
  );

  const setCount =
    item.sizes.length > 0
      ? Math.min(...item.sizes.map((entry) => entry.quantity))
      : 0;

  item.maxSetCount = setCount;

  const labelSummary = item.sizes
    .map((entry) => entry.sizeLabel)
    .filter((label) => label && label !== 'NA');

  item.sizeSummary = labelSummary.length > 0
    ? `${setCount} ${setCount === 1 ? 'set' : 'sets'} = ${labelSummary.join(' + ')}`
    : `${setCount} ${setCount === 1 ? 'set' : 'sets'}`;
});

  return displayItems;
}

export function buildGarmentCartSummary(displayItems: CartDisplayItem[], cartTotal: number) {
  const garmentGroups = displayItems.filter(
    (item): item is GarmentCartGroup => item.kind === 'garment-group'
  );

  const totalSets = garmentGroups.reduce((sum, item) => sum + item.maxSetCount, 0);
  const totalPieces = displayItems.reduce((sum, item) => {
    if (item.kind === 'garment-group') {
      return sum + item.totalQuantity;
    }

    return sum + item.quantity;
  }, 0);

  const gst = cartTotal * 0.05;

  return {
    productCount: displayItems.length,
    totalPieces,
    totalSets,
    subtotal: cartTotal,
    gst,
    finalAmount: cartTotal + gst,
  };
}
