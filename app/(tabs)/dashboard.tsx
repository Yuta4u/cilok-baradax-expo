import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { useAuthStore } from "../../src/utils/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Types ──────────────────────────────────────────────────────────────────────
type TransactionType = "income" | "expense";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  label: string;
  date: string; // ISO date string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatRupiah = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const todayISO = (): string => new Date().toISOString().split("T")[0];

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

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED: Transaction[] = [
  {
    id: "1",
    type: "income",
    amount: 1500000,
    label: "Gaji Harian",
    date: getLast7Days()[0],
  },
  {
    id: "2",
    type: "expense",
    amount: 45000,
    label: "Makan Siang",
    date: getLast7Days()[0],
  },
  {
    id: "3",
    type: "income",
    amount: 250000,
    label: "Freelance",
    date: getLast7Days()[1],
  },
  {
    id: "4",
    type: "expense",
    amount: 120000,
    label: "Transport",
    date: getLast7Days()[1],
  },
  {
    id: "5",
    type: "income",
    amount: 800000,
    label: "Bonus",
    date: getLast7Days()[2],
  },
  {
    id: "6",
    type: "expense",
    amount: 75000,
    label: "Belanja",
    date: getLast7Days()[3],
  },
  {
    id: "7",
    type: "income",
    amount: 300000,
    label: "Penjualan",
    date: getLast7Days()[4],
  },
  {
    id: "8",
    type: "expense",
    amount: 200000,
    label: "Listrik",
    date: getLast7Days()[5],
  },
  {
    id: "9",
    type: "income",
    amount: 450000,
    label: "Transfer Masuk",
    date: getLast7Days()[6],
  },
];

// ── Bar Chart Component ───────────────────────────────────────────────────────
interface BarChartProps {
  transactions: Transaction[];
}

const BarChart: React.FC<BarChartProps> = ({ transactions }) => {
  const days = getLast7Days();
  const BAR_HEIGHT = 120;

  const dailyData = days.map((day) => {
    const inc = transactions
      .filter((t) => t.type === "income" && t.date === day)
      .reduce((s, t) => s + t.amount, 0);
    const exp = transactions
      .filter((t) => t.type === "expense" && t.date === day)
      .reduce((s, t) => s + t.amount, 0);
    return { day, inc, exp };
  });

  const maxVal = Math.max(...dailyData.map((d) => Math.max(d.inc, d.exp)), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.dot]} />
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
  onSave: (t: Transaction) => void;
}

const InputModal: React.FC<InputModalProps> = ({
  visible,
  onClose,
  onSave,
  user,
}) => {
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
    console.log(type, amount, label);

    // onSave({
    //   id: Date.now().toString(),
    //   type,
    //   amount: num,
    //   label: label.trim(),
    //   date: todayISO(),
    // });
    // setAmount("");
    // setLabel("");
    // setType("income");
    // onClose();
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
const TxItem: React.FC<{ tx: Transaction }> = ({ tx }) => (
  <View style={txStyles.row}>
    <View
      style={[
        txStyles.icon,
        { backgroundColor: tx.type === "income" ? "#2cc76d" : "#c7362c" },
      ]}
    >
      <Text style={{ fontSize: 16, color: "#fff" }}>
        {tx.type === "income" ? "↑" : "↓"}
      </Text>
    </View>
    <View style={txStyles.info}>
      <Text style={txStyles.txLabel}>{tx.label}</Text>
      <Text style={txStyles.txDate}>
        {new Date(tx.date + "T00:00:00").toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })}
      </Text>
    </View>
    <Text
      style={[
        txStyles.amount,
        { color: tx.type === "income" ? "#2cc76d" : "#c7362c" },
      ]}
    >
      {tx.type === "income" ? "+" : "-"}
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
  const { user } = useAuthStore.getState();

  const [transactions, setTransactions] = useState<Transaction[]>(SEED);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "income" | "expense"
  >("all");

  const today = todayISO();
  const todayIncome = transactions
    .filter((t) => t.type === "income" && t.date === today)
    .reduce((s, t) => s + t.amount, 0);
  const todayExpense = transactions
    .filter((t) => t.type === "expense" && t.date === today)
    .reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const filtered = [...transactions]
    .filter((t) => activeFilter === "all" || t.type === activeFilter)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  const addTransaction = useCallback((t: Transaction) => {
    setTransactions((prev) => [t, ...prev]);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
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
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SALDO BERSIH</Text>
          <Text
            style={[
              styles.balanceAmount,
              {
                color: totalIncome - totalExpense >= 0 ? "#2cc76d" : "#c7362c",
              },
            ]}
          >
            {formatRupiah(totalIncome - totalExpense)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceSub}>
              <Text style={styles.balanceSubLabel}>↑ Total Masuk</Text>
              <Text style={[styles.balanceSubVal, { color: "#2cc76d" }]}>
                {formatRupiah(totalIncome)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.balanceSub}>
              <Text style={styles.balanceSubLabel}>↓ Total Keluar</Text>
              <Text style={[styles.balanceSubVal, { color: "#c7362c" }]}>
                {formatRupiah(totalExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* Today Summary */}
        <View style={styles.todayRow}>
          <View style={[styles.todayCard]}>
            <Text style={styles.todayCardLabel}>Pemasukan Hari Ini</Text>
            <Text style={[styles.todayCardAmt, { color: "#2cc76d" }]}>
              {formatRupiah(todayIncome)}
            </Text>
          </View>
          <View style={[styles.todayCard]}>
            <Text style={styles.todayCardLabel}>Pengeluaran Hari Ini</Text>
            <Text style={[styles.todayCardAmt, { color: "#c7362c" }]}>
              {formatRupiah(todayExpense)}
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>7 Hari Terakhir</Text>
          <BarChart transactions={transactions} />
        </View>

        {/* Transaction List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Riwayat Transaksi</Text>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {(["all", "income", "expense"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterBtn,
                  activeFilter === f && styles.filterBtnActive,
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === f && styles.filterTextActive,
                  ]}
                >
                  {f === "all" ? "Semua" : f === "income" ? "Masuk" : "Keluar"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
          ) : (
            filtered.map((t) => <TxItem key={t.id} tx={t} />)
          )}
        </View>
      </ScrollView>

      <InputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={addTransaction}
        user={user}
      />
    </SafeAreaView>
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
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

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
