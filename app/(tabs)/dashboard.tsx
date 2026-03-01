import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useAuthStore } from "../../src/utils/authStore";
import {
  useAddCashFlowMutation,
  useGetAllCashFlowQuery,
} from "../../src/services/queries/dashboard";
import { UseMutateFunction, useQueryClient } from "@tanstack/react-query";
import { ToastSuccess } from "../../src/utils/toast";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Pagination from "../../src/components/pagination";
import { format } from "date-fns";
import { hasPermission } from "../../src/utils/permissions";

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
  const days = getLast7Days();
  const BAR_HEIGHT = 120;

  const dailyData = days.map((day) => {
    const inc = transactions
      .filter(
        (t) => t.type === "INCOME" && format(t.createdAt, "yyyy-MM-dd") === day,
      )
      .reduce((s, t) => s + t.amount, 0);
    const exp = transactions
      .filter(
        (t) =>
          t.type === "EXPENSE" && format(t.createdAt, "yyyy-MM-dd") === day,
      )
      .reduce((s, t) => s + t.amount, 0);
    return { day, inc, exp };
  });

  const maxVal = Math.max(...dailyData.map((d) => Math.max(d.inc, d.exp)), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[[chartStyles.dot], { backgroundColor: "#2cc76d" }]} />
          <Text style={chartStyles.legendText}>Pemasukan</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.dot, { backgroundColor: "#c7362c" }]} />
          <Text style={chartStyles.legendText}>Pengeluaran</Text>
        </View>
      </View>

      <View style={chartStyles.chartArea}>
        {dailyData.map((d) => {
          const incH = (d.inc / maxVal) * BAR_HEIGHT;
          const expH = (d.exp / maxVal) * BAR_HEIGHT;
          return (
            <View key={d.day} style={chartStyles.dayColumn}>
              <View style={[chartStyles.barsRow, { height: BAR_HEIGHT }]}>
                <View
                  style={[
                    chartStyles.bar,
                    { height: incH, backgroundColor: "#2cc76d" },
                  ]}
                />
                <View
                  style={[
                    chartStyles.bar,
                    { height: expH, backgroundColor: "#c7362c" },
                  ]}
                />
              </View>
              <Text style={chartStyles.dayLabel}>{shortDay(d.day)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
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
    color: "#64748B",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
});

// ── Input Modal ───────────────────────────────────────────────────────────────
interface InputModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onSave: UseMutateFunction<any, ApiError, AddCashFlow, unknown>;
}

const InputModal: React.FC<InputModalProps> = ({
  visible,
  onClose,
  onSave,
  user,
}) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");

  const handleSave = () => {
    const num = parseInt(amount.replace(/\D/g, ""), 10);
    if (!num || num <= 0) {
      Alert.alert("Jumlah tidak valid", "Masukkan jumlah lebih dari 0");
      return;
    }
    if (!label.trim()) {
      Alert.alert("Label kosong", "Isi keterangan transaksi");
      return;
    }

    const payload = {
      amount: num,
      type: type.toUpperCase(),
      note: label.trim(),
    };

    onSave(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:all"] });
        ToastSuccess("Successfully! Transaksi berhasil ditambahkan.");
        onClose();
      },
    });

    setAmount("");
    setLabel("");
    setType("income");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={modalStyles.overlay}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Tambah Transaksi</Text>

          {/* Type Toggle */}
          <View style={modalStyles.toggle}>
            {(["income", "expense"] as TransactionType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  modalStyles.toggleBtn,
                  type === t &&
                    (t === "income"
                      ? modalStyles.activeIncome
                      : modalStyles.activeExpense),
                ]}
                onPress={() => setType(t)}
              >
                <Text
                  style={[
                    modalStyles.toggleText,
                    type === t && modalStyles.toggleTextActive,
                  ]}
                >
                  {t === "income" ? "💰 Pemasukan" : "💸 Pengeluaran"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modalStyles.label}>Jumlah (Rp)</Text>
          <TextInput
            style={modalStyles.input}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#475569"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={modalStyles.label}>Keterangan</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="cth: Gaji, Makan Siang..."
            placeholderTextColor="#475569"
            value={label}
            onChangeText={setLabel}
          />

          <TouchableOpacity
            style={[
              modalStyles.saveBtn,
              { backgroundColor: type === "income" ? "#34D399" : "#F87171" },
            ]}
            onPress={handleSave}
          >
            <Text style={modalStyles.saveBtnText}>Simpan</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#e9b190",

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#fff2de",
    borderColor: "#3341553a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  activeIncome: { backgroundColor: "#2cc76d" },
  activeExpense: { backgroundColor: "#c7362c" },
  toggleText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  toggleTextActive: { color: "#F1F5F9" },
  label: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 6,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 1,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    backgroundColor: "#fff2de",
    borderColor: "#3341553a",
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
});

// ── Transaction Item ──────────────────────────────────────────────────────────
const TxItem: React.FC<{ tx: CashFlow }> = ({ tx }) => (
  <View style={txStyles.row}>
    <View
      style={[
        txStyles.icon,
        { backgroundColor: tx.type === "INCOME" ? "#2cc76d" : "#c7362c" },
      ]}
    >
      <Text style={{ fontSize: 16, color: "#fff" }}>
        {tx.type === "INCOME" ? "↑" : "↓"}
      </Text>
    </View>
    <View style={txStyles.info}>
      <Text style={txStyles.txLabel}>{tx.note}</Text>
      <Text style={txStyles.txDate}>{format(tx.createdAt, "dd-MM-yyyy")}</Text>
    </View>
    <Text
      style={[
        txStyles.amount,
        { color: tx.type === "INCOME" ? "#2cc76d" : "#c7362c" },
      ]}
    >
      {tx.type === "INCOME" ? "+" : "-"}
      {formatRupiah(tx.amount)}
    </Text>
  </View>
);

const txStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b1c",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: { flex: 1 },
  txLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
  txDate: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
});

// ── Main App ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuthStore.getState();

  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [page, setPage] = useState(1);

  const { mutate } = useAddCashFlowMutation();
  const {
    data,
  }: {
    data: {
      data: CashFlow[];
      totalIncome: number;
      totalExpense: number;
      todayIncome: number;
      todayExpense: number;
      metadata: Metadata;
    };
  } = useGetAllCashFlowQuery({
    page,
    type,
  }) as any;

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/sign-in");
    ToastSuccess("Successfully logged out.");
  }, []);

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
            <Text style={styles.greeting}>Halo! 👋</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", gap: 6 }}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addBtnText}>+ Tambah</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <MaterialIcons name="logout" size={17} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {authorized && (
          <View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>SALDO BERSIH</Text>
              <Text
                style={[
                  styles.balanceAmount,
                  {
                    color: false ? "#2cc76d" : "#c7362c",
                  },
                ]}
              >
                {formatRupiah(data?.totalIncome - data?.totalExpense || 0)}
              </Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceSub}>
                  <Text style={styles.balanceSubLabel}>↑ Total Masuk</Text>
                  <Text style={[styles.balanceSubVal, { color: "#2cc76d" }]}>
                    {formatRupiah(data?.totalIncome || 0)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.balanceSub}>
                  <Text style={styles.balanceSubLabel}>↓ Total Keluar</Text>
                  <Text style={[styles.balanceSubVal, { color: "#c7362c" }]}>
                    {formatRupiah(data?.totalExpense || 0)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.todayRow}>
              <View style={[styles.todayCard]}>
                <Text style={styles.todayCardLabel}>Pemasukan Hari Ini</Text>
                <Text style={[styles.todayCardAmt, { color: "#2cc76d" }]}>
                  {formatRupiah(data?.todayIncome || 0)}
                </Text>
              </View>
              <View style={[styles.todayCard]}>
                <Text style={styles.todayCardLabel}>Pengeluaran Hari Ini</Text>
                <Text style={[styles.todayCardAmt, { color: "#c7362c" }]}>
                  {formatRupiah(data?.todayExpense || 0)}
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

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {(["ALL", "INCOME", "EXPENSE"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, type === f && styles.filterBtnActive]}
                onPress={() => setType(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    type === f && styles.filterTextActive,
                  ]}
                >
                  {f === "ALL" ? "Semua" : f === "INCOME" ? "Masuk" : "Keluar"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {data && data.data.map((cf: any) => <TxItem key={cf.id} tx={cf} />)}
          {data && (
            <Pagination
              metadata={data?.metadata}
              onPageChange={(page: number) => setPage(page)}
            />
          )}
        </View>
      </ScrollView>

      <InputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={mutate}
        user={user}
      />
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
    fontSize: 22,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
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
    color: "#475569",
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  balanceSub: { flex: 1 },
  balanceSubLabel: {
    color: "#475569",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  balanceSubVal: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
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
    color: "#475569",
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  todayCardAmt: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
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
    letterSpacing: 2,
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
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
