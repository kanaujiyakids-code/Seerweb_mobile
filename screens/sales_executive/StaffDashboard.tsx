/**
 * StaffDashboard — with screenDataCache
 *
 * Uses screenDataCache from BottomTabNavigator so that when the tab is
 * pressed and the screen remounts (due to CommonActions.reset), it renders
 * immediately from cached data with zero visible loading delay.
 * Data is refreshed silently in the background.
 */
import React, { useEffect, useState, useMemo, memo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable,
  Linking, StyleSheet, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import RefreshWrapper from '../../components/RefreshWrapper';
import BottomTabNavigator, { screenDataCache } from '../../components/BottomTabNavigator';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '@/lib/services/api';
import Navbar from '../../components/Navbar';

const CACHE_KEY = 'StaffDashboard';

type OrderItem = { quantity: number; price: number };
type Order = { id: number; ledgerName: string; createdAt: string; items: OrderItem[]; status?: string };

// ── Memoized StatCard ─────────────────────────────────────────────────────────
const StatCard = memo(({ title, value, icon, bgColor, change }: {
  title: string; value: number | string; icon: React.ReactNode; bgColor: string; change?: number;
}) => {
  const isPositive = change === undefined || change >= 0;
  const cc = isPositive ? '#10b981' : '#ef4444';
  return (
    <View style={styles.statCard}>
      <View style={styles.statRow}>
        <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.statIcon, { backgroundColor: bgColor }]}>{icon}</View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {change !== undefined && (
        <View style={styles.changeRow}>
          <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#d1fae5' : '#fee2e2' }]}>
            <Text style={[styles.changeText, { color: cc }]}>{isPositive ? '↑ +' : '↓ '}{change.toFixed(1)}%</Text>
          </View>
          <Text style={styles.changeLabel}>vs last month</Text>
        </View>
      )}
    </View>
  );
});

// ── Memoized DonutChart ───────────────────────────────────────────────────────
const DonutChart = memo(({ data, size }: { data: { label: string; value: number; color: string }[]; size: number }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <View style={{ width: size, height: size }} />;
  const r = size / 2 - 15, ir = r * 0.6, c = size / 2;
  let angle = -90;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const paths = data.map((item, i) => {
    if (!item.value) return null;
    const sweep = (item.value / total) * 360;
    const sa = angle; angle += sweep;
    const ea = angle;
    const x1 = c + r * Math.cos(toRad(sa)), y1 = c + r * Math.sin(toRad(sa));
    const x2 = c + r * Math.cos(toRad(ea)), y2 = c + r * Math.sin(toRad(ea));
    const x3 = c + ir * Math.cos(toRad(ea)), y3 = c + ir * Math.sin(toRad(ea));
    const x4 = c + ir * Math.cos(toRad(sa)), y4 = c + ir * Math.sin(toRad(sa));
    const la = sweep > 180 ? 1 : 0;
    return <Path key={i} d={`M${x1} ${y1}A${r} ${r} 0 ${la} 1 ${x2} ${y2}L${x3} ${y3}A${ir} ${ir} 0 ${la} 0 ${x4} ${y4}Z`} fill={item.color} />;
  });
  return (
    <Svg width={size} height={size}>
      <G>{paths}</G>
      <SvgText x={c} y={c - 5} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1f2937">{total}</SvgText>
      <SvgText x={c} y={c + 12} textAnchor="middle" fontSize="9" fill="#6b7280">Total Orders</SvgText>
    </Svg>
  );
});

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = memo(() => (
  <View style={{ padding: 16 }}>
    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
      {[0,1,2,3].map(i => <View key={i} style={{ flex: 1, height: 90, backgroundColor: '#e5e7eb', borderRadius: 16, marginRight: i < 3 ? 8 : 0 }} />)}
    </View>
    <View style={{ height: 200, backgroundColor: '#e5e7eb', borderRadius: 16, marginBottom: 12 }} />
    <View style={{ height: 220, backgroundColor: '#e5e7eb', borderRadius: 16 }} />
  </View>
));

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#dbeafe', text: '#1e40af' },
  delivered:{ bg: '#d1fae5', text: '#065f46' },
};
const LAST_MONTH = { totalOrders: 5, totalCustomers: 4, pendingOrders: 1 };

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ✅ Load from cache immediately — no blank screen on tab switch
  const cached = screenDataCache[CACHE_KEY];
  const [user, setUser]         = useState<any>(cached?.user ?? null);
  const [orders, setOrders]     = useState<Order[]>(cached?.orders ?? []);
  const [retailers, setRetailers] = useState<any[]>(cached?.retailers ?? []);
  const [loading, setLoading]   = useState(!cached); // skip loading if cache exists

  const fetchData = useCallback(async (executiveId: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersRes, retailersRes] = await Promise.all([
        apiGet(`/orders/byexecutive?executiveid=${executiveId}`),
        apiGet(`/staff/get_retailers_by_executive?executiveid=${executiveId}`),
      ]);
      const norm = (d: any) => Array.isArray(d) ? d : Array.isArray(d?.orders) ? d.orders : Array.isArray(d?.data) ? d.data : [];
      const o = norm(ordersRes);
      const r = norm(retailersRes);
      setOrders(o);
      setRetailers(r);
      // ✅ Save to cache so next remount is instant
      screenDataCache[CACHE_KEY] = { user, orders: o, retailers: r };
    } catch (e) {
      console.error('Dashboard load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) { navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })); return; }
      const userData = JSON.parse(userStr);
      if (userData.role !== 'staff') { navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'RetailerDashboard' }] })); return; }
      setUser(userData);
      screenDataCache[CACHE_KEY] = { ...screenDataCache[CACHE_KEY], user: userData };

      if (cached) {
        // ✅ Already rendered from cache — refresh silently in background
        fetchData(userData.id, true);
      } else {
        fetchData(userData.id, false);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Single-pass stats ─────────────────────────────────────────────────────
  const dash = useMemo(() => {
    let pending = 0, approved = 0, delivered = 0;
    const recent: Order[] = [];
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const st = o.status ?? 'pending';
      if (st === 'pending') pending++;
      else if (st === 'approved') approved++;
      else if (st === 'delivered') delivered++;
      if (i < 4) recent.push(o);
    }
    const calc = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100;
    const recentOrders = recent.map(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      return {
        id: o.id, storeName: o.ledgerName,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
        total: items.reduce((s, i) => s + i.quantity * i.price, 0),
        date: o.createdAt, status: o.status ?? 'pending',
      };
    });
    return {
      totalOrders: orders.length, pending, approved, delivered,
      totalCustomers: retailers.length,
      totalOrdersChange: calc(orders.length, LAST_MONTH.totalOrders),
      customersChange: calc(retailers.length, LAST_MONTH.totalCustomers),
      pendingChange: calc(pending, LAST_MONTH.pendingOrders),
      statusDist: [
        { label: 'Pending', value: pending, color: '#f59e0b' },
        { label: 'Approved', value: approved, color: '#3b82f6' },
        { label: 'Delivered', value: delivered, color: '#10b981' },
      ],
      recentOrders,
    };
  }, [orders, retailers]);

  const topCustomers = useMemo(() => retailers.slice(0, 3), [retailers]);

  const handleRefresh = useCallback(async () => {
    if (user?.id) await fetchData(user.id, false);
  }, [user, fetchData]);

  // ✅ All internal navigation also uses reset to prevent overlap
  const goTo = useCallback((screen: keyof RootStackParamList) => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: screen }] }));
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Navbar user={user?.name} />

      {loading ? (
        <Skeleton />
      ) : (
        <RefreshWrapper onRefresh={handleRefresh}>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            removeClippedSubviews
          >
            {/* Stats */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingRight: 16 }}>
              <StatCard title="Total Orders" value={dash.totalOrders} icon={<Feather name="shopping-bag" size={18} color="#3b82f6" />} bgColor="#dbeafe" change={dash.totalOrdersChange} />
              <StatCard title="Customers" value={dash.totalCustomers} icon={<Feather name="users" size={18} color="#8b5cf6" />} bgColor="#ede9fe" change={dash.customersChange} />
              <StatCard title="Pending" value={dash.pending} icon={<Feather name="clock" size={18} color="#f59e0b" />} bgColor="#fef3c7" change={dash.pendingChange} />
              <StatCard title="Delivered" value={dash.delivered} icon={<Feather name="check-circle" size={18} color="#10b981" />} bgColor="#d1fae5" />
            </ScrollView>

            {/* Charts Row */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.cardTitle}>Order Status</Text>
                <View style={{ alignItems: 'center' }}>
                  <DonutChart data={dash.statusDist} size={120} />
                </View>
                <View style={{ marginTop: 8 }}>
                  {dash.statusDist.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, marginRight: 6 }} />
                      <Text style={{ color: '#6b7280', fontSize: 10, flex: 1 }}>{item.label}</Text>
                      <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 10 }}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.card, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.cardTitle}>Top Customers</Text>
                {topCustomers.map((c) => (
                  <Pressable key={c.id} style={styles.customerRow} onPress={() => c.phone && Linking.openURL(`tel:${c.phone}`)}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{c.name.charAt(0)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName} numberOfLines={1}>{c.store_name}</Text>
                      <Text style={styles.customerSub}>{c.name}</Text>
                    </View>
                    <Ionicons name="call-outline" size={14} color="#3b82f6" />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Recent Orders */}
            <View style={[styles.card, { marginBottom: 16 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.cardTitle}>Recent Orders</Text>
                <Pressable onPress={() => goTo('StaffOrderScreen')}><Text style={styles.viewAll}>View all</Text></Pressable>
              </View>
              {dash.recentOrders.map((order, i) => (
                <View key={order.id} style={[styles.orderRow, i !== dash.recentOrders.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                  <View style={styles.orderIcon}><Feather name="package" size={16} color="#6366f1" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderName}>#{order.id} - {order.storeName}</Text>
                    <Text style={styles.orderSub}>{order.itemCount} items · {new Date(order.date).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderTotal}>₹{order.total.toLocaleString('en-IN')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status]?.bg ?? '#f3f4f6' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[order.status]?.text ?? '#374151' }]}>{order.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={[styles.card, { marginBottom: 24 }]}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 10 }}>
                <Pressable style={[styles.btn, styles.btnPrimary, { marginRight: 8 }]} onPress={() => goTo('StaffScreen')}>
                  <Feather name="plus-circle" size={18} color="#fff" /><Text style={styles.btnPrimaryText}>New Order</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnOutline, { marginLeft: 8 }]} onPress={() => goTo('StaffOrderScreen')}>
                  <Feather name="list" size={18} color="#374151" /><Text style={styles.btnOutlineText}>All Orders</Text>
                </Pressable>
              </View>
              <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => goTo('StaffCartScreen')}>
                <Feather name="shopping-cart" size={18} color="#374151" /><Text style={styles.btnOutlineText}>View Cart</Text>
              </Pressable>
            </View>
          </ScrollView>
        </RefreshWrapper>
      )}

      <BottomTabNavigator />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, minWidth: 150, marginRight: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statTitle: { color: '#6b7280', fontSize: 12, fontWeight: '500', flex: 1 },
  statIcon: { padding: 8, borderRadius: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  changeText: { fontSize: 11, fontWeight: '600' },
  changeLabel: { color: '#9ca3af', fontSize: 10, marginLeft: 4 },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  customerName: { fontSize: 12, fontWeight: '500', color: '#1f2937' },
  customerSub: { fontSize: 10, color: '#6b7280' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  viewAll: { color: '#2563eb', fontSize: 12, fontWeight: '500' },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  orderIcon: { backgroundColor: '#eef2ff', padding: 8, borderRadius: 8, marginRight: 12 },
  orderName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  orderSub: { fontSize: 12, color: '#6b7280' },
  orderTotal: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '500' },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#4f46e5' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 14 },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  btnOutlineText: { color: '#374151', fontWeight: '600', marginLeft: 8, fontSize: 14 },
});