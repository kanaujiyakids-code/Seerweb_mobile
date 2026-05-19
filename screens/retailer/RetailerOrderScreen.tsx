import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { apiUrl } from 'apiurl';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';

const TABS = ['all', 'pending', 'approved', 'delivered'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-200 text-yellow-800 w-20',
  approved: 'bg-blue-200 text-blue-800 w-20',
  delivered: 'bg-green-200 text-green-800 w-20',
  cancelled: 'bg-red-200 text-red-800 w-20',
};

interface OrderItem {
  product: {
    name: string;
    price: number;
  };
  quantity: number;
}
interface Order {
  id: number;
  date: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  storeName:string;
}

const DATE_FILTERS = [
  'All',
  'Today',
  'Yesterday',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'Custom Period',
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 'All'];

const RetailerOrderScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        return;
      }

      const userData = JSON.parse(userString);
      if (userData.role !== 'retailer') {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'DealerDashboard' }] }));
        return;
      }

      setUser(userData);
      setUserId(userData.id);
      setRole(userData.role);
    };
    fetchUser();
  }, []);

  // Fetch orders
  useEffect(() => {
    if (!userId) return;
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${apiUrl}/orders?retailerId=${userId}`);
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [userId]);

  // Date filter logic
  const applyDateFilter = (orderDate: Date) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    switch (dateFilter) {
      case 'Today':
        return orderDate.toDateString() === now.toDateString();
      case 'Yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      case 'This Week':
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      case 'Last Week':
        const lastWeekStart = new Date(startOfWeek);
        lastWeekStart.setDate(startOfWeek.getDate() - 7);
        const lastWeekEnd = new Date(endOfWeek);
        lastWeekEnd.setDate(endOfWeek.getDate() - 7);
        return orderDate >= lastWeekStart && orderDate <= lastWeekEnd;
      case 'This Month':
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      case 'Last Month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
      case 'Custom Period':
        if (fromDate && toDate) {
          return orderDate >= fromDate && orderDate <= toDate;
        }
        return true;
      default:
        return true;
    }
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => (activeTab === 'all' ? true : o.status === activeTab))
      .filter((o) =>
        o.id.toString().includes(searchText) ||
        o.total.toString().includes(searchText) ||
        o.items.some((item) =>
          item.product.name.toLowerCase().includes(searchText.toLowerCase())
        )
      )
      .filter((o) => applyDateFilter(new Date(o.createdAt)));
  }, [orders, activeTab, searchText, dateFilter, fromDate, toDate]);

  const isAll = itemsPerPage.toString() === 'All';
  const perPage = isAll ? filteredOrders.length : Number(itemsPerPage);

  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const indexOfLastItem = currentPage * perPage;
  const indexOfFirstItem = indexOfLastItem - perPage;

  const paginatedOrders = isAll
    ? sortedOrders
    : sortedOrders.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = isAll ? 1 : Math.ceil(filteredOrders.length / perPage);


  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Navbar user={user?.name} />
    <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="mb-4">
        <Text className="text-2xl font-bold text-gray-900">My Orders</Text>
        <Text className="text-gray-600">Track your order history and status</Text>
      </View>

      {/* Controls */}
      <View className="flex-col mb-4 space-y-3">

        {/* Search Bar */}
        <TextInput
          placeholder="Search by ID or product name"
          value={searchText}
          onChangeText={setSearchText}
          className="bg-white px-4 py-2 rounded-lg border border-gray-300"
        />

        {/* Date Filter Dropdown */}
        <View className="relative mt-4">
          <Pressable
            onPress={() => setShowDateDropdown(!showDateDropdown)}
            className="bg-blue-400 px-4 py-2 rounded-lg flex-row justify-between items-center"
          >
            <Text className="text-white font-medium">{dateFilter}</Text>
            <Feather name={showDateDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="white" />
          </Pressable>

          {showDateDropdown && (
            <View className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {DATE_FILTERS.map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => {
                    setDateFilter(filter);
                    setShowDateDropdown(false);
                  }}
                  className={`px-4 py-2 ${dateFilter === filter ? 'bg-blue-100' : 'bg-white'}`}
                >
                  <Text className="text-gray-800">{filter}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Custom Period Date Pickers */}
        {dateFilter === 'Custom Period' && (
          <View className="flex-row justify-between">
            <Pressable
              onPress={() => setShowFromPicker(true)}
              className="bg-white px-3 py-2 rounded-lg border border-gray-300 w-[48%]"
            >
              <Text>{fromDate ? fromDate.toDateString() : 'From Date'}</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowToPicker(true)}
              className="bg-white px-3 py-2 rounded-lg border border-gray-300 w-[48%]"
            >
              <Text>{toDate ? toDate.toDateString() : 'To Date'}</Text>
            </Pressable>

            {showFromPicker && (
              <DateTimePicker
                value={fromDate || new Date()}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowFromPicker(false);
                  if (date) setFromDate(date);
                }}
              />
            )}
            {showToPicker && (
              <DateTimePicker
                value={toDate || new Date()}
                mode="date"
                display="default"
                onChange={(e, date) => {
                  setShowToPicker(false);
                  if (date) setToDate(date);
                }}
              />
            )}
          </View>
        )}
      </View>      

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            className={`mr-3 px-4 py-2 rounded-full ${activeTab === tab ? 'bg-blue-600' : 'bg-gray-200'}`}
            onPress={() => setActiveTab(tab)}
          >
            <Text className={`text-sm font-medium ${activeTab === tab ? 'text-white' : 'text-gray-800'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Table */}
      <View className="relative">
      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="bg-blue-400 mb-2 px-4 py-2 rounded-lg flex-row justify-between items-center w-20"
      >
        <Text className="text-gray-800 text-white">{itemsPerPage}</Text>
        <Feather name={showDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="white" />
      </Pressable>

      {showDropdown && (
        <View className="absolute top-12 left-0 right-0 bg-white border border-blue-400 rounded-lg shadow-lg z-10">
          <ScrollView>
            {ITEMS_PER_PAGE_OPTIONS.map((num) => (
              <Pressable
                key={num.toString()}
                onPress={() => {
                  setItemsPerPage(num === 'All' ? filteredOrders.length : Number(num));
                  setCurrentPage(1);
                  setShowDropdown(false);
                }}
                className={`px-4 py-2 ${itemsPerPage === num ? 'bg-blue-100' : 'bg-white'}`}
              >
                <Text className="text-gray-800">{num}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      </View>
      <View className="flex-row">
        
        {/* ID Column */}
        <View className="w-[50px] bg-white rounded-l-xl shadow">
          <View className="h-14 justify-center border-b border-gray-200">
            <Text className="font-semibold text-gray-600 text-center">ID</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : paginatedOrders.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">No orders</Text>
          ) : (
            paginatedOrders.map((order, index) => (
              <View key={order.id} className={`h-14 py-2 justify-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                <Text className="text-center text-gray-800">{order.id}</Text>
              </View>
            ))
          )}
        </View>

        {/* Scrollable Columns */}
        <ScrollView horizontal showsHorizontalScrollIndicator className="bg-white rounded-r-xl shadow">
          <View className="min-w-[500px]">
            <View className="flex-row h-14 border-b border-gray-200 bg-gray-100 items-center">
              <Text className="w-[100px] font-semibold text-center text-gray-600">Customer</Text>
              <Text className="w-[80px] font-semibold text-center text-gray-600">Total</Text>
              <Text className="w-[100px] font-semibold text-center text-gray-600">Date</Text>
              <Text className="w-[110px] font-semibold text-center text-gray-600">Status</Text>
              <Text className="w-[100px] font-semibold text-center text-gray-600">View</Text>
            </View>

            {paginatedOrders.map((order, index) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <View
                  key={order.id}
                  className={`flex-row h-14 py-2 items-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}
                >
                  <Text className="w-[100px] text-center text-gray-800">{order.storeName}</Text>
                  <Text className="w-[80px] text-center text-gray-800">
                    ₹ {Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text className="w-[100px] text-center text-gray-800">{formattedDate}</Text>
                  <View className="w-[110px] items-center">
                    <Text
                      className={`text-xs px-1 py-1 rounded-full text-center ${STATUS_COLORS[order.status.toLowerCase()]}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSelectedOrder(order);
                      setModalVisible(true);
                    }}
                  >
                    <Text className="w-[100px] text-center text-blue-600 underline">View</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>

      </View>
      {/* Pagination Controls */}
      <View className="flex-row items-center mt-4 mb-8 space-x-2">
        <Pressable
          disabled={currentPage === 1}
          onPress={() => setCurrentPage(currentPage - 1)}
          className="px-3 py-1 bg-blue-400 rounded"
        >
          <Text className="text-white">Prev</Text>
        </Pressable>
        <Text className="mx-2">{currentPage}/{totalPages || 1}</Text>
        <Pressable
          disabled={currentPage === totalPages}
          onPress={() => setCurrentPage(currentPage + 1)}
          className="px-3 py-1 bg-blue-400 rounded"
        >
          <Text className="text-white">Next</Text>
        </Pressable>
      </View>

      {/* Order Modal */}
      {selectedOrder && (
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white px-6 pt-6 pb-4 rounded-xl w-80 shadow-lg relative">
              <Pressable
                className="absolute top-3 right-3"
                onPress={() => setModalVisible(false)}
              >
                <Feather name="x" size={20} color="red" />
              </Pressable>

              <Text className="text-center font-bold text-lg mb-4">Order Details</Text>
              <Text className="text-sm text-gray-500 mb-3">
                Order #{String(selectedOrder.id)} - {new Date(selectedOrder.createdAt).toLocaleString()}
              </Text>

              <View className="mb-4">
                <Text className="font-semibold mb-2">Items:</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} className="flex-row justify-between items-start mb-2">
                    <Text className="text-sm text-gray-800 flex-1 mr-3" style={{ flexShrink: 1 }}>
                      {item.product.name} x {item.quantity}
                    </Text>
                    <Text className="text-sm text-gray-800 font-medium" style={{ flexShrink: 0 }}>
                      ₹ {(item.product.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between">
                <Text className="font-bold text-base">Total:</Text>
                <Text className="font-bold text-base">
                  ₹ {selectedOrder.total
                    ? Number(selectedOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
    <BottomTabNavigator />
    </SafeAreaView>
    
  );
};

export default RetailerOrderScreen;