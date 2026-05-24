import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  TextStyle,
} from "react-native";
import { useAuthStore } from "../../src/utils/authStore";
import {
  useAddCashFlowMutation,
  useGetAllCashFlowQuery,
} from "../../src/services/queries/dashboard";
import Pagination from "../../src/components/pagination";
import { format } from "date-fns";
import { hasPermission } from "../../src/utils/permissions";
import { formatIDR } from "../../src/utils/format";
import { Dialog } from "../../src/components/dialog";
import { AddReportModal } from "../../src/components/modal/add-report.modal";
import { useDashboardStore } from "../../src/store/dashboard.store";
import { ViewDetailModal } from "../../src/components/modal/view-detail.modal";

// ── Types ──────────────────────────────────────────────────────────────────────
type TransactionType = "income" | "expense";

const formatRupiah = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const getLast7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const shortDay = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "short" });
};

// ── Bar Chart Component ───────────────────────────────────────────────────────
interface BarChartProps {
  transactions: CashFlow[];
}

const BarChart: React.FC<BarChartProps> = ({ transactions }) => {
  // const days = getLast7Days();
  // const BAR_HEIGHT = 120;
  // const dailyData = days.map((day) => {
  //   const inc = transactions
  //     .filter(
  //       (t) => t.type === "INCOME" && format(t.createdAt, "yyyy-MM-dd") === day,
  //     )
  //     .reduce((s, t) => s + t.amount, 0);
  //   const exp = transactions
  //     .filter(
  //       (t) =>
  //         t.type === "EXPENSE" && format(t.createdAt, "yyyy-MM-dd") === day,
  //     )
  //     .reduce((s, t) => s + t.in, 0);
  //   return { day, inc, exp };
  // });
  // const maxVal = Math.max(...dailyData.map((d) => Math.max(d.inc, d.exp)), 1);
  // return (
  //   <View style={chartStyles.container}>
  //     <View style={chartStyles.legend}>
  //       <View style={chartStyles.legendItem}>
  //         <Text style={chartStyles.legendText}>🟢 Pemasukan</Text>
  //       </View>
  //       <View style={chartStyles.legendItem}>
  //         <Text style={chartStyles.legendText}>🔴 Pengeluaran</Text>
  //       </View>
  //     </View>
  //     <View style={chartStyles.chartArea}>
  //       {dailyData.map((d) => {
  //         const incH = (d.inc / maxVal) * BAR_HEIGHT;
  //         const expH = (d.exp / maxVal) * BAR_HEIGHT;
  //         return (
  //           <View key={d.day} style={chartStyles.dayColumn}>
  //             <View style={[chartStyles.barsRow, { height: BAR_HEIGHT }]}>
  //               <View
  //                 style={[
  //                   chartStyles.bar,
  //                   { height: incH, backgroundColor: "#2cc76d" },
  //                 ]}
  //               />
  //               <View
  //                 style={[
  //                   chartStyles.bar,
  //                   { height: expH, backgroundColor: "#c7362c" },
  //                 ]}
  //               />
  //             </View>
  //             <Text style={chartStyles.dayLabel}>{shortDay(d.day)}</Text>
  //           </View>
  //         );
  //       })}
  //     </View>
  //   </View>
  // );
};

const chartStyles = StyleSheet.create({
  container: { marginTop: 8 },
  legend: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  dayColumn: { alignItems: "center", flex: 1 },
  barsRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { width: 10, borderRadius: 4, minHeight: 2 },
  dayLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "300",
  },
});

// ── Input Modal ───────────────────────────────────────────────────────────────

// ── Transaction Item ──────────────────────────────────────────────────────────
// ── Transaction Item ──────────────────────────────────────────────────────────
const TxItem: React.FC<{ tx: CashFlow }> = ({ tx }) => {
  const handleOnPress = () => {
    tx.setViewId(tx.id);
    tx.setDialogVisible(true);
  };
  return (
    <View style={tx$.row}>
      <View
        style={[
          tx$.icon,
          { backgroundColor: tx.verified ? "#2cc76d" : "#ef4444" },
        ]}
      >
        <Text style={tx$.iconText}>{tx.name[0].toUpperCase()}</Text>
      </View>

      <View style={tx$.info}>
        <Text style={tx$.name}>{tx.name}</Text>
        <Text style={tx$.meta}>{format(tx.createdAt, "dd MMM yyyy")}</Text>
      </View>

      <View style={tx$.right}>
        <Text style={[tx$.amount]}>+ Rp{formatIDR(tx.in?.toString())}</Text>
        <TouchableOpacity onPress={handleOnPress} hitSlop={8}>
          <Text style={tx$.view}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MONO: TextStyle = {
  fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
};

const tx$ = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b20",
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  meta: {
    fontSize: 9,
    ...MONO,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#21c46a",
    ...MONO,
  },
  view: {
    fontSize: 11,
    fontWeight: "600",
  },
});

// ── Main App ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore.getState();

  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState("");
  const { toggleReportModal, toggleViewDetailModal } = useDashboardStore();

  const {
    data,
  }: {
    data: {
      data: CashFlow[];
      totalIn: number;
      totalOut: number;
      todayIn: number;
      todayOut: number;
      total: number;
      metadata: Metadata;
    };
  } = useGetAllCashFlowQuery({
    page,
  }) as any;

  console.log(data?.todayIn);

  const authorized =
    hasPermission(user!.permission, "SUPER_USER") ||
    hasPermission(user!.permission, "ADMIN");

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#070E1A" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, {user?.name}</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          {
            <View style={{ display: "flex", flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={toggleReportModal}
              >
                <Text style={styles.addBtnText}>+ Laporan</Text>
              </TouchableOpacity>
            </View>
          }
        </View>

        {authorized && (
          <View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>SALDO BERSIH 🟢</Text>
              <Text style={styles.balanceAmount}>
                {formatRupiah(Number(data?.total) || 0)}
              </Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceSub}>
                  <Text style={styles.balanceSubLabel}>Total Masuk 🟢</Text>
                  <Text style={[styles.balanceSubVal]}>
                    {formatRupiah(Number(data?.totalIn) || 0)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.balanceSub}>
                  <Text style={styles.balanceSubLabel}>Total Keluar 🔴</Text>
                  <Text style={styles.balanceSubVal}>
                    {formatRupiah(Number(data?.totalOut) || 0)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.todayRow}>
              <View style={[styles.todayCard]}>
                <Text style={styles.todayCardLabel}>Pemasukan Hari Ini 🟢</Text>
                <Text style={styles.todayCardAmt}>
                  {formatRupiah(Number(data?.todayIn) || 0)}
                </Text>
              </View>
              <View style={[styles.todayCard]}>
                <Text style={styles.todayCardLabel}>
                  Pengeluaran Hari Ini 🔴
                </Text>
                <Text style={styles.todayCardAmt}>
                  {formatRupiah(Number(data?.todayOut) || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>7 Hari Terakhir</Text>
              <BarChart transactions={data?.data || []} />
            </View>
          </View>
        )}

        {/* Transaction List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Riwayat Transaksi</Text>

          {data &&
            data.data.map((cf: any) => (
              <TxItem
                key={cf.id}
                tx={{
                  ...cf,
                  setDialogVisible: toggleViewDetailModal,
                  setViewId,
                }}
              />
            ))}
          {data && (
            <Pagination
              metadata={data?.metadata}
              onPageChange={(page: number) => setPage(page)}
            />
          )}
        </View>
      </ScrollView>

      <ViewDetailModal id={viewId} />
      <AddReportModal />
    </View>
  );
}

// ── App Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff2de" },
  scroll: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  addBtn: {
    backgroundColor: "#D96F32",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoutBtn: {
    backgroundColor: "#d93232",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  logoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  balanceCard: {
    backgroundColor: "#c75d2c4d",
    borderColor: "#c75d2c3a",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  balanceLabel: {
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 20,
    fontWeight: "300",
  },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  balanceSub: { flex: 1 },
  balanceSubLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  balanceSubVal: {
    fontSize: 16,
    fontWeight: "300",
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "#1E293B",
    marginHorizontal: 16,
  },

  todayRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  todayCard: {
    flex: 1,
    backgroundColor: "#c75d2c4d",
    borderColor: "#c75d2c3a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  todayCardLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "500",
  },
  todayCardAmt: {
    fontSize: 16,
    fontWeight: "300",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#c75d2c4d",
    borderColor: "#c75d2c3a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: "500",
  },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#c75d2c3a",
    backgroundColor: "#fff2de9d",
  },
  filterBtnActive: { backgroundColor: "#D96F32" },
  filterText: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  emptyText: {
    color: "#475569",
    textAlign: "center",
    paddingVertical: 20,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
});
