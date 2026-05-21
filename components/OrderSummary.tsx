import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatCurrency } from '../src/lib/app';

interface OrderSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
}

export default function OrderSummary({
  totalItems,
  totalPrice,
  onCheckout,
}: OrderSummaryProps) {
  return (
    <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow">
      <Text className="mb-2 text-xl font-bold text-slate-900">Order Summary</Text>

      <View className="mb-1 flex-row justify-between">
        <Text className="text-slate-500">Items ({totalItems})</Text>
        <Text className="font-semibold text-slate-800">{formatCurrency(totalPrice)}</Text>
      </View>

      <View className="mt-2 flex-row justify-between border-t border-slate-200 pt-3">
        <Text className="text-lg font-bold text-slate-900">Total</Text>
        <Text className="text-lg font-bold text-slate-900">{formatCurrency(totalPrice)}</Text>
      </View>

      <Pressable className="mt-4 rounded-2xl bg-[#185FA5] py-3" onPress={onCheckout}>
        <Text className="text-center text-base font-bold text-white">Checkout</Text>
      </Pressable>
    </View>
  );
}
