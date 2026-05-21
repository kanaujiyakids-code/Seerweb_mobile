import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { EventRegister } from 'react-native-event-listeners';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function NavbarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const currentRoute = route.name;

  const [cartCount, setCartCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const userStr = await AsyncStorage.getItem('user');
      const cartStr = await AsyncStorage.getItem('cart');

      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(user?.role);
      }

      if (cartStr) {
        const cart = JSON.parse(cartStr);
        // Support both old format { "id": qty } and new format CartItem[]
        const count = Array.isArray(cart)
          ? cart.reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0)
          : Object.values(cart as Record<string, number>).reduce((sum, qty) => sum + qty, 0);
        setCartCount(count);
      }
    };

    loadData();

    const listener = EventRegister.addEventListener('cartChanged', (count) => {
      if (typeof count === 'number') setCartCount(count);
    });

    return () => {
      EventRegister.removeEventListener(listener as string);
    };
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const active = '#566de2';
  const inactive = '#000';

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']}>
        <View className="flex-row justify-between items-center px-4 py-3">
          <Text className="text-lg font-bold text-[#566de2]">Seerweb OMS</Text>

          <View className="flex-row items-center">
            {role === 'dealer' && (
              <>
                <Pressable className="mr-6" onPress={() => navigation.replace('DealerDashboard')}>
                  <MaterialIcons
                    name="dashboard"
                    size={22}
                    color={currentRoute === 'DealerDashboard' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('Orders')}>
                  <Feather
                    name="package"
                    size={22}
                    color={currentRoute === 'Orders' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('Retailers')}>
                  <Feather
                    name="users"
                    size={22}
                    color={currentRoute === 'Retailers' ? active : inactive}
                  />
                </Pressable>
              </>
            )}

            {role === 'retailer' && (
              <>
                <Pressable className="mr-6" onPress={() => navigation.replace('RetailerDashboard')}>
                  <MaterialIcons
                    name="dashboard"
                    size={22}
                    color={currentRoute === 'RetailerDashboard' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('RetailerHome')}>
                  <Ionicons
                    name="grid-outline"
                    size={22}
                    color={currentRoute === 'RetailerHome' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6 relative" onPress={() => navigation.replace('Cart')}>
                  <FontAwesome5
                    name="shopping-cart"
                    size={20}
                    color={currentRoute === 'Cart' ? active : inactive}
                  />
                  {cartCount > 0 && (
                    <View className="absolute -top-1 -right-2 bg-red-500 rounded-full px-1">
                      <Text className="text-white text-xs font-bold">{cartCount}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('RetailerOrderScreen')}>
                  <Feather
                    name="package"
                    size={22}
                    color={currentRoute === 'RetailerOrderScreen' ? active : inactive}
                  />
                </Pressable>
              </>
            )}

            {role === 'staff' && (
              <>
                <Pressable className="mr-6" onPress={() => navigation.replace('StaffScreen')}>
                  <Ionicons
                    name="home-outline"
                    size={22}
                    color={currentRoute === 'StaffScreen' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('StaffOrderScreen')}>
                  <Feather
                    name="package"
                    size={22}
                    color={currentRoute === 'StaffOrderScreen' ? active : inactive}
                  />
                </Pressable>
              </>
            )}

            {/* Logout trigger */}
            <Pressable
              onPress={() => setLogoutVisible(true)}
              style={{ flexDirection: 'row', padding: 4, alignItems: 'center' }}
            >
              <Ionicons name="log-out-outline" size={22} color={inactive} />
            </Pressable>
          </View>
        </View>

        {/* ── Logout Confirmation Modal ─────────────────────────────── */}
        <Modal
          visible={logoutVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutVisible(false)}
        >
          {/* Backdrop — tap outside to dismiss */}
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
            onPress={() => setLogoutVisible(false)}
          >
            {/* Card — stop tap from bubbling to backdrop */}
            <Pressable
              onPress={() => {}}
              style={{ backgroundColor: '#fff', width: '100%', maxWidth: 360, borderRadius: 20, overflow: 'hidden' }}
            >
              {/* Icon + title + description */}
              <View style={{ alignItems: 'center', padding: 24, paddingBottom: 20 }}>
                <View style={{ backgroundColor: '#fee2e2', padding: 14, borderRadius: 50, marginBottom: 12 }}>
                  <Feather name="log-out" size={28} color="#ef4444" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                  Confirm Logout
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
                  Are you sure you want to logout?{'\n'}You&apos;ll need to login again to access your account.
                </Text>
              </View>

              {/* Divider */}
              <View style={{ height: 0.5, backgroundColor: '#e5e7eb' }} />

              {/* Buttons */}
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  onPress={() => setLogoutVisible(false)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 15,
                    alignItems: 'center',
                    borderRightWidth: 0.5,
                    borderRightColor: '#e5e7eb',
                    backgroundColor: pressed ? '#f3f4f6' : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 15,
                    alignItems: 'center',
                    backgroundColor: pressed ? '#fca5a5' : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444' }}>Yes, Logout</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}
