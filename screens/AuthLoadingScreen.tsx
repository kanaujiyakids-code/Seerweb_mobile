// screens/AuthLoadingScreen.tsx

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getHomeRouteForRole, safeJsonParse } from '../src/lib/app';

export default function AuthLoadingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const checkAuth = async () => {
      const [token, userString] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);

      if (!token || !userString) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const user = safeJsonParse<{ role?: string }>(userString, {});
      const route = getHomeRouteForRole(user.role);

      navigation.reset({
        index: 0,
        routes: [{ name: route ?? 'Login' }],
      });
    };

    checkAuth();
  }, [navigation]);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#5b74f1" />
    </View>
  );
}


// update products cart as per business type, currently user select anyone size from the cart and add to summary cart or can add sets to cart but user should able to select multiple sizes like in the image