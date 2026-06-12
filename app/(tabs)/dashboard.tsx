import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useCabangTodayQuery,
  useDashboardQuery,
} from "../../src/services/queries/dashboard";

const ORANGE = "#B94A1A";

const formatRupiah = (angka: number) =>
  "Rp " + angka.toLocaleString("id-ID", { minimumFractionDigits: 0 });

export default function DashboardScreen({ navigation }: any) {
  const { data: dashboardData } = useDashboardQuery();
  const { data: cabangTodayData } = useCabangTodayQuery();

  return (
    <View style={styles.container}>
      {/* ── Fixed Top Section ── */}
      {/* Header */}
      <View style={styles.header}>
        <StatusBar backgroundColor={ORANGE} barStyle="light-content" />
        <TouchableOpacity>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.fixedContent}>
        {/* Greeting Card */}
        <View style={styles.greetCard}>
          <View style={styles.shopIcon}>
            <MaterialCommunityIcons name="store" size={32} color={ORANGE} />
          </View>
          <View>
            <Text style={styles.greetSub}>Selamat Datang,</Text>
            <Text style={styles.greetName}>Admin</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.statLabel}>Omset Hari Ini</Text>
            <View style={styles.statRow}>
              <Text style={[styles.statValue, { fontSize: 17 }]}>
                {formatRupiah(dashboardData?.data?.omsetHariIni || 0)}
              </Text>
              <Ionicons name="cash-outline" size={28} color="#10B981" />
            </View>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#8B5CF6" }]}>
            <Text style={styles.statLabel}>Total Transaksi</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>
                {dashboardData?.data?.totalTransaksi || 0}
              </Text>
              <Ionicons name="receipt-outline" size={28} color="#8B5CF6" />
            </View>
          </View>
        </View>
      </View>

      {/* ── Scrollable Cabang Section ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cabangScroll}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Semua Cabang</Text>
          <TouchableOpacity
            style={styles.lihatSemua}
            onPress={() => navigation?.navigate("Cabang")}
          >
            <Text style={styles.lihatSemuaText}>Lihat Semua</Text>
            <Ionicons name="chevron-forward" size={14} color={ORANGE} />
          </TouchableOpacity>
        </View>

        {cabangTodayData?.data?.map((cabang: Cabang) => (
          <TouchableOpacity
            key={cabang.id}
            style={styles.cabangCard}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate("Cabang", { cabang })}
          >
            {/* Top row: icon + nama + status */}
            <View style={styles.cabangTop}>
              <View style={styles.cabangIconWrap}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={22}
                  color={ORANGE}
                />
              </View>
              <Text style={styles.cabangNama} numberOfLines={1}>
                {cabang?.name || ""}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: !cabang.deletedAt ? "#D1FAE5" : "#FEE2E2",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: !cabang.deletedAt ? "#059669" : "#DC2626",
                    },
                  ]}
                >
                  {cabang.deletedAt ? "Tidak Aktif" : "Aktif"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Stats row: omset + transaksi */}
            <View style={styles.cabangStats}>
              <View style={styles.cabangStatItem}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}
                >
                  <Ionicons name="cash-outline" size={16} color="#10B981" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.cabangStatLabel}>Omset Hari Ini</Text>
                  <Text style={[styles.cabangStatValue, { color: "#10B981" }]}>
                    {formatRupiah(Number(cabang?.totalOmset || "0"))}
                  </Text>
                </View>
              </View>

              <View style={styles.cabangStatDivider} />

              <View style={styles.cabangStatItem}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#F5F3FF" }]}
                >
                  <Ionicons name="receipt-outline" size={16} color="#8B5CF6" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.cabangStatLabel}>Transaksi</Text>
                  <Text style={[styles.cabangStatValue, { color: "#8B5CF6" }]}>
                    {cabang?.totalTransaksi || "0"}x
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer detail */}
            <View style={styles.cabangFooter}>
              <Text style={styles.detailLink}>Lihat Detail Cabang</Text>
              <Ionicons name="arrow-forward" size={14} color={ORANGE} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 52,
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  fixedContent: { paddingHorizontal: 16, paddingTop: 16 },
  cabangScroll: { paddingHorizontal: 16, paddingBottom: 40 },

  greetCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  shopIcon: { backgroundColor: "#FFF3EE", borderRadius: 10, padding: 10 },
  greetSub: { color: "#888", fontSize: 13 },
  greetName: { color: "#222", fontSize: 18, fontWeight: "700" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    width: "47%",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: { color: "#888", fontSize: 12, marginBottom: 8 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statValue: { fontSize: 28, fontWeight: "800", color: "#222" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  lihatSemua: { flexDirection: "row", alignItems: "center", gap: 2 },
  lihatSemuaText: { fontSize: 13, color: ORANGE, fontWeight: "600" },

  cabangCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  cabangTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cabangIconWrap: { backgroundColor: "#FFF3EE", borderRadius: 8, padding: 8 },
  cabangNama: { flex: 1, fontSize: 14, fontWeight: "700", color: "#222" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 },

  cabangStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cabangStatItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  statIconWrap: { borderRadius: 8, padding: 7 },
  cabangStatLabel: { fontSize: 10, color: "#9CA3AF", marginBottom: 2 },
  cabangStatValue: { fontSize: 13, fontWeight: "700", color: "#374151" },
  cabangStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  stokWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  stokWarningText: { fontSize: 11, color: "#D97706", fontWeight: "500" },

  cabangFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  detailLink: { fontSize: 12, color: ORANGE, fontWeight: "600" },
});
