import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from 'apiurl';
import { SafeAreaView } from 'react-native-safe-area-context';

import RefreshWrapper from 'components/RefreshWrapper';
import { getErrorMessage, getHomeRouteForRole } from '../src/lib/app';

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message === 'Login successful') {
        const route = getHomeRouteForRole(data?.user?.role);

        if (!route) {
          setErrorMessage('This account role is not supported in the current mobile app.');
          return;
        }

        await AsyncStorage.multiSet([
          ['token', data.token],
          ['user', JSON.stringify(data.user)],
        ]);

        navigation.reset({
          index: 0,
          routes: [{ name: route }],
        });
      } else {
        setErrorMessage(data.message || 'Invalid username or password.');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh reset
  const handleRefresh = async () => {
    setUsername('');
    setPassword('');
    setErrorMessage('');
  };

  return (
    <SafeAreaView className="flex-1">
      <RefreshWrapper onRefresh={handleRefresh}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center items-center"
        >
          {/* Background Image */}
          <Animated.Image
            source={require('../assets/images/login_mobile.png')}
            className="absolute top-0 left-0 h-full w-full opacity-20"
            resizeMode="cover"
          />

          {/* Login Container */}
          <View className="w-full max-w-md p-6 rounded-2xl mb-32">
            {/* Logo */}
            <Animated.Image
              entering={FadeInUp.delay(200).duration(500).springify()}
              source={require('../assets/icon.png')}
              className="w-28 h-28 mt-6 mb-6 self-center"
              resizeMode="contain"
            />

            {/* Username Input */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(1500).springify()}
              className="rounded-2xl mb-4 bg-white"
            >
              <TextInput
                placeholder="Username"
                className="border rounded-2xl h-14 px-4 text-black"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={username}
                onChangeText={setUsername}
                editable={!loading}
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(1500).springify()}
              className="border bg-white rounded-2xl h-14 px-4 flex-row items-center"
            >
              <TextInput
                placeholder="Password"
                className="flex-1 text-black"
                secureTextEntry={!showPassword}
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#888"
                />
              </Pressable>
            </Animated.View>

            {/* Error Message */}
            {errorMessage ? (
              <Text className="text-red-500 text-sm mt-2 ml-2">
                {errorMessage}
              </Text>
            ) : null}

            {/* Login Button */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(1500).springify()}
            >
              <Pressable
                disabled={loading}
                onPress={handleLogin}
                className={`rounded-2xl py-3 mt-8 h-14 justify-center shadow-lg ${
                  loading ? 'bg-[#7f92f5]' : 'bg-[#5b74f1]'
                }`}
              >
                <View className="flex-row items-center justify-center">
                  {loading ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color="#ffffff"
                      />

                      <Text className="text-white font-semibold text-base ml-3">
                        Signing In...
                      </Text>
                    </>
                  ) : (
                    <Text className="text-center text-white font-semibold text-base">
                      Login
                    </Text>
                  )}
                </View>
              </Pressable>
            </Animated.View>

            {/* Bottom Text */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(1500).springify()}
              className="mt-4 w-full items-center"
            >
              <Text className="px-4 py-2 text-center rounded-md w-[90%] text-gray-700">
                Don&apos;t have your login details? Please contact your dealer.
              </Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </RefreshWrapper>
    </SafeAreaView>
  );
}
