import React, { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, Modal, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { clearRoleCache } from './BottomTabNavigator';
import { clearCache } from '../src/lib/services/api';

interface NavbarProps {
  user?: string;
}

function Navbar({ user }: NavbarProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const closeMenu = useCallback(() => setMenuVisible(false), []);
  const closeLogout = useCallback(() => setLogoutVisible(false), []);

  const goToProfile = useCallback(() => {
    setMenuVisible(false);
    // Wait for the modal's fade-out animation to finish before navigating
    setTimeout(() => navigation.navigate('Profile'), 10);
  }, [navigation]);
  const handleLogout = useCallback(async () => {
    await AsyncStorage.multiRemove(['user', 'token', 'cart', 'selectedRetailer', 'welcomeShown']);
    clearCache();
    clearRoleCache();
    setLogoutVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  return (
    <View
      style={{
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 44, height: 44, marginRight: 6 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Seerweb OMS</Text>
        </View>
      </View>

      <Pressable onPress={() => setMenuVisible(true)} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
      </Pressable>

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} onPress={closeMenu}>
          <View
            style={{
              position: 'absolute',
              top: 60,
              right: 16,
              backgroundColor: '#fff',
              borderRadius: 12,
              width: 200,
              elevation: 6,
            }}>
            <Pressable
              onPress={goToProfile}
              style={{ flexDirection: 'row', padding: 14, alignItems: 'center' }}>
              <Ionicons name="person-outline" size={18} color="#111827" />
              <Text style={{ marginLeft: 12, fontWeight: '500', color: '#1f2937' }}>Profile</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                setLogoutVisible(true);
              }}
              style={{ flexDirection: 'row', padding: 14, alignItems: 'center' }}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={{ marginLeft: 12, fontWeight: '500', color: '#ef4444' }}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={closeLogout}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            paddingHorizontal: 16,
          }}>
          <View
            style={{
              backgroundColor: '#fff',
              width: '100%',
              maxWidth: 360,
              borderRadius: 20,
              padding: 20,
            }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: '#fee2e2',
                  padding: 12,
                  borderRadius: 50,
                  marginBottom: 12,
                }}>
                <Feather name="log-out" size={28} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Logout</Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 }}>
                Are you sure you want to logout?
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={closeLogout}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 12,
                  alignItems: 'center',
                }}>
                <Text style={{ fontWeight: '600', color: '#374151' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  backgroundColor: '#ef4444',
                  borderRadius: 12,
                  alignItems: 'center',
                }}>
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
