import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  ImageBackground,
  Image,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from 'apiurl';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        body: JSON.stringify({ username, password }),
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background Image */}
      <ImageBackground
        source={require('../assets/images/login_mobile.png')}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
        resizeMode="cover"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Login Container */}
          <View style={styles.container}>
            {/* Logo */}
            <Animated.View
              entering={FadeInUp.delay(200).duration(500).springify()}
              style={styles.logoWrapper}
            >
              <Image
                source={require('../assets/icon.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </Animated.View>

            {/* Username Input */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(1500).springify()}
              style={styles.inputWrapper}
            >
              <TextInput
                placeholder="Username"
                style={styles.input}
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={username}
                onChangeText={setUsername}
                editable={!loading}
                autoCapitalize="none"
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(1500).springify()}
              style={styles.passwordWrapper}
            >
              <TextInput
                placeholder="Password"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={styles.eyeBtn}
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
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {/* Login Button */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(1500).springify()}
            >
              <Pressable
                disabled={loading}
                onPress={handleLogin}
                style={[
                  styles.loginBtn,
                  { backgroundColor: loading ? '#7f92f5' : '#5b74f1' },
                ]}
              >
                <View style={styles.loginBtnInner}>
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.loginBtnText}>Signing In...</Text>
                    </>
                  ) : (
                    <Text style={styles.loginBtnText}>Login</Text>
                  )}
                </View>
              </Pressable>
            </Animated.View>

            {/* Bottom Text */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(1500).springify()}
              style={styles.bottomTextWrapper}
            >
              <Text style={styles.bottomText}>
                Don&apos;t have your login details? Please contact your dealer.
              </Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImageStyle: {
    opacity: 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 16,
    marginBottom: 32,
  },
  logoWrapper: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginTop: 24,
    marginBottom: 24,
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#5b74f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  inputWrapper: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    color: '#000',
    fontSize: 15,
  },
  passwordWrapper: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    color: '#000',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    marginBottom: 4,
  },
  loginBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 24,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#5b74f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  bottomTextWrapper: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  bottomText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: 'center',
    borderRadius: 8,
    width: '90%',
    color: '#374151',
    fontSize: 13,
    lineHeight: 20,
  },
});