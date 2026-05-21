import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { apiUrl } from 'apiurl';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';

const TABS = ['all', 'pending', 'approved', 'delivered'];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef08a', text: '#854d0e' },
  approved:  { bg: '#bfdbfe', text: '#1e40af' },
  delivered: { bg: '#bbf7d0', text: '#166534' },
  cancelled: { bg: '#fecaca', text: '#991b1b' },
};

interface OrderItem {
  product: { name: string; price: number };
  quantity: number;
}

interface Order {
  id: string;
  retailerId: string;
  retailerName: string;
  retailerStoreName: string;
  storeName: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  order_by_id?: string;
}

interface Retailer {
  id: number;
  store_name: string;
  registration_date: string;
  assigned: string;
}

const DATE_FILTERS = [
  'All', 'Today', 'Yesterday', 'This Week', 'Last Week',
  'This Month', 'Last Month', 'Custom Period',
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 'All'];

const StaffOrderScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [reportRetailerId, setReportRetailerId] = useState('all');
  const [reportStaffId, setReportStaffId] = useState('all');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | string>(10);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) { navigation.navigate('Login' as never); return; }
      const parsedUser = JSON.parse(userString);
      if (parsedUser.role !== 'staff') { navigation.navigate('Login' as never); return; }
      setUserId(parsedUser.id);
      setReportStaffId(parsedUser.id);
      setUser(parsedUser);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${apiUrl}/orders/byexecutive?executiveid=${userId}`);
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

  useEffect(() => {
    if (!userId) return;
    const fetchRetailers = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const response = await fetch(
          `${apiUrl}/staff/get_retailers_by_executive?executiveid=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        setRetailers(data);
      } catch (err) {
        console.error('Retailers fetch error:', err);
      }
    };
    fetchRetailers();
  }, [userId]);

  useEffect(() => {
    if (!Array.isArray(retailers)) { setFilteredRetailers([]); return; }
    let filtered = [...retailers];
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfLastWeek = new Date(startOfWeek); startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek); endOfLastWeek.setDate(startOfWeek.getDate() - 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    filtered = filtered.filter((r) => {
      if (!r.registration_date) return false;
      const regDate = new Date(r.registration_date);
      switch (dateFilter) {
        case 'Today':       return regDate.toDateString() === today.toDateString();
        case 'Yesterday':   return regDate.toDateString() === yesterday.toDateString();
        case 'This Week':   return regDate >= startOfWeek && regDate <= endOfWeek;
        case 'Last Week':   return regDate >= startOfLastWeek && regDate <= endOfLastWeek;
        case 'This Month':  return regDate >= startOfMonth && regDate <= endOfMonth;
        case 'Last Month':  return regDate >= startOfLastMonth && regDate <= endOfLastMonth;
        case 'Custom Period':
          if (!fromDate || !toDate) return true;
          const to = new Date(toDate); to.setHours(23, 59, 59, 999);
          return regDate >= fromDate && regDate <= to;
        default: return true;
      }
    });
    setFilteredRetailers(filtered);
  }, [dateFilter, fromDate, toDate, retailers]);

  const applyDateFilter = (orderDate: Date) => {
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
    switch (dateFilter) {
      case 'Today':   return orderDate.toDateString() === now.toDateString();
      case 'Yesterday':
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      case 'This Week': return orderDate >= startOfWeek && orderDate <= endOfWeek;
      case 'Last Week':
        const lwS = new Date(startOfWeek); lwS.setDate(startOfWeek.getDate() - 7);
        const lwE = new Date(endOfWeek); lwE.setDate(endOfWeek.getDate() - 7);
        return orderDate >= lwS && orderDate <= lwE;
      case 'This Month':
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      case 'Last Month':
        const lm = new Date(now); lm.setMonth(now.getMonth() - 1);
        return orderDate.getMonth() === lm.getMonth() && orderDate.getFullYear() === lm.getFullYear();
      case 'Custom Period':
        if (fromDate && toDate) return orderDate >= fromDate && orderDate <= toDate;
        return true;
      default: return true;
    }
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => (activeTab === 'all' ? true : o.status === activeTab))
      .filter((o) =>
        o.id.toString().includes(searchText) ||
        o.total.toString().includes(searchText) ||
        o.items.some((item) => item.product.name.toLowerCase().includes(searchText.toLowerCase()))
      )
      .filter((o) => applyDateFilter(new Date(o.createdAt)))
      .filter((o) => reportRetailerId === 'all' ? true : String(o.retailerId) === reportRetailerId);
  }, [orders, activeTab, searchText, dateFilter, fromDate, toDate, reportRetailerId]);

  const isAll = itemsPerPage === 'All';
  const perPage = isAll ? filteredOrders.length : Number(itemsPerPage);
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const indexOfLastItem = currentPage * perPage;
  const indexOfFirstItem = indexOfLastItem - perPage;
  const paginatedOrders = isAll ? sortedOrders : sortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = isAll ? 1 : Math.ceil(filteredOrders.length / perPage);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Navbar user={user?.name} />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>My Orders</Text>
          <Text style={{ color: '#4b5563', marginTop: 2 }}>Track your order history and status</Text>
        </View>

        {/* Search */}
        <TextInput
          placeholder="Search by ID or product name"
          value={searchText}
          onChangeText={setSearchText}
          style={{
            backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
            borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db',
            marginBottom: 12, fontSize: 14,
          }}
          placeholderTextColor="#9ca3af"
        />

        {/* Date Filter Dropdown */}
        <View style={{ position: 'relative', marginBottom: 12, zIndex: 30 }}>
          <Pressable
            onPress={() => { setShowDateDropdown(!showDateDropdown); setShowCustomerDropdown(false); setShowLimitDropdown(false); }}
            style={{
              backgroundColor: '#60a5fa', paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '500' }}>{dateFilter}</Text>
            <Feather name={showDateDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="white" />
          </Pressable>
          {showDateDropdown && (
            <View style={{
              position: 'absolute', top: 46, left: 0, right: 0,
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
              borderRadius: 10, elevation: 8, shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, zIndex: 999,
            }}>
              {DATE_FILTERS.map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => { setDateFilter(filter); setShowDateDropdown(false); }}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10,
                    backgroundColor: dateFilter === filter ? '#eff6ff' : '#fff',
                  }}
                >
                  <Text style={{ color: '#1f2937' }}>{filter}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Custom Period Pickers */}
        {dateFilter === 'Custom Period' && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Pressable
              onPress={() => setShowFromPicker(true)}
              style={{
                backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
                borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', width: '48%',
              }}
            >
              <Text style={{ color: '#374151' }}>{fromDate ? fromDate.toDateString() : 'From Date'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowToPicker(true)}
              style={{
                backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
                borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', width: '48%',
              }}
            >
              <Text style={{ color: '#374151' }}>{toDate ? toDate.toDateString() : 'To Date'}</Text>
            </Pressable>
            {showFromPicker && (
              <DateTimePicker value={fromDate || new Date()} mode="date" display="default"
                onChange={(e, date) => { setShowFromPicker(false); if (date) setFromDate(date); }} />
            )}
            {showToPicker && (
              <DateTimePicker value={toDate || new Date()} mode="date" display="default"
                onChange={(e, date) => { setShowToPicker(false); if (date) setToDate(date); }} />
            )}
          </View>
        )}

        {/* Customer Filter Dropdown */}
        <View style={{ position: 'relative', marginBottom: 12, zIndex: 20 }}>
          <Pressable
            onPress={() => { setShowCustomerDropdown(!showCustomerDropdown); setShowLimitDropdown(false); setShowDateDropdown(false); }}
            style={{
              backgroundColor: '#60a5fa', paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '500' }}>
              {reportRetailerId === 'all'
                ? 'All Customers'
                : filteredRetailers.find(r => String(r.id) === reportRetailerId)?.store_name || 'Select Customer'}
            </Text>
            <Feather name={showCustomerDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="white" />
          </Pressable>
          {showCustomerDropdown && (
            <View style={{
              position: 'absolute', top: 46, left: 0, right: 0, maxHeight: 240,
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
              borderRadius: 10, elevation: 8, shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, zIndex: 999,
            }}>
              <ScrollView>
                <Pressable
                  onPress={() => { setReportRetailerId('all'); setShowCustomerDropdown(false); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: reportRetailerId === 'all' ? '#eff6ff' : '#fff' }}
                >
                  <Text style={{ color: '#1f2937' }}>All Customers</Text>
                </Pressable>
                {filteredRetailers.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => { setReportRetailerId(String(r.id)); setShowCustomerDropdown(false); }}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: reportRetailerId === String(r.id) ? '#eff6ff' : '#fff' }}
                  >
                    <Text style={{ color: '#1f2937' }}>{r.store_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Status Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                marginRight: 12, paddingHorizontal: 16, paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: activeTab === tab ? '#2563eb' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === tab ? '#fff' : '#1f2937' }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Items per page */}
        <View style={{ position: 'relative', marginBottom: 8, zIndex: 10 }}>
          <Pressable
            onPress={() => { setShowLimitDropdown(!showLimitDropdown); setShowCustomerDropdown(false); setShowDateDropdown(false); }}
            style={{
              backgroundColor: '#60a5fa', paddingHorizontal: 12, paddingVertical: 8,
              borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', width: 80,
            }}
          >
            <Text style={{ color: '#fff' }}>{itemsPerPage}</Text>
            <Feather name={showLimitDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="white" />
          </Pressable>
          {showLimitDropdown && (
            <View style={{
              position: 'absolute', top: 42, left: 0, width: 120,
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#60a5fa',
              borderRadius: 8, elevation: 8, zIndex: 999,
            }}>
              {ITEMS_PER_PAGE_OPTIONS.map((num) => (
                <Pressable
                  key={num.toString()}
                  onPress={() => {
                    setItemsPerPage(num === 'All' ? filteredOrders.length : Number(num));
                    setCurrentPage(1);
                    setShowLimitDropdown(false);
                  }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: itemsPerPage === num ? '#eff6ff' : '#fff' }}
                >
                  <Text style={{ color: '#1f2937' }}>{num}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Table */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {/* ID Column */}
          <View style={{
            width: 52, backgroundColor: '#fff',
            borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
          }}>
            <View style={{ height: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f3f4f6', borderTopLeftRadius: 12 }}>
              <Text style={{ fontWeight: '600', color: '#4b5563', textAlign: 'center', fontSize: 13 }}>ID</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 12 }} />
            ) : paginatedOrders.length === 0 ? (
              <Text style={{ color: '#6b7280', textAlign: 'center', paddingVertical: 16, fontSize: 12 }}>—</Text>
            ) : (
              paginatedOrders.map((order, index) => (
                <View
                  key={order.id}
                  style={{ height: 52, justifyContent: 'center', backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb' }}
                >
                  <Text style={{ textAlign: 'center', color: '#1f2937', fontSize: 13 }}>{order.id}</Text>
                </View>
              ))
            )}
          </View>

          {/* Scrollable Columns */}
          <ScrollView horizontal showsHorizontalScrollIndicator style={{
            backgroundColor: '#fff', borderTopRightRadius: 12, borderBottomRightRadius: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
          }}>
            <View style={{ minWidth: 420 }}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', height: 52, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f3f4f6', alignItems: 'center', borderTopRightRadius: 12 }}>
                <Text style={{ width: 110, fontWeight: '600', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>Customer</Text>
                <Text style={{ width: 90, fontWeight: '600', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>Total</Text>
                <Text style={{ width: 100, fontWeight: '600', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>Date</Text>
                <Text style={{ width: 100, fontWeight: '600', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>Status</Text>
                <Text style={{ width: 80, fontWeight: '600', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>View</Text>
              </View>

              {paginatedOrders.length === 0 && !loading ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#6b7280', textAlign: 'center' }}>No orders found</Text>
                </View>
              ) : (
                paginatedOrders.map((order, index) => {
                  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  });
                  const statusStyle = STATUS_STYLES[order.status.toLowerCase()] ?? { bg: '#f3f4f6', text: '#374151' };
                  return (
                    <View
                      key={order.id}
                      style={{ flexDirection: 'row', height: 52, alignItems: 'center', backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb' }}
                    >
                      <Text style={{ width: 110, textAlign: 'center', color: '#1f2937', fontSize: 13, paddingHorizontal: 4 }} numberOfLines={2}>
                        {order.storeName}
                      </Text>
                      <Text style={{ width: 90, textAlign: 'center', color: '#1f2937', fontSize: 13 }}>
                        ₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={{ width: 100, textAlign: 'center', color: '#1f2937', fontSize: 12 }}>{formattedDate}</Text>
                      <View style={{ width: 100, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 11, paddingHorizontal: 8, paddingVertical: 3,
                          borderRadius: 999, textAlign: 'center',
                          backgroundColor: statusStyle.bg, color: statusStyle.text,
                          fontWeight: '600', overflow: 'hidden',
                        }}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => { setSelectedOrder(order); setModalVisible(true); }}
                        style={{ width: 80, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#2563eb', textDecorationLine: 'underline', fontSize: 13 }}>View</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        {/* Pagination */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 8 }}>
          <Pressable
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(currentPage - 1)}
            style={{
              paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8,
              backgroundColor: currentPage === 1 ? '#93c5fd' : '#60a5fa',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '500' }}>Prev</Text>
          </Pressable>
          <Text style={{ marginHorizontal: 4, color: '#374151', fontWeight: '500' }}>
            {currentPage}/{totalPages || 1}
          </Text>
          <Pressable
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage(currentPage + 1)}
            style={{
              paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8,
              backgroundColor: currentPage === totalPages ? '#93c5fd' : '#60a5fa',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '500' }}>Next</Text>
          </Pressable>
        </View>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{
                backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16,
                borderRadius: 16, width: 320,
                shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
              }}>
                <Pressable style={{ position: 'absolute', top: 12, right: 12 }} onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={20} color="#ef4444" />
                </Pressable>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
                  Order Details
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  Order #{selectedOrder.id} · {new Date(selectedOrder.createdAt).toLocaleString()}
                </Text>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 8, fontSize: 14 }}>Items:</Text>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: '#1f2937', flex: 1, marginRight: 12 }}>
                        {item.product.name} × {item.quantity}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: '500' }}>
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Total:</Text>
                  <Text style={{ fontWeight: 'bold', fontSize: 15 }}>
                    ₹{Number(selectedOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default StaffOrderScreen;