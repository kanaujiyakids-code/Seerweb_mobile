import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Navbar from 'components/Navbar';
import { apiUrl } from 'apiurl';

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newProducts: boolean;
  reminders: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  store_name?: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode, colors, toggleTheme } = useTheme();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<'name' | 'email' | 'phone' | 'password'>('name');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    orderUpdates: true,
    promotions: false,
    newProducts: true,
    reminders: true,
  });
  
  // Logout Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    loadUserData();
    loadNotificationSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        setNotifications(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setNotifications(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const handleEditProfile = (field: 'name' | 'email' | 'phone' | 'password') => {
    setEditField(field);
    if (field === 'password') {
      setEditValue('');
      setConfirmPassword('');
    } else {
      setEditValue(user?.[field] || '');
    }
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    if (editField === 'password') {
      if (editValue.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      if (editValue !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    if (editField === 'email' && !editValue.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setSaving(true);
    
    // Simulate API call
    setTimeout(async () => {
      try {
        if (user && editField !== 'password') {
          const updatedUser = { ...user, [editField]: editValue };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
        Alert.alert('Success', `${editField === 'password' ? 'Password' : 'Profile'} updated successfully`);
        setEditModalVisible(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'cart', 'selectedRetailer']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@seerweb.com?subject=Support Request');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+919876543210');
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name': return 'Full Name';
      case 'email': return 'Email Address';
      case 'phone': return 'Phone Number';
      case 'password': return 'New Password';
      default: return field;
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const changePassword = async () => {
    try {

      if (!user) {
        Alert.alert("Error", "User not found. Please login again.");
        return;
      }

      if (!currentPassword || !editValue || !confirmPassword) {
        Alert.alert("Error", "All password fields are required");
        return;
      }

      if (editValue !== confirmPassword) {
        Alert.alert("Error", "New password and confirm password do not match");
        return;
      }

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${apiUrl}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id, // ✅ safe now
          current_password: currentPassword,
          new_password: editValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Password change failed");
        return;
      }

      Alert.alert("Success", "Password changed successfully");

      setCurrentPassword("");
      setEditValue("");
      setConfirmPassword("");

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1}} edges={['top']}>
      <Navbar user={user?.name} />
      <ScrollView 
        className="flex-1 px-4 pt-4" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6" data-testid="profile-header">
          <Text style={{ color: colors.text }} className="text-2xl font-bold">Settings</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm">
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile Card */}
        {/* <View className="mb-6">
            {user?.role === 'retailer' && user.store_name ? (
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                {user.store_name}
              </Text>
            ) : null}
        </View> */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }} 
          className="rounded-2xl p-4 mb-6 border"
          data-testid="profile-card"
        >
          <View className="flex-row items-center">
            <View 
              style={{ backgroundColor: colors.primaryLight }} 
              className="w-16 h-16 rounded-full items-center justify-center"
            >
              <Text style={{ color: colors.primary }} className="text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text style={{ color: colors.text }} className="text-lg font-semibold">
                {user?.name || 'User'}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                {user?.email || 'email@example.com'}
              </Text>
              <View 
                style={{ backgroundColor: colors.primaryLight }} 
                className="self-start px-2 py-0.5 rounded-full mt-1"
              >
                <Text style={{ color: colors.primary }} className="text-xs font-medium capitalize">
                  {user?.role || 'User'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View className="mb-6">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase mb-3 ml-1">
            Account
          </Text>
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-2xl border overflow-hidden"
          >
            <Pressable 
              className="flex-row items-center p-4 border-b"
              style={{ borderColor: colors.border }}
              // onPress={() => handleEditProfile('name')}
              data-testid="edit-name-btn"
            >
              <View style={{ backgroundColor: colors.primaryLight }} className="p-2 rounded-xl mr-3">
                <Feather name="user" size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Full Name</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">{user?.name || 'Not set'}</Text>
              </View>
              {/* <Feather name="chevron-right" size={20} color={colors.textSecondary} /> */}
            </Pressable>

            <Pressable 
              className="flex-row items-center p-4 border-b"
              style={{ borderColor: colors.border }}
              // onPress={() => handleEditProfile('email')}
              data-testid="edit-email-btn"
            >
              <View style={{ backgroundColor: '#fef3c7' }} className="p-2 rounded-xl mr-3">
                <Feather name="mail" size={18} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Email Address</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">{user?.email || 'Not set'}</Text>
              </View>
              {/* <Feather name="chevron-right" size={20} color={colors.textSecondary} /> */}
            </Pressable>

            <Pressable 
              className="flex-row items-center p-4 border-b"
              style={{ borderColor: colors.border }}
              data-testid="edit-phone-btn"
            >
              <View style={{ backgroundColor: '#d1fae5' }} className="p-2 rounded-xl mr-3">
                <Feather name="phone" size={18} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Phone Number</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">{user?.phone || 'Not set'}</Text>
              </View>
              {/* <Feather name="chevron-right" size={20} color={colors.textSecondary} /> */}
            </Pressable>

            <Pressable 
              className="flex-row items-center p-4"
              onPress={() => handleEditProfile('password')}
              data-testid="change-password-btn"
            >
              <View style={{ backgroundColor: '#fee2e2' }} className="p-2 rounded-xl mr-3">
                <Feather name="lock" size={18} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Change Password</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">Update your password</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Appearance Section */}
        <View className="mb-6" style={{ display: 'none' }}>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase mb-3 ml-1">
            Appearance
          </Text>
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-2xl border overflow-hidden"
          >
            <View className="flex-row items-center p-4">
              <View style={{ backgroundColor: mode === 'dark' ? '#374151' : '#f3f4f6' }} className="p-2 rounded-xl mr-3">
                {mode === 'dark' ? (
                  <Ionicons name="moon" size={18} color="#fbbf24" />
                ) : (
                  <Ionicons name="sunny" size={18} color="#f59e0b" />
                )}
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Dark Mode</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">
                  {mode === 'dark' ? 'Currently enabled' : 'Currently disabled'}
                </Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor="#ffffff"
                data-testid="theme-toggle"
              />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="mb-6" style={{ display: 'none' }}>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase mb-3 ml-1">
            Notifications
          </Text>
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-2xl border overflow-hidden"
          >
            <View className="flex-row items-center p-4 border-b" style={{ borderColor: colors.border }}>
              <View style={{ backgroundColor: '#dbeafe' }} className="p-2 rounded-xl mr-3">
                <Feather name="package" size={18} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Order Updates</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">Get notified about order status</Text>
              </View>
              <Switch
                value={notifications.orderUpdates}
                onValueChange={(val) => saveNotificationSettings({ ...notifications, orderUpdates: val })}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor="#ffffff"
                data-testid="order-updates-toggle"
              />
            </View>

            <View className="flex-row items-center p-4 border-b" style={{ borderColor: colors.border }}>
              <View style={{ backgroundColor: '#fce7f3' }} className="p-2 rounded-xl mr-3">
                <Feather name="tag" size={18} color="#ec4899" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Promotions</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">Deals and special offers</Text>
              </View>
              <Switch
                value={notifications.promotions}
                onValueChange={(val) => saveNotificationSettings({ ...notifications, promotions: val })}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor="#ffffff"
                data-testid="promotions-toggle"
              />
            </View>

            <View className="flex-row items-center p-4 border-b" style={{ borderColor: colors.border }}>
              <View style={{ backgroundColor: '#d1fae5' }} className="p-2 rounded-xl mr-3">
                <Feather name="box" size={18} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">New Products</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">When new products are added</Text>
              </View>
              <Switch
                value={notifications.newProducts}
                onValueChange={(val) => saveNotificationSettings({ ...notifications, newProducts: val })}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor="#ffffff"
                data-testid="new-products-toggle"
              />
            </View>

            <View className="flex-row items-center p-4">
              <View style={{ backgroundColor: '#fef3c7' }} className="p-2 rounded-xl mr-3">
                <Feather name="bell" size={18} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Reminders</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">Cart and order reminders</Text>
              </View>
              <Switch
                value={notifications.reminders}
                onValueChange={(val) => saveNotificationSettings({ ...notifications, reminders: val })}
                trackColor={{ false: '#e5e7eb', true: colors.primary }}
                thumbColor="#ffffff"
                data-testid="reminders-toggle"
              />
            </View>
          </View>
        </View>

        {/* Help & Support Section */}
        <View className="mb-6">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase mb-3 ml-1">
            Help & Support
          </Text>
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-2xl border overflow-hidden"
          >
            {/*
            <Pressable 
              className="flex-row items-center p-4 border-b"
              style={{ borderColor: colors.border }}
              onPress={handleContactSupport}
              data-testid="email-support-btn"
            >
              <View style={{ backgroundColor: '#dbeafe' }} className="p-2 rounded-xl mr-3">
                <Feather name="mail" size={18} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Email Support</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">support@seerweb.com</Text>
              </View>
              <Feather name="external-link" size={18} color={colors.textSecondary} />
            </Pressable>
              */}

            <Pressable 
              className="flex-row items-center p-4 border-b"
              style={{ borderColor: colors.border }}
              onPress={handleCallSupport}
              data-testid="call-support-btn"
            >
              <View style={{ backgroundColor: '#d1fae5' }} className="p-2 rounded-xl mr-3">
                <Feather name="phone-call" size={18} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Call Support</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">+91 8108022420</Text>
              </View>
              <Feather name="external-link" size={18} color={colors.textSecondary} />
            </Pressable>

            {/*  
            <Pressable 
              className="flex-row items-center p-4"
              onPress={() => Linking.openURL('https://seerweb.com/faq')}
              data-testid="faq-btn"
            >
              <View style={{ backgroundColor: '#fef3c7' }} className="p-2 rounded-xl mr-3">
                <Feather name="help-circle" size={18} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">FAQs</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">Frequently asked questions</Text>
              </View>
              <Feather name="external-link" size={18} color={colors.textSecondary} />
            </Pressable>
            */}
          </View>
        </View>

        {/* App Info */}
        <View className="mb-6">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold uppercase mb-3 ml-1">
            About
          </Text>
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-2xl border overflow-hidden"
          >
            <View className="flex-row items-center p-4 border-b" style={{ borderColor: colors.border }}>
              <View style={{ backgroundColor: '#e0e7ff' }} className="p-2 rounded-xl mr-3">
                <MaterialIcons name="info-outline" size={18} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">App Version</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">v{appVersion}</Text>
              </View>
            </View>

          {/*
            <Pressable 
              className="flex-row items-center p-4"
              onPress={() => Linking.openURL('https://seerweb.com/terms')}
            >
              <View style={{ backgroundColor: '#f3f4f6' }} className="p-2 rounded-xl mr-3">
                <Feather name="file-text" size={18} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="font-medium">Terms & Privacy</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">Legal information</Text>
              </View>
              <Feather name="external-link" size={18} color={colors.textSecondary} />
            </Pressable>
          */}
          
          </View>
        </View>

        {/* Logout Button */}
        <Pressable 
          className="rounded-2xl p-4 mb-6 flex-row items-center justify-center"
          style={{ backgroundColor: '#fee2e2' }}
          onPress={() => setLogoutModalVisible(true)}
          data-testid="logout-btn"
        >
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text className="text-red-500 font-semibold ml-2">Logout</Text>
        </Pressable>

        {/* Bottom spacing */}
        <View className="h-4" />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View 
            style={{ backgroundColor: colors.card }} 
            className="w-full max-w-sm rounded-2xl p-5"
          >
            <Text style={{ color: colors.text }} className="text-lg font-bold mb-4">
              Edit {getFieldLabel(editField)}
            </Text>

            {/* NORMAL FIELD */}
            {editField !== 'password' && (
              <TextInput
                style={{ 
                  backgroundColor: colors.inputBg, 
                  color: colors.text,
                  borderColor: colors.border 
                }}
                className="border rounded-xl px-4 py-3 mb-3"
                placeholder={getFieldLabel(editField)}
                placeholderTextColor={colors.textSecondary}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType={
                  editField === 'email'
                    ? 'email-address'
                    : editField === 'phone'
                    ? 'phone-pad'
                    : 'default'
                }
                autoCapitalize={editField === 'email' ? 'none' : 'words'}
              />
            )}

            {/* PASSWORD CHANGE SECTION */}
            {editField === 'password' && (
              <>

                {/* Current Password */}
                <View className="relative mb-3">
                  <TextInput
                    style={{ 
                      backgroundColor: colors.inputBg, 
                      color: colors.text,
                      borderColor: colors.border 
                    }}
                    className="border rounded-xl px-4 py-3 pr-12"
                    placeholder="Enter Current Password"
                    placeholderTextColor={colors.textSecondary}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                  />

                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{ position: 'absolute', right: 12, top: 14 }}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* New Password */}
                <View className="relative mb-3">
                  <TextInput
                    style={{ 
                      backgroundColor: colors.inputBg, 
                      color: colors.text,
                      borderColor: colors.border 
                    }}
                    className="border rounded-xl px-4 py-3 pr-12"
                    placeholder="New Password"
                    placeholderTextColor={colors.textSecondary}
                    value={editValue}
                    onChangeText={setEditValue}
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: 14 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View className="relative mb-3">
                  <TextInput
                    style={{ 
                      backgroundColor: colors.inputBg, 
                      color: colors.text,
                      borderColor: colors.border 
                    }}
                    className="border rounded-xl px-4 py-3 pr-12"
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />

                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: 12, top: 14 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

              </>
            )}

            {/* BUTTONS */}
            <View className="flex-row mt-2">
              <Pressable
                className="flex-1 py-3 rounded-xl mr-2"
                style={{ backgroundColor: colors.border }}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: colors.text }} className="text-center font-semibold">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 py-3 rounded-xl ml-2"
                style={{ backgroundColor: colors.primary }}
                onPress={changePassword}
                disabled={saving}
              >
                <Text className="text-center font-semibold text-white">
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View 
            style={{ backgroundColor: colors.card }} 
            className="w-full max-w-sm rounded-2xl p-5"
          >
            <View className="items-center mb-4">
              <View className="bg-red-100 p-3 rounded-full mb-3">
                <Feather name="log-out" size={28} color="#ef4444" />
              </View>
              <Text style={{ color: colors.text }} className="text-lg font-bold">Logout</Text>
              <Text style={{ color: colors.textSecondary }} className="text-center mt-2">
                Are you sure you want to logout? You'll need to login again to access your account.
              </Text>
            </View>

            <View className="flex-row">
              <Pressable
                className="flex-1 py-3 rounded-xl mr-2"
                style={{ backgroundColor: colors.border }}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={{ color: colors.text }} className="text-center font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-xl ml-2 bg-red-500"
                onPress={handleLogout}
              >
                <Text className="text-center font-semibold text-white">Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}
