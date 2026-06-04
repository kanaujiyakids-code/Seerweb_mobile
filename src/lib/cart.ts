import { apiUrl } from 'apiurl';

export interface CartSnapshotItem {
  productId: number;
  variantId: number;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  stock?: number;
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
  variants?: CartProductVariant[];
}

export interface CartRow {
  key: string;
  productId: number;
  variantId: number;
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
  categoryLabel: 'Garments';
  colorLabel: string | null;
  totalQuantity: number;
  subtotal: number;
  maxSetCount: number;
  sizeSummary: string;
  sizes: GarmentGroupSize[];
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

function getVariantStock(item: CartSnapshotItem, product?: CartProductDetail): number {
  if (item.variantId !== 0) {
    const variant = product?.variants?.find((entry) => Number(entry.id) === Number(item.variantId));
    return Number(variant?.qty ?? item.stock ?? 0);
  }

  return Number(product?.stock ?? item.stock ?? 0);
}

function getCategoryLabel(product?: CartProductDetail, item?: CartSnapshotItem): 'Garments' | 'Mobile' {
  if (Number(product?.business_type_id) === 2) {
    return 'Garments';
  }

  return 'Mobile';
}

function getSizeSortValue(sizeLabel: string): number {
  const value = sizeLabel.trim().toUpperCase();
  const orderedSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
  const index = orderedSizes.indexOf(value);
  if (index >= 0) return index;
  return orderedSizes.length + value.charCodeAt(0);
}

export function mapProductPayload(item: any): CartProductDetail {
  let attributes: Record<string, string> = {};

  if (item?.attributes) {
    attributes =
      typeof item.attributes === 'string'
        ? JSON.parse(item.attributes)
        : item.attributes;
  }

  return {
    id: Number(item.id),
    name: item.name || '',
    brand: item.brand || attributes.brand || '',
    model: item.model || attributes.model || '',
    price: Number(item.price ?? 0),
    stock: Number(item.stock ?? 0),
    image: item.image || null,
    business_type_id: item.business_type_id ?? null,
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
      const variantLabel =
        item.size || item.color || productVariant?.size || productVariant?.color
          ? [item.size ?? productVariant?.size, item.color ?? productVariant?.color].filter(Boolean).join(' / ')
          : null;
      const sizeLabel = item.size
        ? String(item.size).trim()
        : productVariant?.size
          ? String(productVariant.size).trim()
          : null;
      const colorLabel = item.color
        ? String(item.color).trim()
        : productVariant?.color
          ? String(productVariant.color).trim()
          : null;

      return {
        key: `${item.productId}-${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId,
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
    if (row.categoryLabel !== 'Garments' || !row.isVariantBased) {
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
        categoryLabel: 'Garments',
        colorLabel: row.colorLabel,
        totalQuantity: row.quantity,
        subtotal: row.subtotal,
        maxSetCount: row.maxQuantity,
        sizeSummary: row.sizeLabel ? `1 set = ${row.sizeLabel}` : '',
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

    const product = productsById[item.productId];
    const matchingVariants = Array.isArray(product?.variants)
      ? product.variants.filter((variant) => {
          const variantColor = variant.color ? String(variant.color).trim() : null;
          if (!item.colorLabel) return true;
          return variantColor === item.colorLabel;
        })
      : [];

    matchingVariants.forEach((variant) => {
      const alreadyIncluded = item.sizes.some((entry) => entry.variantId === Number(variant.id));
      if (alreadyIncluded) return;

      item.sizes.push({
        key: `${item.productId}-${variant.id}`,
        variantId: Number(variant.id),
        sizeLabel: variant.size ? String(variant.size).trim() : 'NA',
        quantity: 0,
        maxQuantity: Number.MAX_SAFE_INTEGER,
        availableStock: Math.max(0, Number(variant.qty ?? 0)),
        price: Number(variant.rate ?? variant.mrp ?? product?.price ?? 0),
        subtotal: 0,
      });
    });

    item.sizes.sort((left, right) => getSizeSortValue(left.sizeLabel) - getSizeSortValue(right.sizeLabel));
    item.sizeSummary = `1 set = ${item.sizes.map((entry) => entry.sizeLabel).join(' + ')}`;
    item.maxSetCount = item.totalQuantity;
  });

  return displayItems;
}
