import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { formatCurrency } from '../src/lib/app';

interface OrderSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
  customerName?: string | null;
  checkoutLabel?: string;
  disabled?: boolean;
  helperText?: string | null;
}

const BLUE = '#185FA5';

export default function OrderSummary({
  totalItems,
  totalPrice,
  onCheckout,
  customerName,
  checkoutLabel = 'Checkout',
  disabled = false,
  helperText,
}: OrderSummaryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Order Summary
      </Text>

      {customerName ? (
        <View style={styles.customerPill}>
          <Text style={styles.customerText} numberOfLines={1}>
            {customerName}
          </Text>
        </View>
      ) : null}

      {/* Items Row */}
      <View style={styles.row}>
        <Text style={styles.label}>
          Items ({totalItems})
        </Text>

        <Text style={styles.value}>
          {formatCurrency(totalPrice)}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Total Row */}
      <View style={styles.row}>
        <Text style={styles.totalLabel}>
          Total
        </Text>

        <Text style={styles.totalValue}>
          {formatCurrency(totalPrice)}
        </Text>
      </View>

      {/* Checkout Button */}
      <Pressable
        style={[styles.checkoutBtn, disabled && styles.checkoutBtnDisabled]}
        onPress={onCheckout}
        disabled={disabled}
      >
        <Text style={styles.checkoutText}>
          {checkoutLabel}
        </Text>
      </Pressable>

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  customerPill: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
  },
  customerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    fontSize: 13,
    color: '#6B7280',
  },

  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: BLUE,
  },

  checkoutBtn: {
    marginTop: 14,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },

  checkoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#B45309',
  },
});
