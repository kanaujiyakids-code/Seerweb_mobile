import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './global.css';
import type { RootStackParamList } from 'types/navigation';
import { ImageBackground, View, StyleSheet, Text, Image } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import AuthLoadingScreen from './screens/AuthLoadingScreen';
import LoginScreen from './screens/LoginScreen';
import AboutScreen from './screens/AboutScreen';
import ContactScreen from './screens/ContactScreen';
import ProfileScreen from './screens/ProfileScreen';
import RetailerDashboardScreen from './screens/retailer/RetailerDashboard';
import RetailerHomeScreen from './screens/retailer/RetailerHome';
import CartScreen from './screens/CartScreen';
import StaffCartScreen from './screens/StaffCartScreen';
import RetailerOrderScreen from './screens/retailer/RetailerOrderScreen';
import StaffScreen from './screens/sales_executive/StaffScreen';
import StaffDashboard from './screens/sales_executive/StaffDashboard';
import StaffOrderScreen from './screens/sales_executive/StaffOrderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

function SplashOverlay({ onFinish }: { onFinish: () => void }) {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    scale.value = withSequence(
      withTiming(1.04, { duration: 420 }),
      withTiming(1, { duration: 180 })
    );

    const timer = setTimeout(onFinish, 1450);
    return () => clearTimeout(timer);
  }, [onFinish, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(240)}
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: '#f8fbff',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
        },
      ]}
    >
      <Animated.View style={[animatedStyle, { alignItems: 'center', paddingHorizontal: 28 }]}>
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 28,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#185FA5',
            shadowOpacity: 0.16,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 14 },
            elevation: 10,
            marginBottom: 18,
          }}
        >
          <Image
            source={require('./assets/icon.png')}
            style={{ width: 74, height: 74 }}
            resizeMode="contain"
          />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>Seerweb OMS</Text>
        <Text
          style={{
            fontSize: 14,
            color: '#64748b',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Fast order management for your daily selling workflow
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function AppContent() {
  const { mode } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ImageBackground
      source={require('./assets/images/bga.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
      imageStyle={{ opacity: 0.2 }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor:
              mode === 'dark'
                ? 'rgba(0,0,0,0.65)'
                : 'rgba(255,255,255,0.2)',
          },
        ]}
      />

      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator
          initialRouteName="AuthLoading"
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="RetailerDashboard" component={RetailerDashboardScreen} />
          <Stack.Screen name="RetailerHome" component={RetailerHomeScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="StaffCartScreen" component={StaffCartScreen} />
          <Stack.Screen name="RetailerOrderScreen" component={RetailerOrderScreen} />
          <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
          <Stack.Screen name="StaffScreen" component={StaffScreen} />
          <Stack.Screen name="StaffOrderScreen" component={StaffOrderScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {showSplash ? <SplashOverlay onFinish={() => setShowSplash(false)} /> : null}
    </ImageBackground>
  );
}

export default function App() {
  return (
    <CartProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </CartProvider>
  );
}
