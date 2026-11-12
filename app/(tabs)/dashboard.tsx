import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useApprovalCashFlowMutation,
  useCabangHistoryQuery,
  useCabangTodayQuery,
  useConfirmReportMutation,
  useGetDetailByIdQuery,
  useSubmitCashFlowMutation,
} from "../../src/services/queries/dashboard";
import { useAuthStore } from "../../src/utils/authStore";
import { enumeratePermission } from "../../src/utils/permissions";
import { ToastError, ToastSuccess } from "../../src/utils/toast";
import { handleError } from "../../src/utils/error";
import { useQueryClient } from "@tanstack/react-query";

const ORANGE = "#B94A1A";
const ORANGE_SOFT = "#FFF3EE";
const GREEN = "#059669";
const RED = "#DC2626";

type RowId = string | number;

type Props = {
  navigation?: { navigate: (route: string, params?: object) => void };
};

type DateRange = {
  sd: string | null;
  ed: string | null;
};

type ExtraExpense = {
  id?: number | string;
  note?: string;
  amount?: number | string;
};
type ExtraIncome = { channel?: string; amount?: number | string };
type CashFlow = ICashFlow & {
  cashFlowOverheads?: ExtraExpense[];
  incomes?: ExtraIncome[];
};

type TrxStep = 1 | 2;
const TRX_STEPS = ["Stok Sisa", "Pendapatan"];

type IncomeKey = "qris" | "gofood" | "grabfood" | "shopeefood";
type IncomeState = Record<IncomeKey, string>;
type IncomeActive = Record<IncomeKey, boolean>;

type IncomeChannel = {
  key: IncomeKey;
  /** Nama field di response API (camelCase) */
  apiKey: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
};

const INCOME_CHANNELS: IncomeChannel[] = [
  {
    key: "qris",
    apiKey: "qris",
    label: "QRIS",
    icon: "qr-code-outline",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    key: "gofood",
    apiKey: "goFood",
    label: "GoFood",
    icon: "bicycle-outline",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    key: "grabfood",
    apiKey: "grabFood",
    label: "GrabFood",
    icon: "fast-food-outline",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    key: "shopeefood",
    apiKey: "shopeeFood",
    label: "ShopeeFood",
    icon: "bag-handle-outline",
    color: "#EA580C",
    bg: "#FFF7ED",
  },
];

const EMPTY_INCOME: IncomeState = {
  qris: "",
  gofood: "",
  grabfood: "",
  shopeefood: "",
};

const NO_CHANNEL_ACTIVE: IncomeActive = {
  qris: false,
  gofood: false,
  grabfood: false,
  shopeefood: false,
};

type ExpenseRow = {
  key: string;
  name: string;
  amount: string;
};

const EXPENSE_PRESETS = ["Gas", "Plastik", "Transport", "Lainnya"];

let expenseSeq = 0;
const nextExpenseKey = (): string => `exp-${Date.now()}-${++expenseSeq}`;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(/[^0-9,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getProductId = (item: ICashFlowItem): RowId =>
  (item as any).productId ?? item.product?.id ?? item.id;

const getRowPrice = (item: ICashFlowItem): number =>
  toNumber((item as any).price ?? item.product?.price);

/**
 * Nilai awal input "stok sisa".
 * - Belum pernah disubmit (out kosong/0) -> dikosongkan, supaya total
 *   penjualan awal = seluruh stok awal × harga.
 * - Sudah ada data (out > 0) -> stok sisa = in - out.
 */
const getSisaSeed = (item: ICashFlowItem): string => {
  const out = toNumber(item.out);
  if (out <= 0) return "";
  const sisa = toNumber(item.in) - out;
  return sisa > 0 ? String(sisa) : "0";
};

const formatRupiah = (value: unknown): string => {
  const amount = Math.round(toNumber(value));
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${sign}${digits}`;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCount = (value: unknown): string =>
  Math.round(toNumber(value)).toString();

const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, "");

const formatThousand = (value: string): string =>
  value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";

const amountToInput = (value: unknown): string => {
  const n = Math.round(toNumber(value));
  return n > 0 ? String(n) : "";
};

const readChannelAmount = (cashFlow: CashFlow, channel: IncomeChannel) => {
  const src = cashFlow as unknown as Record<string, unknown>;
  const direct = toNumber(src[channel.apiKey] ?? src[channel.key]);
  if (direct > 0) return direct;

  const fromList = cashFlow.incomes?.find(
    (i) => i.channel?.toLowerCase() === channel.key,
  );
  return toNumber(fromList?.amount);
};

const seedIncome = (
  cashFlow: CashFlow,
): { income: IncomeState; active: IncomeActive } => {
  const income: IncomeState = { ...EMPTY_INCOME };
  const active: IncomeActive = { ...NO_CHANNEL_ACTIVE };

  INCOME_CHANNELS.forEach((channel) => {
    const amount = readChannelAmount(cashFlow, channel);
    income[channel.key] = amountToInput(amount);
    active[channel.key] = amount > 0;
  });

  return { income, active };
};

const seedExpenses = (cashFlow: CashFlow): ExpenseRow[] => {
  if (
    Array.isArray(cashFlow.cashFlowOverheads) &&
    cashFlow.cashFlowOverheads.length > 0
  ) {
    return cashFlow.cashFlowOverheads.map((e) => ({
      key: nextExpenseKey(),
      name: e.note ?? "",
      amount: amountToInput(e.amount),
    }));
  }

  const overhead = Math.round(toNumber(cashFlow.overhead));
  return overhead > 0
    ? [
        {
          key: nextExpenseKey(),
          name: "Pengeluaran Tambahan",
          amount: String(overhead),
        },
      ]
    : [];
};

/** Total pengeluaran tambahan yang tersimpan (tanpa stockOverhead). */
const getExpenseTotal = (cashFlow?: CashFlow | null): number => {
  if (!cashFlow) return 0;
  if (
    Array.isArray(cashFlow.cashFlowOverheads) &&
    cashFlow.cashFlowOverheads.length > 0
  ) {
    return cashFlow.cashFlowOverheads.reduce(
      (acc, e) => acc + toNumber(e.amount),
      0,
    );
  }
  return toNumber(cashFlow.overhead);
};

const sumItems = (
  items: ICashFlowItem[] | undefined,
  fn: (item: ICashFlowItem) => number,
): number => (items ?? []).reduce((acc, item) => acc + fn(item), 0);

/** verified === 0 -> sudah terverifikasi. 1 = approval, 2 = belum submit. */
const isVerifiedFlow = (cashFlow?: { verified?: number } | null): boolean =>
  cashFlow?.verified === 0;

/** Sudah disubmit cabang (menunggu approval atau sudah diverifikasi). */
const isSubmittedFlow = (cashFlow?: { verified?: number } | null): boolean =>
  cashFlow?.verified === 0 || cashFlow?.verified === 1;

type StockRowProps = {
  id: RowId;
  name: string;
  priceLabel?: string;
  qty: string;
  editable: boolean;
  onChangeQty: (id: RowId, qty: string) => void;
};

const StockRow = React.memo(function StockRow({
  id,
  name,
  priceLabel,
  qty,
  editable,
  onChangeQty,
}: StockRowProps) {
  return (
    <View style={styles.stockRow}>
      <View style={styles.flex}>
        <Text style={styles.stockName} numberOfLines={2}>
          {name}
        </Text>
        {priceLabel ? (
          <Text style={styles.stockPrice} numberOfLines={1}>
            {priceLabel}
          </Text>
        ) : null}
      </View>

      {editable ? (
        <TextInput
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          maxLength={6}
          defaultValue={qty}
          style={[styles.qtyInput, toNumber(qty) > 0 && styles.qtyInputFilled]}
          onChangeText={(val) => onChangeQty(id, digitsOnly(val))}
          accessibilityLabel={`Qty ${name}`}
        />
      ) : (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{toNumber(qty)}</Text>
        </View>
      )}
    </View>
  );
});

type DetailRowProps = {
  label: string;
  value: string | number | null | undefined;
};

const DetailRow = React.memo(function DetailRow({
  label,
  value,
}: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.detailRowValue} numberOfLines={1}>
        {value === null || value === undefined ? "-" : value}
      </Text>
    </View>
  );
});

type DetailTotalRowProps = {
  label: string;
  value: string | number;
};

const DetailTotalRow = React.memo(function DetailTotalRow({
  label,
  value,
}: DetailTotalRowProps) {
  return (
    <View style={[styles.detailRow, styles.detailRowTotal]}>
      <Text style={styles.detailRowTotalLabel}>{label}</Text>
      <Text style={styles.detailRowTotalValue}>{value}</Text>
    </View>
  );
});

type PaymentStepProps = {
  income: IncomeState;
  active: IncomeActive;
  expenses: ExpenseRow[];
  note: string;
  editable: boolean;
  onToggleChannel: (key: IncomeKey) => void;
  onChangeIncome: (key: IncomeKey, val: string) => void;
  onAddExpense: (name?: string) => void;
  onChangeExpense: (key: string, field: "name" | "amount", val: string) => void;
  onRemoveExpense: (key: string) => void;
  onChangeNote: (val: string) => void;
};

const PaymentStep = React.memo(function PaymentStep({
  income,
  active,
  expenses,
  note,
  editable,
  onToggleChannel,
  onChangeIncome,
  onAddExpense,
  onChangeExpense,
  onRemoveExpense,
  onChangeNote,
}: PaymentStepProps) {
  const activeChannels = INCOME_CHANNELS.filter((c) => active[c.key]);
  const expenseTotal = expenses.reduce((acc, e) => acc + toNumber(e.amount), 0);

  return (
    <ScrollView
      style={styles.fullModalList}
      contentContainerStyle={styles.fullModalListContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Pendapatan per kanal ── */}
      <Text style={styles.stepHint}>
        Pilih kanal pembayaran yang dipakai hari ini, lalu isi nominalnya.
        Nominal kanal akan mengurangi saldo.
      </Text>

      <View style={styles.chipRow}>
        {INCOME_CHANNELS.map((channel) => {
          const isOn = active[channel.key];
          return (
            <TouchableOpacity
              key={channel.key}
              disabled={!editable}
              onPress={() => onToggleChannel(channel.key)}
              activeOpacity={0.85}
              style={[
                styles.chip,
                isOn && {
                  backgroundColor: channel.bg,
                  borderColor: channel.color,
                },
                !editable && styles.btnDisabled,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={`Kanal ${channel.label}`}
            >
              <Ionicons
                name={isOn ? "checkmark-circle" : channel.icon}
                size={16}
                color={isOn ? channel.color : "#9CA3AF"}
              />
              <Text style={[styles.chipText, isOn && { color: channel.color }]}>
                {channel.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeChannels.length === 0 ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintBoxText}>
            Belum ada kanal dipilih. Lewati jika tidak ada pendapatan non-tunai.
          </Text>
        </View>
      ) : (
        activeChannels.map((channel) => (
          <View key={channel.key} style={styles.incomeRow}>
            <View
              style={[styles.incomeIconWrap, { backgroundColor: channel.bg }]}
            >
              <Ionicons name={channel.icon} size={18} color={channel.color} />
            </View>

            <View style={styles.flex}>
              <Text style={styles.incomeLabel}>{channel.label}</Text>
              <View
                style={[
                  styles.incomeInputWrap,
                  toNumber(income[channel.key]) > 0 &&
                    styles.incomeInputWrapFilled,
                ]}
              >
                <Text style={styles.incomePrefix}>Rp</Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  maxLength={12}
                  style={styles.incomeInput}
                  value={formatThousand(income[channel.key])}
                  onChangeText={(val) => onChangeIncome(channel.key, val)}
                  editable={editable}
                  accessibilityLabel={`Pendapatan ${channel.label}`}
                />
              </View>
            </View>
          </View>
        ))
      )}

      <View style={styles.detailDivider} />

      {/* ── Pengeluaran (banyak item) ── */}
      <View style={styles.expenseHeader}>
        <Text style={styles.fieldLabelLg}>Pengeluaran</Text>
        <Text style={styles.expenseHeaderTotal}>
          {formatRupiah(expenseTotal)}
        </Text>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintBoxText}>
            Belum ada pengeluaran. Tambahkan dengan tombol di bawah.
          </Text>
        </View>
      ) : null}

      {expenses.map((expense, index) => (
        <View key={expense.key} style={styles.expenseCard}>
          <View style={styles.expenseCardTop}>
            <Text style={styles.expenseIndex}>#{index + 1}</Text>
            {editable ? (
              <TouchableOpacity
                onPress={() => onRemoveExpense(expense.key)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Hapus pengeluaran ${index + 1}`}
              >
                <Ionicons name="trash-outline" size={18} color={RED} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TextInput
            placeholder="Nama pengeluaran (mis. Gas)"
            placeholderTextColor="#9CA3AF"
            style={styles.fieldInput}
            value={expense.name}
            onChangeText={(val) => onChangeExpense(expense.key, "name", val)}
            editable={editable}
            maxLength={60}
            accessibilityLabel={`Nama pengeluaran ${index + 1}`}
          />

          <View
            style={[
              styles.incomeInputWrap,
              styles.expenseAmountWrap,
              toNumber(expense.amount) > 0 && styles.incomeInputWrapFilled,
            ]}
          >
            <Text style={styles.incomePrefix}>Rp</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              maxLength={12}
              style={styles.incomeInput}
              value={formatThousand(expense.amount)}
              onChangeText={(val) =>
                onChangeExpense(expense.key, "amount", digitsOnly(val))
              }
              editable={editable}
              accessibilityLabel={`Nominal pengeluaran ${index + 1}`}
            />
          </View>
        </View>
      ))}

      {editable ? (
        <>
          <TouchableOpacity
            style={styles.addExpenseBtn}
            onPress={() => onAddExpense()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Tambah pengeluaran"
          >
            <Ionicons name="add-circle-outline" size={18} color={ORANGE} />
            <Text style={styles.addExpenseText}>Tambah Pengeluaran</Text>
          </TouchableOpacity>

          <View style={styles.chipRow}>
            {EXPENSE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={styles.presetChip}
                onPress={() => onAddExpense(preset)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Tambah pengeluaran ${preset}`}
              >
                <Ionicons name="add" size={14} color="#6B7280" />
                <Text style={styles.presetChipText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.detailDivider} />

      <Text style={styles.fieldLabel}>Note</Text>
      <TextInput
        placeholder="Catatan (opsional)"
        placeholderTextColor="#9CA3AF"
        style={[styles.fieldInput, styles.fieldInputMultiline]}
        value={note}
        onChangeText={onChangeNote}
        editable={editable}
        multiline
        numberOfLines={3}
        accessibilityLabel="Catatan transaksi"
      />
    </ScrollView>
  );
});

/* ─── CashFlowCard ─────────────────────────────────────────────────────── */

type CashFlowCardProps = {
  cashFlow: CashFlow;
  isAdmin: boolean;
  onDetail: (cashFlow: CashFlow) => void;
  onStok: (cashFlow: CashFlow) => void;
  onTransaksi: (cashFlow: CashFlow) => void;
};

const CashFlowCard = React.memo(function CashFlowCard({
  cashFlow,
  isAdmin,
  onDetail,
  onStok,
  onTransaksi,
}: CashFlowCardProps) {
  const isVerified = isVerifiedFlow(cashFlow);
  const canDetail = isSubmittedFlow(cashFlow);

  const omsetLabel = useMemo(() => {
    if (cashFlow.verified === 2) return "Submit First";
    if (cashFlow.verified === 1) return "Approval";

    // Sisa cash = penjualan (awal - sisa) - kanal - pengeluaran.
    const penjualan = sumItems(
      cashFlow.cashFlowItems,
      (item) => toNumber(item.out) * getRowPrice(item),
    );
    const kanal = INCOME_CHANNELS.reduce(
      (acc, c) => acc + readChannelAmount(cashFlow, c),
      0,
    );
    return formatRupiah(penjualan - kanal - getExpenseTotal(cashFlow));
  }, [cashFlow]);

  return (
    <View style={styles.cabangCard}>
      <View style={styles.cabangTop}>
        <View style={styles.cabangIconWrap}>
          <MaterialCommunityIcons
            name="store-outline"
            size={22}
            color={ORANGE}
          />
        </View>

        <Text style={styles.cabangNama} numberOfLines={1}>
          {cashFlow?.user?.name || "-"}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isVerified ? "#D1FAE5" : "#FEE2E2" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: isVerified ? GREEN : RED }]}
          >
            {isVerified ? "Sudah diverifikasi" : "Belum diverifikasi"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats row: omset + tanggal */}
      <View style={styles.cabangStats}>
        <View style={styles.cabangStatItem}>
          <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
          </View>
          <View style={styles.cabangStatText}>
            <Text style={styles.cabangStatLabel}>Omset</Text>
            <Text
              style={[styles.cabangStatValue, { color: "#10B981" }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {omsetLabel}
            </Text>
          </View>
        </View>

        <View style={styles.cabangStatDivider} />

        <View style={styles.cabangStatItem}>
          <View style={[styles.statIconWrap, { backgroundColor: "#F5F3FF" }]}>
            <Ionicons name="receipt-outline" size={16} color="#8B5CF6" />
          </View>
          <View style={styles.cabangStatText}>
            <Text style={styles.cabangStatLabel}>Tanggal</Text>
            <Text
              style={[styles.cabangStatValue, { color: "#8B5CF6" }]}
              numberOfLines={1}
            >
              {formatDate(cashFlow.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer actions */}
      <View style={styles.cabangFooter}>
        <TouchableOpacity
          style={[
            styles.cardBtn,
            styles.cardBtnGhost,
            !canDetail && styles.btnDisabled,
          ]}
          onPress={() => onDetail(cashFlow)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Detail ${cashFlow?.user?.name ?? ""}`}
          accessibilityState={{ disabled: !canDetail }}
          disabled={!canDetail}
        >
          <Ionicons name="newspaper-outline" size={15} color={ORANGE} />
          <Text style={styles.cardBtnGhostText}>Detail</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnGhost]}
          onPress={() => onStok(cashFlow)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Stok ${cashFlow?.user?.name ?? ""}`}
        >
          <Ionicons name="file-tray-outline" size={15} color={ORANGE} />
          <Text style={styles.cardBtnGhostText}>Stok</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnSolid, isVerified && styles.cardBtnSolidDisabled]}
          onPress={() => onTransaksi(cashFlow)}
          activeOpacity={0.85}
          disabled={isVerified}
          accessibilityState={{ disabled: isVerified }}
          accessibilityRole="button"
          accessibilityLabel={`Transaksi ${cashFlow?.user?.name ?? ""}`}
        >
          <Ionicons name="receipt-outline" size={15} color={isVerified ? "#6B7280" : "#fff"} />
          <Text style={[styles.cardBtnSolidText, isVerified && styles.cardBtnSolidDisabledText]}>Transaksi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function DashboardScreen({ navigation: _navigation }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const role = enumeratePermission(user?.permission ?? 1);
  const isCabang = role.includes("CABANG");
  const isAdmin = role.includes("ADMIN") || role.includes("SUPER_USER");

  const { mutate: submitCashFlow } = useSubmitCashFlowMutation();
  const { mutate: approvalCashFlow } = useApprovalCashFlowMutation();

  /* -------------------- Calendar (sd / ed) -------------------- */

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ sd: null, ed: null });

  const [selectedCabang, setSelectedCabang] = useState<CashFlow | null>(null);

  const {
    data: detailRaw,
    isLoading: loadingDetail,
    isError: errorDetail,
  } = useGetDetailByIdQuery(selectedCabang?.id as never);
  const detailData = detailRaw as CashFlow | undefined;

  const {
    data: cabangData,
    isLoading: loadingCabang,
    isRefetching,
    refetch,
  } = useCabangHistoryQuery(isCabang, dateRange as never);

  const { data: cabangTodayData, isLoading: loadingCabangToday } =
    useCabangTodayQuery(isAdmin);

  const openDetail = useCallback((cashFlow: CashFlow) => {
    if (!isSubmittedFlow(cashFlow)) {
      ToastError("Laporan belum disubmit");
      return;
    }
    setSelectedCabang(cashFlow);
  }, []);

  const closeDetail = useCallback(() => setSelectedCabang(null), []);

  const detailItems = detailData?.cashFlowItems;

  const detailTotalPrice = useMemo(
    () => sumItems(detailItems, (i) => toNumber(i.in) * getRowPrice(i)),
    [detailItems],
  );
  const totalPenjualan = useMemo(
    () => sumItems(detailItems, (i) => toNumber(i.out) * getRowPrice(i)),
    [detailItems],
  );
  const detailTotalPriceSisa = useMemo(
    () =>
      sumItems(
        detailItems,
        (i) => (toNumber(i.in) - toNumber(i.out)) * getRowPrice(i),
      ),
    [detailItems],
  );

  const detailExpenses = useMemo<ExtraExpense[]>(() => {
    if (!detailData) return [];

    if (
      Array.isArray(detailData.cashFlowOverheads) &&
      detailData.cashFlowOverheads.length > 0
    ) {
      return detailData.cashFlowOverheads;
    }
    const overhead = toNumber(detailData.overhead);
    return overhead > 0
      ? [{ id: "legacy", name: "Pengeluaran Tambahan", amount: overhead }]
      : [];
  }, [detailData]);

  const detailExpenseTotal = getExpenseTotal(detailData);
  // Stok sisa goes back to inventory, so it is NOT an expense.
  const detailTotalPengeluaran = detailExpenseTotal;

  const detailChannels = useMemo(
    () =>
      detailData
        ? INCOME_CHANNELS.map((c) => ({
            channel: c,
            amount: readChannelAmount(detailData, c),
          })).filter((c) => c.amount > 0)
        : [],
    [detailData],
  );
  const detailChannelTotal = detailChannels.reduce(
    (acc, c) => acc + c.amount,
    0,
  );

  /* -------------------- Stok hari ini -------------------- */

  const [stokToday, setStokToday] = useState<CashFlow | null>(null);
  const openStok = useCallback(
    (cashFlow: CashFlow) => setStokToday(cashFlow),
    [],
  );
  const closeStok = useCallback(() => setStokToday(null), []);
  const stokTotalQty = useMemo(
    () => sumItems(stokToday?.cashFlowItems, (i) => toNumber(i.in)),
    [stokToday],
  );
  const stokTotalRp = useMemo(
    () =>
      sumItems(stokToday?.cashFlowItems, (i) => toNumber(i.in) * getRowPrice(i)),
    [stokToday],
  );

  /* -------------------- Transaksi (2 langkah) -------------------- */

  const [transaksiCashFlow, setTransaksiCashFlow] = useState<CashFlow | null>(
    null,
  );
  const [trxItems, setTrxItems] = useState<ICashFlowItem[]>([]);
  /** Langkah aktif: 1 = isi stok sisa, 2 = pendapatan & pengeluaran */
  const [trxStep, setTrxStep] = useState<TrxStep>(1);
  /** itemId -> stok sisa (string) */
  const [trxInput, setTrxInput] = useState<Record<string, string>>({});
  /** Nominal per kanal + kanal mana yang aktif dipakai */
  const [income, setIncome] = useState<IncomeState>(EMPTY_INCOME);
  const [incomeActive, setIncomeActive] =
    useState<IncomeActive>(NO_CHANNEL_ACTIVE);
  /** Pengeluaran: banyak baris */
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [trxNote, setTrxNote] = useState("");
  const [savingTrx, setSavingTrx] = useState(false);

  /** Boleh mengedit kalau belum disubmit (verified === 2) atau user admin. */
  const canEditTrx = transaksiCashFlow?.verified === 2 || isAdmin;

  const openTransaksi = useCallback((cashFlow: CashFlow) => {
    if (isVerifiedFlow(cashFlow)) return;

    const seed = cashFlow.cashFlowItems.reduce<Record<string, string>>(
      (acc, item) => {
        acc[item.id] = getSisaSeed(item);
        return acc;
      },
      {},
    );
    const seededIncome = seedIncome(cashFlow);

    setTrxStep(1);
    setTrxItems(cashFlow.cashFlowItems);
    setTrxInput(seed);
    setIncome(seededIncome.income);
    setIncomeActive(seededIncome.active);
    setExpenses(seedExpenses(cashFlow));

    setTrxNote(cashFlow.note ?? "");
    setTransaksiCashFlow(cashFlow);
  }, []);

  const closeTransaksi = useCallback(() => {
    setTrxStep(1);
    setTrxItems([]);
    setTrxInput({});
    setIncome(EMPTY_INCOME);
    setIncomeActive(NO_CHANNEL_ACTIVE);
    setSavingTrx(false);
    setExpenses([]);
    setTrxNote("");
    setTransaksiCashFlow(null);
  }, []);

  const handleChangeTrxQty = useCallback((id: RowId, qty: string) => {
    setTrxInput((prev) => ({ ...prev, [String(id)]: qty }));
  }, []);

  const handleToggleChannel = useCallback((key: IncomeKey) => {
    setIncomeActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleChangeIncome = useCallback((key: IncomeKey, val: string) => {
    setIncome((prev) => ({ ...prev, [key]: digitsOnly(val) }));
  }, []);

  const handleAddExpense = useCallback((name = "") => {
    setExpenses((prev) => [
      ...prev,
      { key: nextExpenseKey(), name, amount: "" },
    ]);
  }, []);

  const handleChangeExpense = useCallback(
    (key: string, field: "name" | "amount", val: string) => {
      setExpenses((prev) =>
        prev.map((e) => (e.key === key ? { ...e, [field]: val } : e)),
      );
    },
    [],
  );

  const handleRemoveExpense = useCallback((key: string) => {
    setExpenses((prev) => prev.filter((e) => e.key !== key));
  }, []);

  /** Total harga seluruh stok awal = Σ (stok awal × harga) */
  const trxTotalStok = useMemo(
    () =>
      trxItems.reduce(
        (acc, item) => acc + toNumber(item.in) * getRowPrice(item),
        0,
      ),
    [trxItems],
  );

  /** Nilai stok sisa = Σ (stok sisa × harga) — ini yang mengurangi total */
  const trxNilaiSisa = useMemo(
    () =>
      trxItems.reduce((acc, item) => {
        const sisa = Math.min(toNumber(trxInput[item.id]), toNumber(item.in));
        return acc + sisa * getRowPrice(item);
      }, 0),
    [trxItems, trxInput],
  );

  /**
   * Penjualan dari stok = total harga stok awal − (stok sisa × harga).
   * Contoh: total Rp 100.000, isi sisa 2 cilok @Rp 1.000 → Rp 98.000.
   */
  const trxPenjualan = trxTotalStok - trxNilaiSisa;

  /** Total semua kanal / merchant yang AKTIF */
  const trxPendapatan = useMemo(
    () =>
      INCOME_CHANNELS.reduce(
        (acc, c) => acc + (incomeActive[c.key] ? toNumber(income[c.key]) : 0),
        0,
      ),
    [income, incomeActive],
  );

  const trxPengeluaran = useMemo(
    () => expenses.reduce((acc, e) => acc + toNumber(e.amount), 0),
    [expenses],
  );

  /**
   * Saldo (cash) = penjualan stok (setelah dikurangi sisa)
   *                − kanal / merchant − pengeluaran.
   */
  const trxSaldo = trxPenjualan - trxPendapatan - trxPengeluaran;

  const handleTrxNext = useCallback(() => {
    if (canEditTrx) {
      const invalid = trxItems.find(
        (item) => toNumber(trxInput[item.id]) > toNumber(item.in),
      );

      if (invalid) {
        ToastError(
          `Stok sisa ${invalid.product?.name ?? "produk"} melebihi stok awal`,
        );
        return;
      }
    }
    setTrxStep(2);
  }, [canEditTrx, trxItems, trxInput]);

  const handleTrxBack = useCallback(() => {
    if (trxStep === 2) {
      setTrxStep(1);
      return;
    }
    closeTransaksi();
  }, [trxStep, closeTransaksi]);

  const submitTrx = useCallback(() => {
    if (!transaksiCashFlow) {
      ToastError("Cash flow tidak ditemukan, silakan buka ulang.");
      return;
    }

    // Buang baris pengeluaran yang benar-benar kosong, validasi sisanya.
    const filledExpenses = expenses.filter(
      (e) => e.name.trim() || toNumber(e.amount) > 0,
    );
    const missingName = filledExpenses.find((e) => !e.name.trim());
    if (missingName) {
      ToastError("Nama pengeluaran wajib diisi");
      return;
    }
    const missingAmount = filledExpenses.find((e) => toNumber(e.amount) <= 0);
    if (missingAmount) {
      ToastError(`Nominal "${missingAmount.name.trim()}" belum diisi`);
      return;
    }

    const amountOf = (key: IncomeKey) =>
      incomeActive[key] ? toNumber(income[key]) : 0;

    const cashFlowItems = trxItems.reduce<
      Record<string, { qty: number; price: number }>
    >((acc, item) => {
      acc[item.id] = {
        qty: toNumber(trxInput[item.id]),
        price: getRowPrice(item),
      };
      return acc;
    }, {});

    const expensePayload = filledExpenses.map((e) => ({
      note: e.name.trim(),
      amount: toNumber(e.amount),
    }));

    const payload = {
      id: transaksiCashFlow.id,
      cashFlowItems,
      // field lama (kompatibel dengan backend sekarang)
      qris: amountOf("qris"),
      gofood: amountOf("gofood"),
      grabfood: amountOf("grabfood"),
      shopeefood: amountOf("shopeefood"),
      pengeluaranTambahan: expensePayload.reduce((a, e) => a + e.amount, 0),
      expenses: expensePayload,
      note: trxNote.trim(),
    };

    const mutateOptions = {
      onSuccess: ({ message }: { message: string }) => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:history"] });
        queryClient.invalidateQueries({
          queryKey: ["cash-flow:cabang:today"],
        });
        closeTransaksi();
        ToastSuccess(message);
      },
      onError: (err: unknown) => handleError(err as never),
      onSettled: () => setSavingTrx(false),
    } as never;

    if (transaksiCashFlow.verified === 1) {
      setSavingTrx(true);
      approvalCashFlow(payload as never, mutateOptions);
    } else if (transaksiCashFlow.verified === 2) {
      setSavingTrx(true);
      submitCashFlow(payload as never, mutateOptions);
    }
  }, [
    transaksiCashFlow,
    expenses,
    incomeActive,
    income,
    trxItems,
    trxInput,
    trxNote,
    submitCashFlow,
    approvalCashFlow,
    queryClient,
    closeTransaksi,
  ]);

  /* -------------------- Render list -------------------- */

  const renderCashFlow = useCallback(
    ({ item }: { item: CashFlow }) => (
      <CashFlowCard
        cashFlow={item}
        isAdmin={isAdmin}
        onDetail={openDetail}
        onStok={openStok}
        onTransaksi={openTransaksi}
      />
    ),
    [isAdmin, openDetail, openStok, openTransaksi],
  );

  const renderStockItem = useCallback(
    ({ item }: { item: ICashFlowItem }) => {
      const price = getRowPrice(item);
      return (
        <View style={styles.stockRow}>
          <View style={styles.flex}>
            <Text style={styles.stockName} numberOfLines={2}>
              {item.product?.name ?? ""}
            </Text>
            {price > 0 ? (
              <Text style={styles.stockPrice} numberOfLines={1}>
                {formatRupiah(price)}  ·  {formatRupiah(toNumber(item.in) * price)}
              </Text>
            ) : null}
          </View>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>{formatCount(item.in)}</Text>
          </View>
        </View>
      );
    },
    [],
  );

  const renderTrxItem = useCallback(
    ({ item }: { item: ICashFlowItem }) => {
      const price = getRowPrice(item);
      return (
        <StockRow
          id={item.id}
          name={item.product?.name || "-"}
          priceLabel={
            price > 0
              ? `${formatRupiah(price)}  ·  Awal ${formatCount(item.in)}`
              : `Awal ${formatCount(item.in)}`
          }
          qty={trxInput[String(item.id)] ?? getSisaSeed(item)}
          editable={canEditTrx}
          onChangeQty={handleChangeTrxQty}
        />
      );
    },
    [canEditTrx, handleChangeTrxQty, trxInput],
  );

  const trxKeyExtractor = useCallback(
    (item: ICashFlowItem, index: number) =>
      `${String(getProductId(item))}-${index}`,
    [],
  );

  const kavBehavior = Platform.OS === "ios" ? "padding" : "height";
  const detailVerified = isVerifiedFlow(selectedCabang);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={ORANGE} barStyle="light-content" />

      {/* ── Fixed Top Section ── */}
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </SafeAreaView>

      <View style={styles.fixedContent}>
        {/* Greeting Card */}
        <View style={styles.greetCard}>
          <View style={styles.shopIcon}>
            <MaterialCommunityIcons name="store" size={32} color={ORANGE} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.greetSub}>Selamat datang,</Text>
            <Text style={styles.greetName} numberOfLines={1}>
              {user?.name ?? "-"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── History Cabang ── */}
      {loadingCabang || loadingCabangToday ? (
        <View style={styles.center}>
          <ActivityIndicator color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={(isCabang ? cabangData : cabangTodayData) as CashFlow[]}
          keyExtractor={(item: CashFlow, index) => `${item.id}-${index}`}
          renderItem={renderCashFlow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cabangScroll}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Approval</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="store-off-outline"
                size={28}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>Belum ada history</Text>
              <Text style={styles.emptyText}>
                Tarik ke bawah untuk memuat ulang.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[ORANGE]}
              tintColor={ORANGE}
            />
          }
        />
      )}

      {/* ── Modal Detail (Laporan Harian) — bottom sheet ── */}
      <Modal
        visible={selectedCabang !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDetail}
      >
        <View style={styles.backdrop}>
          {/* Tap outside the sheet closes it. Kept as a sibling (not a wrapper)
              so it doesn't steal touches from the ScrollView inside the sheet. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDetail}
            accessibilityRole="button"
            accessibilityLabel="Tutup detail cabang"
          />
          <View style={[styles.sheet, styles.sheetTall]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.cabangIconWrap}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={22}
                  color={ORANGE}
                />
              </View>

              <View style={styles.flex}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {selectedCabang?.user?.name || "-"}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: detailVerified ? "#D1FAE5" : "#FEE2E2" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: detailVerified ? GREEN : RED },
                  ]}
                >
                  {detailVerified ? "Aktif" : "Belum diverifikasi"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {loadingDetail ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator color={ORANGE} />
              </View>
            ) : errorDetail || !detailData ? (
              <View style={styles.sheetLoading}>
                <Text style={styles.emptyText}>Gagal memuat detail.</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.sheetList}
              >
                {/* Stock Awal */}
                <Text style={styles.detailSectionTitle}>Stock Awal</Text>
                {detailData.cashFlowItems?.map((item) => (
                  <DetailRow
                    key={item.id}
                    label={item.product?.name ?? "-"}
                    value={item.in}
                  />
                ))}
                <DetailTotalRow
                  label="Jumlah"
                  value={formatRupiah(detailTotalPrice)}
                />

                <View style={styles.detailDivider} />

                {/* Stock Sisa: kembali ke inventory, bukan pengeluaran */}
                <Text style={styles.detailSectionTitle}>Stock Sisa</Text>
                {detailData.cashFlowItems?.map((item) => (
                  <DetailRow
                    key={item.id}
                    label={item.product?.name ?? "-"}
                    value={toNumber(item.in) - toNumber(item.out)}
                  />
                ))}
                <DetailTotalRow
                  label="Total Stok Sisa"
                  value={formatRupiah(detailTotalPriceSisa)}
                />

                <View style={styles.detailDivider} />

                {/* Laporan Pengeluaran (banyak item) */}
                <Text style={styles.detailSectionTitle}>
                  Laporan Pengeluaran
                </Text>
                {detailExpenses.length === 0 ? (
                  <DetailRow label="Pengeluaran tambahan" value="-" />
                ) : (
                  detailExpenses.map((e, i) => (
                    <DetailRow
                      key={`${e.id ?? i}-${i}`}
                      label={e.note || `Pengeluaran ${i + 1}`}
                      value={formatRupiah(e.amount)}
                    />
                  ))
                )}
                <DetailTotalRow
                  label="Jumlah Pengeluaran"
                  value={formatRupiah(detailTotalPengeluaran)}
                />

                {/* Pendapatan per kanal (hanya kanal yang dipakai) */}
                {detailChannels.length > 0 ? (
                  <>
                    <View style={styles.detailDivider} />
                    <Text style={styles.detailSectionTitle}>
                      Pendapatan Kanal
                    </Text>
                    {detailChannels.map(({ channel, amount }) => (
                      <DetailRow
                        key={channel.key}
                        label={channel.label}
                        value={formatRupiah(amount)}
                      />
                    ))}
                    <DetailTotalRow
                      label="Total Kanal"
                      value={formatRupiah(detailChannelTotal)}
                    />
                  </>
                ) : null}

                <View style={styles.detailDivider} />

                {/* Pendapatan Cash (paling bawah) */}
                <Text style={styles.detailSectionTitle}>PENDAPATAN CASH</Text>
                <DetailRow
                  label="Tunai"
                  value={formatRupiah(totalPenjualan - detailChannelTotal)}
                />
                <DetailTotalRow
                  label="Total Penjualan"
                  value={formatRupiah(totalPenjualan)}
                />

                {detailData.note ? (
                  <DetailRow label="Catatan" value={detailData.note} />
                ) : null}

                {/* Sisa Cash */}
                <View style={styles.sisaCashBox}>
                  <Text style={styles.sisaCashLabel}>Sisa Cash</Text>
                  <Text style={styles.sisaCashValue}>
                    {formatRupiah(
                      totalPenjualan - detailChannelTotal - detailTotalPengeluaran,
                    )}
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={closeDetail}
              accessibilityRole="button"
            >
              <Text style={styles.sheetCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal Transaksi (2 langkah: Stok Sisa -> Pendapatan) ── */}
      <Modal
        visible={transaksiCashFlow !== null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
        statusBarTranslucent={false}
        onRequestClose={handleTrxBack}
      >
        <SafeAreaView
          style={styles.fullModalContainer}
          edges={["top", "bottom"]}
        >
          <StatusBar backgroundColor={ORANGE} barStyle="light-content" />
          <KeyboardAvoidingView style={styles.flex} behavior={kavBehavior}>
            <View style={styles.fullModalHeader}>
              <TouchableOpacity
                onPress={handleTrxBack}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={trxStep === 2 ? "Kembali" : "Tutup"}
                style={styles.fullModalBack}
              >
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>

              <View style={styles.flex}>
                <Text style={styles.fullModalTitle}>Transaksi</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {transaksiCashFlow?.user?.name || user?.name || "-"} -{" "}
                  {formatDate(
                    transaksiCashFlow?.createdAt || new Date().toDateString(),
                  )}
                </Text>
              </View>
            </View>

            {/* Stepper */}
            <View style={styles.stepper}>
              {TRX_STEPS.map((label, i) => {
                const n = i + 1;
                const active = trxStep === n;
                const done = trxStep > n;
                const isLast = i === TRX_STEPS.length - 1;

                return (
                  <View
                    key={label}
                    style={[styles.stepItem, !isLast && styles.flex]}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        (active || done) && styles.stepCircleActive,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.stepCircleText,
                            active && styles.stepCircleTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        (active || done) && styles.stepLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                    {!isLast ? (
                      <View
                        style={[styles.stepLine, done && styles.stepLineActive]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Ringkasan di atas */}
            <View style={styles.summaryCard}>
              {trxStep === 1 ? (
                <>
                  <Text style={styles.summaryLabel}>Penjualan dari stok</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {formatRupiah(trxPenjualan)}
                  </Text>
                  <Text style={styles.summarySub}>
                    Total stok awal {formatRupiah(trxTotalStok)}
                    {"  −  "}Stok sisa {formatRupiah(trxNilaiSisa)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.summaryLabel}>Saldo</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      trxSaldo < 0 && { color: RED },
                    ]}
                    numberOfLines={1}
                  >
                    {formatRupiah(trxSaldo)}
                  </Text>
                  <Text style={styles.summarySub}>
                    Penjualan {formatRupiah(trxPenjualan)}
                    {"  −  "}Kanal {formatRupiah(trxPendapatan)}
                    {"  −  "}Pengeluaran {formatRupiah(trxPengeluaran)}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.divider} />

            {trxStep === 1 ? (
              /* ── Langkah 1: Stok Sisa ── */
              <FlatList
                data={trxItems}
                extraData={trxInput}
                keyExtractor={trxKeyExtractor}
                style={styles.fullModalList}
                contentContainerStyle={styles.fullModalListContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListHeaderComponent={
                  <Text style={styles.stepHint}>
                    Isi jumlah stok yang tersisa untuk tiap produk. Setiap sisa
                    akan mengurangi total sesuai harganya.
                  </Text>
                }
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      size={28}
                      color="#9CA3AF"
                    />
                    <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
                    <Text style={styles.emptyText}>
                      Stock hari ini belum diinput untuk cabang ini.
                    </Text>
                  </View>
                }
                renderItem={renderTrxItem}
              />
            ) : (
              /* ── Langkah 2: Kanal pendapatan + pengeluaran ── */
              <PaymentStep
                income={income}
                active={incomeActive}
                expenses={expenses}
                note={trxNote}
                editable={canEditTrx}
                onToggleChannel={handleToggleChannel}
                onChangeIncome={handleChangeIncome}
                onAddExpense={handleAddExpense}
                onChangeExpense={handleChangeExpense}
                onRemoveExpense={handleRemoveExpense}
                onChangeNote={setTrxNote}
              />
            )}

            <View style={styles.divider} />

            {/* Footer: Lanjut (langkah 1) / Kembali + Submit (langkah 2) */}
            <View style={styles.sheetActions}>
              {trxStep === 1 ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={handleTrxNext}
                  accessibilityRole="button"
                >
                  <Text style={styles.actionBtnPrimaryText}>Lanjut</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.calBtnGhost]}
                    onPress={() => setTrxStep(1)}
                    disabled={savingTrx}
                    accessibilityRole="button"
                  >
                    <Text style={styles.calBtnGhostText}>Kembali</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.actionBtnPrimary,
                      (!canEditTrx || savingTrx) && styles.btnDisabled,
                    ]}
                    disabled={savingTrx || !canEditTrx}
                    onPress={submitTrx}
                    accessibilityRole="button"
                    accessibilityState={{ busy: savingTrx }}
                  >
                    {savingTrx ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnPrimaryText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal Stok Hari Ini ── */}
      <Modal
        visible={stokToday !== null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
        statusBarTranslucent={false}
        onRequestClose={closeStok}
      >
        <SafeAreaView
          style={styles.fullModalContainer}
          edges={["top", "bottom"]}
        >
          <StatusBar backgroundColor={ORANGE} barStyle="light-content" />
          <View style={styles.fullModalHeader}>
            <TouchableOpacity
              onPress={closeStok}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              style={styles.fullModalBack}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>

            <View style={styles.flex}>
              <Text style={styles.fullModalTitle}>Stok Hari Ini</Text>
              <Text style={styles.sheetSubtitle} numberOfLines={1}>
                {stokToday?.user?.name || user?.name || "-"} -{" "}
                {formatDate(stokToday?.createdAt || new Date().toDateString())}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <FlatList
            data={stokToday?.cashFlowItems || []}
            keyExtractor={trxKeyExtractor}
            style={styles.fullModalList}
            contentContainerStyle={styles.fullModalListContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={28}
                  color="#9CA3AF"
                />
                <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
                <Text style={styles.emptyText}>
                  Stock hari ini belum diinput untuk cabang ini.
                </Text>
              </View>
            }
            renderItem={renderStockItem}
          />

          {(stokToday?.cashFlowItems?.length ?? 0) > 0 ? (
            <View style={styles.stokFooter}>
              <View style={styles.stokFooterRow}>
                <Text style={styles.stokFooterLabel}>Total stok</Text>
                <Text style={styles.stokFooterQty}>
                  {formatThousand(formatCount(stokTotalQty))} pcs
                </Text>
              </View>
              <View style={styles.stokFooterRow}>
                <Text style={styles.stokFooterLabel}>Total nilai stok</Text>
                <Text style={styles.stokFooterRp}>
                  {formatRupiah(stokTotalRp)}
                </Text>
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  headerSafeArea: { backgroundColor: ORANGE },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  fixedContent: { paddingHorizontal: 16, paddingTop: 16 },
  cabangScroll: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },

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
  shopIcon: { backgroundColor: ORANGE_SOFT, borderRadius: 10, padding: 10 },
  greetSub: { color: "#888", fontSize: 13 },
  greetName: { color: "#222", fontSize: 18, fontWeight: "700" },

  // DATE FILTER
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  dateFilterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateFilterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  dateFilterTextPlaceholder: { color: "#9CA3AF", fontWeight: "600" },
  dateFilterClear: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
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
    gap: 8,
  },
  statValue: { flexShrink: 1, fontSize: 28, fontWeight: "800", color: "#222" },
  statValueMoney: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#222" },

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
  cabangIconWrap: {
    backgroundColor: ORANGE_SOFT,
    borderRadius: 8,
    padding: 8,
  },
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
  cabangStatText: { flex: 1, marginLeft: 8 },
  statIconWrap: { borderRadius: 8, padding: 7 },
  cabangStatLabel: { fontSize: 10, color: "#9CA3AF", marginBottom: 2 },
  cabangStatValue: { fontSize: 13, fontWeight: "700", color: "#374151" },
  cabangStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  cabangFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    minHeight: 40,
  },
  cardBtnGhost: {
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: "#FADDD1",
  },
  cardBtnGhostText: { color: ORANGE, fontSize: 12, fontWeight: "700" },
  cardBtnSolid: { backgroundColor: ORANGE },
  cardBtnSolidText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardBtnSolidDisabled: { backgroundColor: "#E5E7EB" },
  cardBtnSolidDisabledText: { color: "#6B7280" },
  btnDisabled: { opacity: 0.5 },

  // SHEETS
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetTall: { maxHeight: "85%" },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  sheetLoading: { paddingVertical: 48, alignItems: "center" },
  sheetList: { flexGrow: 0, flexShrink: 1 },
  sheetCloseBtn: {
    marginTop: 14,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sheetCloseText: { color: "#fff", fontWeight: "800" },

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 50,
  },
  actionBtnPrimary: { backgroundColor: ORANGE },
  actionBtnPrimaryText: { color: "#fff", fontWeight: "800" },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  fieldLabelLg: { fontSize: 14, fontWeight: "800", color: "#111827" },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 13,
  },
  fieldInputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  // FULL SCREEN MODAL
  fullModalContainer: { flex: 1, backgroundColor: "#fff" },
  fullModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  fullModalBack: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  fullModalTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  fullModalList: { flex: 1 },
  fullModalListContent: { paddingHorizontal: 18, paddingBottom: 24 },

  // STEPPER
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  stepCircleActive: { backgroundColor: ORANGE },
  stepCircleText: { fontSize: 12, fontWeight: "800", color: "#9CA3AF" },
  stepCircleTextActive: { color: "#fff" },
  stepLabel: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  stepLabelActive: { color: "#111827" },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  stepLineActive: { backgroundColor: ORANGE },
  stepHint: { fontSize: 12, color: "#6B7280", marginBottom: 10 },

  // SUMMARY
  summaryCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: "#FADDD1",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: ORANGE,
    marginTop: 2,
  },
  summarySub: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  // KANAL (chip pilihan)
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  chipText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  presetChipText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  hintBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  hintBoxText: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },

  // INCOME
  incomeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 14,
  },
  incomeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  incomeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  incomeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  incomeInputWrapFilled: {
    borderColor: ORANGE,
    backgroundColor: ORANGE_SOFT,
  },
  incomePrefix: { fontSize: 13, fontWeight: "700", color: "#9CA3AF" },
  incomeInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  // PENGELUARAN (one-to-many)
  expenseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  expenseHeaderTotal: { fontSize: 14, fontWeight: "800", color: RED },
  expenseCard: {
    borderWidth: 1,
    borderColor: "#F3F4F6",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  expenseCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseIndex: { fontSize: 12, fontWeight: "800", color: "#9CA3AF" },
  expenseAmountWrap: { backgroundColor: "#fff" },
  addExpenseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ORANGE,
    backgroundColor: ORANGE_SOFT,
    marginBottom: 10,
  },
  addExpenseText: { color: ORANGE, fontWeight: "800", fontSize: 13 },

  // STOCK ROW
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  stockName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  stockPrice: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  qtyInput: {
    width: 72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 8,
    color: "#111827",
    textAlign: "center",
  },
  qtyInputFilled: { borderColor: ORANGE, backgroundColor: ORANGE_SOFT },
  qtyBadge: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: ORANGE_SOFT,
    alignItems: "center",
  },
  qtyBadgeText: { color: ORANGE, fontWeight: "800", fontSize: 13 },
  stokFooter: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  stokFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stokFooterLabel: { color: "#6B7280", fontSize: 13 },
  stokFooterQty: { fontWeight: "800", color: "#111827", fontSize: 15 },
  stokFooterRp: { fontWeight: "800", color: GREEN, fontSize: 15 },

  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyTitle: { fontWeight: "700", color: "#374151" },
  emptyText: { color: "#6B7280", fontSize: 12, textAlign: "center" },

  // DETAIL SHEET
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: ORANGE,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailRowLabel: { flex: 1, fontSize: 13, color: "#6B7280" },
  detailRowValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  detailRowTotal: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 4,
    paddingTop: 8,
  },
  detailRowTotalLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  detailRowTotalValue: { fontSize: 14, fontWeight: "800", color: "#111827" },
  detailDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  sisaCashBox: {
    marginTop: 16,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sisaCashLabel: { fontSize: 13, fontWeight: "700", color: "#065F46" },
  sisaCashValue: { fontSize: 16, fontWeight: "800", color: GREEN },

  // CALENDAR
  calSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  calSummaryItem: { flex: 1 },
  calSummaryLabel: { fontSize: 11, color: "#9CA3AF", marginBottom: 2 },
  calSummaryValue: { fontSize: 14, fontWeight: "800", color: "#111827" },

  calMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  calMonthTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },

  calWeekRow: { flexDirection: "row" },
  calCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  calCellBand: { backgroundColor: ORANGE_SOFT },
  calCellBandStart: { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  calCellBandEnd: { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  calWeekday: { fontSize: 11, fontWeight: "700", color: "#9CA3AF" },

  calDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayEdge: { backgroundColor: ORANGE },
  calDayToday: { borderWidth: 1, borderColor: ORANGE },
  calDayText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  calDayTextInRange: { color: ORANGE, fontWeight: "700" },
  calDayTextEdge: { color: "#fff", fontWeight: "800" },

  calActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  calBtnGhost: {
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: "#FADDD1",
  },
  calBtnGhostText: { color: ORANGE, fontWeight: "800" },
});
