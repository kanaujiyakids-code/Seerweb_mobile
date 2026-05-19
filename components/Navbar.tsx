/**
 * Navbar — OPTIMIZED
 *
 * Fixes:
 * 1. Handlers memoized with useCallback
 * 2. Wrapped in React.memo — won't re-render when parent screen updates state
 */
import React, { useState, useCallback, memo } from 'react';
import { View, Text, Pressable, Modal, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { clearRoleCache } from './BottomTabNavigator';

interface NavbarProps {
  user?: string;
}

function Navbar({ user }: NavbarProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);
  const openLogout = useCallback(() => { setMenuVisible(false); setLogoutVisible(true); }, []);
  const closeLogout = useCallback(() => setLogoutVisible(false), []);

  const goToProfile = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Profile' as never);
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.multiRemove(['user', 'token', 'cart', 'selectedRetailer', 'welcomeShown']);
    clearRoleCache(); // ✅ clear module-level role cache on logout
    setLogoutVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image source={require('../assets/icon.png')} style={{ width: 28, height: 28, marginRight: 8 }} resizeMode="contain" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Seerweb OMS</Text>
      </View>

      <Pressable onPress={openMenu} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={22} color="#374151" />
      </Pressable>

      {/* Dropdown */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} onPress={closeMenu}>
          <View style={{ position: 'absolute', top: 60, right: 16, backgroundColor: '#fff', borderRadius: 10, width: 180, elevation: 6 }}>
            <Pressable onPress={goToProfile} style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
              <Ionicons name="person-outline" size={18} color="#111827" />
              <Text style={{ marginLeft: 12, fontWeight: '500', color: '#1f2937' }}>Profile</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />
            <Pressable onPress={openLogout} style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={{ marginLeft: 12, fontWeight: '500', color: '#ef4444' }}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Logout confirm */}
      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={closeLogout}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: '#fff', width: '100%', maxWidth: 360, borderRadius: 20, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 50, marginBottom: 12 }}>
                <Feather name="log-out" size={28} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Logout</Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 }}>
                Are you sure you want to logout?
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={closeLogout} style={{ flex: 1, paddingVertical: 13, backgroundColor: '#e5e7eb', borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: '#374151' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleLogout} style={{ flex: 1, paddingVertical: 13, backgroundColor: '#ef4444', borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: '#fff' }}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default memo(Navbar);