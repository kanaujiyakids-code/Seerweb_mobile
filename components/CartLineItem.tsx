import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../src/lib/app';
import type { CartRow } from '../src/lib/cart';

interface CartLineItemProps {
  row: CartRow;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onImagePress?: (imageUri: string) => void;
}

const BLUE = '#185FA5';
const BLUE_LIGHT = '#EFF6FF';
const BORDER = '#E5E7EB';
const TEXT_MUTED = '#6B7280';
const RED = '#DC2626';

export default function CartLineItem({
  row,
  onIncrement,
  onDecrement,
  onRemove,
  onImagePress,
}: CartLineItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {row.imageUri ? (
          <Pressable
            disabled={!onImagePress}
            onPress={() => onImagePress?.(row.imageUri!)}
            style={styles.imageWrap}
          >
            <Image source={{ uri: row.imageUri }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ) : (
          <View style={[styles.imageWrap, styles.imagePlaceholder]}>
            <Feather name="image" size={18} color="#9CA3AF" />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={2}>
                {row.name}
              </Text>
              {(row.brand || row.model) && (
                <Text style={styles.meta} numberOfLines={1}>
                  {[row.brand, row.model].filter(Boolean).join(' • ')}
                </Text>
              )}
            </View>

            <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
              <Feather name="trash-2" size={16} color={RED} />
            </Pressable>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{row.categoryLabel}</Text>
            </View>
            {row.variantLabel ? (
              <View style={styles.variantBadge}>
                <Text style={styles.variantText}>{row.variantLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.price}>{formatCurrency(row.price)}</Text>
          <Text style={styles.subtotal}>Subtotal {formatCurrency(row.subtotal)}</Text>
        </View>

        <View style={styles.stepper}>
          <Pressable onPress={onDecrement} style={styles.stepperBtn} hitSlop={8}>
            <Feather name="minus" size={18} color={BLUE} />
          </Pressable>
          <Text style={styles.quantity}>{row.quantity}</Text>
          <Pressable
            onPress={onIncrement}
            style={styles.stepperBtn}
            hitSlop={8}
          >
            <Feather name="plus" size={18} color={BLUE} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageWrap: {
    width: 78,
    height: 78,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: BLUE,
  },
  variantBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  variantText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE,
  },
  subtotal: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});
