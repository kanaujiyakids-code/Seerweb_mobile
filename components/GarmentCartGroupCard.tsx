import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../src/lib/app';
import type { GarmentCartGroup } from '../src/lib/cart';

interface GarmentCartGroupCardProps {
  group: GarmentCartGroup;
  onIncrementSize: (variantId: number, currentQty: number) => void;
  onDecrementSize: (variantId: number, currentQty: number) => void;
  onRemoveSize: (variantId: number) => void;
  onRemoveProduct: () => void;
  onImagePress?: (imageUri: string) => void;
}

const BLUE = '#0F172A';
const BLUE_ACCENT = '#1D4ED8';
const BORDER = '#E5E7EB';

export default function GarmentCartGroupCard({
  group,
  onIncrementSize,
  onDecrementSize,
  onRemoveSize,
  onRemoveProduct,
  onImagePress,
}: GarmentCartGroupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.imageShell}>
        {group.imageUri ? (
          <Pressable disabled={!onImagePress} onPress={() => onImagePress?.(group.imageUri!)}>
            <Image source={{ uri: group.imageUri }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ) : (
          <View style={styles.placeholder}>
            <Feather name="image" size={20} color="#94A3B8" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            {group.garmentMeta?.designNumber ? (
              <Text style={styles.designText}>{group.garmentMeta.designNumber}</Text>
            ) : null}
            <Text style={styles.name} numberOfLines={2}>
              {group.name}
            </Text>
            {(group.brand || group.model) && (
              <Text style={styles.meta}>
                {[group.brand, group.model].filter(Boolean).join(' • ')}
              </Text>
            )}
            {group.garmentMeta?.fabricType || group.garmentMeta?.bookingType ? (
              <Text style={styles.meta}>
                {[group.garmentMeta?.bookingType, group.garmentMeta?.fabricType]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            ) : null}
          </View>
          <Text style={styles.totalPrice}>{formatCurrency(group.subtotal)}</Text>
        </View>

        <View style={styles.badges}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{group.categoryLabel}</Text>
          </View>
          {group.colorLabel ? (
            <View style={styles.colorBadge}>
              <Text style={styles.colorText}>{group.colorLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.setBox}>
          <Text style={styles.setTitle}>Set Ordering</Text>
          <Text style={styles.setSubtitle}>{group.sizeSummary}</Text>
        </View>

        <View style={styles.gridHeader}>
          <Text style={[styles.headerCell, styles.headerSize]}>Size</Text>
          <Text style={[styles.headerCell, styles.headerQty]}>Qty</Text>
          <Text style={[styles.headerCell, styles.headerPrice]}>Amount</Text>
          <View style={styles.headerActions} />
        </View>

        {group.sizes.map((size) => {
          const canDecrement = size.quantity > 0;

          return (
            <View key={size.key} style={styles.sizeRow}>
              <View style={styles.sizeChip}>
                <Text style={styles.sizeChipText}>{size.sizeLabel}</Text>
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() => onDecrementSize(size.variantId, size.quantity)}
                  disabled={!canDecrement}
                  style={[styles.stepBtn, !canDecrement && styles.stepBtnDisabled]}>
                  <Feather name="minus" size={15} color={canDecrement ? BLUE_ACCENT : '#94A3B8'} />
                </Pressable>
                <Text style={styles.stepQty}>{size.quantity}</Text>
                <Pressable
                  onPress={() => onIncrementSize(size.variantId, size.quantity)}
                  style={styles.stepBtn}>
                  <Feather name="plus" size={15} color={BLUE_ACCENT} />
                </Pressable>
              </View>

              <View style={styles.amountBlock}>
                <Text style={styles.amount}>{formatCurrency(size.subtotal)}</Text>
              </View>

              <Pressable
                onPress={() => onRemoveSize(size.variantId)}
                disabled={!canDecrement}
                style={[styles.removeBtn, !canDecrement && styles.removeBtnDisabled]}>
                <Feather name="trash-2" size={14} color="#DC2626" />
              </Pressable>
            </View>
          );
        })}

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerTotal}>{group.totalQuantity} total pieces</Text>
            <Text style={styles.footerAmount}>{formatCurrency(group.subtotal)}</Text>
          </View>
          <Pressable onPress={onRemoveProduct} hitSlop={8} style={styles.removeProductBtn}>
            <Feather name="trash-2" size={14} color="#DC2626" />
            <Text style={styles.removeProductText}>Remove product</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageShell: {
    height: 180,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 210,
    height: 180,
  },
  placeholder: {
    width: 210,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  designText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#B45309',
    fontWeight: '700',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: BLUE,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: BLUE,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_ACCENT,
  },
  colorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  colorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  setBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  setTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  setSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerSize: {
    width: 68,
  },
  headerQty: {
    width: 104,
    textAlign: 'center',
  },
  headerPrice: {
    flex: 1,
    textAlign: 'right',
  },
  headerActions: {
    width: 34,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sizeChip: {
    width: 54,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
  stepper: {
    width: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepBtnDisabled: {
    backgroundColor: '#F8FAFC',
  },
  stepQty: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  amountBlock: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  removeBtn: {
    width: 32,
    height: 32,
    marginLeft: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  removeBtnDisabled: {
    opacity: 0.35,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerTotal: {
    fontSize: 11,
    color: '#64748B',
  },
  footerAmount: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: BLUE,
  },
  removeProductBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#FEF2F2',
  },
  removeProductText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
