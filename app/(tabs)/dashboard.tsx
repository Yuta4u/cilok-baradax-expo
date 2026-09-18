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
  useDashboardQuery,
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

type RowId = string | number;

type CashFlowDetail = {
  id: number | string;
  productId?: number | string;
  qty?: number;
  in?: number;
  price?: number;
  name?: string;
  product?: { id?: number | string; name?: string; price?: number };
};

type Props = {
  navigation?: { navigate: (route: string, params?: object) => void };
};

/** Rentang tanggal yang dikirim ke API. Format: "YYYY-MM-DD" atau null. */
type DateRange = {
  sd: string | null;
  ed: string | null;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(/[^0-9,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getProductId = (item: CashFlowDetail): RowId =>
  item.productId ?? item.product?.id ?? item.id;

// FIX: kondisinya sebelumnya terbalik — kalau item.out falsy (0/undefined),
// harusnya jatuh ke item.in, bukan kembalikan item.out itu sendiri.
const getRowQty = (item: ICashFlowItem): number =>
  toNumber(item.out ? item.in - item.out : item.in);

const getRowPrice = (item: CashFlowDetail): number =>
  toNumber(item.price ?? item.product?.price);

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

/* ─── Calendar helpers ─────────────────────────────────────────────────── */

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_ID_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Minggu dimulai dari Senin (standar Indonesia)
const WEEKDAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Date lokal -> "YYYY-MM-DD" (tanpa geser timezone seperti toISOString). */
const toYMD = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const makeYMD = (year: number, month: number, day: number): string =>
  `${year}-${pad2(month + 1)}-${pad2(day)}`;

/** "YYYY-MM-DD" -> "29 Agu 2026" (parse manual, aman dari timezone). */
const formatYMDLabel = (ymd: string | null): string => {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "-";
  return `${d} ${MONTHS_ID_SHORT[m - 1]} ${y}`;
};

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/** Offset kolom hari pertama bulan (Senin = 0 ... Minggu = 6). */
const getFirstDayOffset = (year: number, month: number): number =>
  (new Date(year, month, 1).getDay() + 6) % 7;

/* ─── DateRangeCalendar ────────────────────────────────────────────────────
 * Calendar simpel tanpa library tambahan.
 * - Tap 1x  -> set start date (sd)
 * - Tap 2x  -> set end date (ed)
 * - Tap lagi setelah range lengkap -> mulai range baru
 * - onApply mengembalikan { sd, ed } format "YYYY-MM-DD"
 * ------------------------------------------------------------------------ */

type DateRangeCalendarProps = {
  visible: boolean;
  value: DateRange;
  onClose: () => void;
  onApply: (range: DateRange) => void;
};

const DateRangeCalendar = ({
  visible,
  value,
  onClose,
  onApply,
}: DateRangeCalendarProps) => {
  const todayYMD = useMemo(() => toYMD(new Date()), []);

  const initialView = useMemo(() => {
    const base = value.sd ? value.sd.split("-").map(Number) : null;
    const now = new Date();
    return {
      year: base ? base[0] : now.getFullYear(),
      month: base ? base[1] - 1 : now.getMonth(),
    };
  }, [value.sd]);

  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const [sd, setSd] = useState<string | null>(value.sd);
  const [ed, setEd] = useState<string | null>(value.ed);

  // Sinkronkan state draft tiap kali sheet dibuka.
  React.useEffect(() => {
    if (visible) {
      setSd(value.sd);
      setEd(value.ed);
      setViewYear(initialView.year);
      setViewMonth(initialView.month);
    }
  }, [visible, value.sd, value.ed, initialView]);

  const goPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handlePickDay = useCallback(
    (ymd: string) => {
      // Belum ada sd, atau range sudah lengkap -> mulai range baru
      if (!sd || (sd && ed)) {
        setSd(ymd);
        setEd(null);
        return;
      }
      // Sudah ada sd, belum ada ed
      if (ymd < sd) {
        setSd(ymd); // tap sebelum sd -> jadikan sd baru
        return;
      }
      setEd(ymd); // ymd >= sd (sama = 1 hari saja)
    },
    [sd, ed],
  );

  const handleReset = useCallback(() => {
    setSd(null);
    setEd(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!sd) return;
    onApply({ sd, ed: ed ?? sd });
  }, [sd, ed, onApply]);

  // Susun sel kalender: padding kosong + tanggal 1..N
  const cells = useMemo(() => {
    const offset = getFirstDayOffset(viewYear, viewMonth);
    const total = getDaysInMonth(viewYear, viewMonth);
    const list: Array<number | null> = [];
    for (let i = 0; i < offset; i++) list.push(null);
    for (let d = 1; d <= total; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [viewYear, viewMonth]);

  const weeks = useMemo(() => {
    const rows: Array<Array<number | null>> = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);

  const hasRange = !!sd && !!ed && sd !== ed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Tutup kalender"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>Pilih Tanggal</Text>

          {/* Ringkasan sd -> ed */}
          <View style={styles.calSummary}>
            <View style={styles.calSummaryItem}>
              <Text style={styles.calSummaryLabel}>Dari (sd)</Text>
              <Text style={styles.calSummaryValue}>{formatYMDLabel(sd)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
            <View style={styles.calSummaryItem}>
              <Text style={styles.calSummaryLabel}>Sampai (ed)</Text>
              <Text style={styles.calSummaryValue}>{formatYMDLabel(ed)}</Text>
            </View>
          </View>

          {/* Header bulan */}
          <View style={styles.calMonthRow}>
            <TouchableOpacity
              onPress={goPrevMonth}
              hitSlop={10}
              style={styles.calNavBtn}
              accessibilityRole="button"
              accessibilityLabel="Bulan sebelumnya"
            >
              <Ionicons name="chevron-back" size={18} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.calMonthTitle}>
              {MONTHS_ID[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={goNextMonth}
              hitSlop={10}
              style={styles.calNavBtn}
              accessibilityRole="button"
              accessibilityLabel="Bulan berikutnya"
            >
              <Ionicons name="chevron-forward" size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Nama hari */}
          <View style={styles.calWeekRow}>
            {WEEKDAYS_ID.map((d) => (
              <View key={d} style={styles.calCell}>
                <Text style={styles.calWeekday}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Grid tanggal */}
          {weeks.map((week, wi) => (
            <View key={`w-${wi}`} style={styles.calWeekRow}>
              {week.map((day, di) => {
                if (day === null) {
                  return <View key={`e-${wi}-${di}`} style={styles.calCell} />;
                }

                const ymd = makeYMD(viewYear, viewMonth, day);
                const isStart = ymd === sd;
                const isEnd = ymd === ed;
                const isEdge = isStart || isEnd;
                const inRange = !!sd && !!ed && ymd > sd && ymd < ed;
                const isToday = ymd === todayYMD;

                return (
                  <Pressable
                    key={ymd}
                    onPress={() => handlePickDay(ymd)}
                    style={[
                      styles.calCell,
                      (inRange || (hasRange && isEdge)) && styles.calCellBand,
                      hasRange && isStart && styles.calCellBandStart,
                      hasRange && isEnd && styles.calCellBandEnd,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={formatYMDLabel(ymd)}
                    accessibilityState={{ selected: isEdge }}
                  >
                    <View
                      style={[
                        styles.calDay,
                        isEdge && styles.calDayEdge,
                        !isEdge && isToday && styles.calDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          inRange && styles.calDayTextInRange,
                          isEdge && styles.calDayTextEdge,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Actions */}
          <View style={styles.calActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.calBtnGhost]}
              onPress={handleReset}
              accessibilityRole="button"
            >
              <Text style={styles.calBtnGhostText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnPrimary,
                !sd && styles.btnDisabled,
              ]}
              onPress={handleApply}
              disabled={!sd}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnPrimaryText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
    <View style={styles.stockRow} key={`${id}-${name}`}>
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

/* ─── Detail Sheet: baris & section reusable ─── */

type DetailRowProps = {
  label: string;
  value: string | number | null;
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

type CashFlowCardProps = {
  cashFlow: ICashFlow;
  isAdmin: boolean;
  onDetail: (cashFlow: ICashFlow) => void;
  onTransaksi: (cashFlow: ICashFlow) => void;
};

const CashFlowCard = React.memo(function CabangCard({
  cashFlow,
  onDetail,
  onTransaksi,
}: CashFlowCardProps) {
  const isVerified = cashFlow.verified === 0;

  const omset = cashFlow.cashFlowItems.reduce((acc, item) => {
    return acc + item.out! * item.price;
  }, 0);

  const omsetTodayObj = {
    2: "Submit First",
    1: "Approval",
    0: formatRupiah(omset),
  };

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
            { backgroundColor: !isVerified ? "#FEE2E2" : "#D1FAE5" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: !isVerified ? "#DC2626" : GREEN },
            ]}
          >
            {!isVerified ? "Belum diverifikasi" : "Aktif"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats row: omset + transaksi */}
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
              {omsetTodayObj[cashFlow.verified]}
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
          style={[styles.cardBtn, styles.cardBtnGhost]}
          onPress={() => onDetail(cashFlow)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Detail cabang ${""}`}
        >
          <Ionicons name="newspaper-outline" size={15} color={ORANGE} />
          <Text style={styles.cardBtnGhostText}>Detail</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnSolid]}
          onPress={() => onTransaksi(cashFlow)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Transaksi hari ini ${""}`}
        >
          <Ionicons name="receipt-outline" size={15} color="#fff" />
          <Text style={styles.cardBtnSolidText}>Transaksi Hari Ini</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function DashboardScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const role = enumeratePermission(user?.permission ?? 1);
  const isCabang = role.includes("CABANG");
  const isAdmin = role.includes("ADMIN") || role.includes("SUPER_USER");

  const { mutate: submitCashFlow } = useSubmitCashFlowMutation();

  const [selectedCabangId, setSelectedCabangId] = useState<string | null>(null);
  /* -------------------- Calendar (sd / ed) — khusus CABANG -------------------- */

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ sd: null, ed: null });

  const {
    data: detailData,
    isLoading: loadingDetail,
    isError: errorDetail,
  } = useGetDetailByIdQuery(selectedCabangId ?? undefined);

  const {
    data: cabangData,
    isLoading: loadingCabang,
    isRefetching,
    refetch,
  } = useCabangHistoryQuery(isCabang, dateRange as never);
  const { data: dashboardData, isLoading: loadingDashboard } =
    useDashboardQuery(isCabang, dateRange as never);

  const { data: cabangTodayData, isLoading: loadingCabangToday } =
    useCabangTodayQuery(isAdmin);
  const { mutate: approvalCashFlow } = useApprovalCashFlowMutation();

  const [selectedCabang, setSelectedCabang] = useState<ICashFlow | null>(null);

  const openCalendar = useCallback(() => setCalendarOpen(true), []);
  const closeCalendar = useCallback(() => setCalendarOpen(false), []);

  const handleApplyRange = useCallback((range: DateRange) => {
    setDateRange(range);
    setCalendarOpen(false);

    console.log(range, "hit");

    // TODO: panggil API kamu di sini.
    // range.sd -> start date ("YYYY-MM-DD")
    // range.ed -> end date   ("YYYY-MM-DD")
    // Contoh: setelah API-nya jadi, kirim `dateRange` sebagai param ke
    // useCabangHistoryQuery(isCabang, dateRange) lalu queryKey-nya ikut
    // berubah dan data akan refetch otomatis.
  }, []);

  const clearDateRange = useCallback(() => {
    setDateRange({ sd: null, ed: null });
  }, []);

  const handleDownload = useCallback(() => {
    console.log(dateRange, "test");
  }, [dateRange]);

  const dateRangeLabel = useMemo(() => {
    if (!dateRange.sd) return "Semua tanggal";
    if (!dateRange.ed || dateRange.ed === dateRange.sd) {
      return formatYMDLabel(dateRange.sd);
    }
    return `${formatYMDLabel(dateRange.sd)} - ${formatYMDLabel(dateRange.ed)}`;
  }, [dateRange]);

  const openDetail = useCallback((cabang: ICashFlow) => {
    const isVerified = cabang.verified === 0;

    if (!isVerified) {
      ToastError("Laporan belum diverifikasi");
      return;
    }

    setSelectedCabang(cabang);
    setSelectedCabangId(cabang.id);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedCabang(null);
  }, []);

  const [trxItems, setTrxItems] = useState<ICashFlowItem[]>([]);
  const [trxLoading, setTrxLoading] = useState(false);
  /** productId -> qty string, seeded from the API and edited in place */
  const [trxInput, setTrxInput] = useState<Record<string, string>>({});
  /** Untouched copy of the seed, so "dirty" survives a re-fetch. */
  const [trxBaseline, setTrxBaseline] = useState<Record<string, string>>({});
  const [savingTrx, setSavingTrx] = useState(false);
  const [approving, setApproving] = useState(false);

  const [pengeluaranTambahan, setPengeluaranTambahan] = useState("");
  const [trxNote, setTrxNote] = useState("");

  const [transaksiCashFlow, setTransaksiCashFlow] = useState<ICashFlow | null>(
    null,
  );

  const openTransaksi = useCallback((cashFlow: ICashFlow) => {
    const seed = cashFlow.cashFlowItems.reduce<Record<string, string>>(
      (acc, item) => {
        acc[item.id] = String(getRowQty(item));
        return acc;
      },
      {},
    );

    setTrxItems(cashFlow.cashFlowItems);
    setTrxInput(seed);
    setTrxBaseline(seed);
    setTransaksiCashFlow(cashFlow);

    setPengeluaranTambahan(cashFlow.overhead?.toString() ?? "");
    setTrxNote(cashFlow.note ?? "");
  }, []);

  const closeTransaksi = useCallback(() => {
    setTrxItems([]);
    setTrxInput({});
    setTrxBaseline({});
    setTransaksiCashFlow(null);

    setPengeluaranTambahan("");
    setTrxNote("");
  }, []);

  const submitTrx = () => {
    if (!transaksiCashFlow) {
      ToastError("Cash flow not found, please reopenx.");
      return;
    }

    const payload = {
      id: transaksiCashFlow?.id as never,
      cashFlowItems: buildPayload(),
      pengeluaranTambahan: toNumber(pengeluaranTambahan),
      note: trxNote.trim(),
    };

    setSavingTrx(true);
    submitCashFlow(payload, {
      onSuccess: ({ message }: { message: string }) => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:history"] });
        closeTransaksi();
        ToastSuccess(message);
      },
      onError: (err) => handleError(err as never),
      onSettled: () => setSavingTrx(false),
    });
  };

  const handleChangeTrxQty = useCallback((id: RowId, qty: string) => {
    setTrxInput((prev) => ({ ...prev, [String(id)]: qty }));
  }, []);

  const buildPayload = () =>
    trxItems.reduce<Record<string, { qty: number; price: number }>>(
      (acc, item) => {
        const key = item.id;
        acc[key] = {
          qty: toNumber(trxInput[key]),
          price: getRowPrice(item),
        };
        return acc;
      },
      {},
    );

  const confirmApprove = () => {
    const payload = {
      id: transaksiCashFlow?.id as never,
      cashFlowItems: buildPayload(),
      pengeluaranTambahan: toNumber(pengeluaranTambahan),
      note: trxNote.trim(),
    };

    setApproving(true);
    approvalCashFlow(payload, {
      onSuccess: ({ message }: { message: string }) => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:history"] });
        queryClient.invalidateQueries({
          queryKey: ["cash-flow:cabang:today"],
        });

        closeTransaksi();
        ToastSuccess(message);
      },
      onError: (err) => handleError(err as never),
      onSettled: () => setApproving(false),
    });
  };

  /* -------------------- Navigation -------------------- */

  /**
   * "Lihat Semua" still navigates to a full list screen. Under expo-router a
   * screen never receives a `navigation` prop, so this is a no-op there —
   * swap it for `useRouter()` + `router.push("/cabang")` if that's the setup.
   */
  const openCabangList = useCallback(() => {
    navigation?.navigate("Cabang");
  }, [navigation]);

  const renderCashFlow = useCallback(
    ({ item }: { item: ICashFlow }) => (
      <CashFlowCard
        cashFlow={item}
        isAdmin={isAdmin}
        onDetail={openDetail}
        onTransaksi={openTransaksi}
      />
    ),
    [isAdmin, openDetail, openTransaksi],
  );

  // FIX: renderItem transaksi sekarang di-useCallback dan cuma re-create saat
  // dependency-nya benar-benar berubah (bukan setiap keystroke di field lain
  // yang bikin DashboardScreen re-render).
  const renderTrxItem = useCallback(
    ({ item }: { item: ICashFlowItem }) => {
      const qty = trxInput[item.id] ?? "";
      const price = getRowPrice(item);
      const subtotal = item.out ? item.out * price : item.in * price;

      return (
        <StockRow
          id={item.id}
          name={item.product?.name || "-"}
          priceLabel={
            price > 0
              ? formatRupiah(price) +
                (subtotal > 0 ? `  ·  ${formatRupiah(subtotal)}` : "")
              : undefined
          }
          qty={qty}
          editable={transaksiCashFlow?.verified === 2 || isAdmin}
          onChangeQty={handleChangeTrxQty}
        />
      );
    },
    [trxInput, transaksiCashFlow?.verified, isAdmin, handleChangeTrxQty],
  );

  const trxKeyExtractor = useCallback(
    (item: ICashFlowItem, index: number) =>
      `${String(getProductId(item))}-${index}`,
    [],
  );

  const detailTotalPrice = useMemo(() => {
    return detailData?.cashFlowItems.reduce(
      (acc: number, item: any) => acc + item.out * item.price,
      0,
    );
  }, [detailData]);

  const detailTotalPriceSisa = useMemo(() => {
    return detailData?.cashFlowItems.reduce(
      (acc: number, item: any) => acc + (item.in - item.out) * item.price,
      0,
    );
  }, [detailData]);

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

        {/* ── Filter Tanggal (sd / ed) — hanya untuk CABANG ── */}
        {isCabang && (
          <View style={styles.dateFilterRow}>
            <TouchableOpacity
              style={styles.dateFilterBtn}
              onPress={openCalendar}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Pilih rentang tanggal"
            >
              <Ionicons name="calendar-outline" size={18} color={ORANGE} />
              <Text
                style={[
                  styles.dateFilterText,
                  !dateRange.sd && styles.dateFilterTextPlaceholder,
                ]}
                numberOfLines={1}
              >
                {dateRangeLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {dateRange.sd ? (
              <TouchableOpacity
                style={styles.dateFilterClear}
                onPress={handleDownload}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Hapus filter tanggal"
              >
                <Ionicons name="download-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}

            {dateRange.sd ? (
              <TouchableOpacity
                style={styles.dateFilterClear}
                onPress={clearDateRange}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Hapus filter tanggal"
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {isCabang && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
              <Text style={styles.statLabel}>Omset</Text>
              <View style={styles.statRow}>
                <Text
                  style={styles.statValueMoney}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingDashboard
                    ? "—"
                    : formatRupiah(dashboardData?.data?.totalOmset)}
                </Text>
                <Ionicons name="cash-outline" size={28} color="#10B981" />
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: "#bd2727c9" }]}>
              <Text style={styles.statLabel}>Pengeluaran</Text>
              <View style={styles.statRow}>
                <Text
                  style={styles.statValueMoney}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingDashboard
                    ? "—"
                    : formatRupiah(dashboardData?.data?.totalPengeluaran)}
                </Text>
                <Ionicons name="cash-outline" size={28} color="#bd2727c9" />
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: "#8B5CF6" }]}>
              <Text style={styles.statLabel}>Total Transaksi</Text>
              <View style={styles.statRow}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {loadingDashboard
                    ? "—"
                    : formatCount(dashboardData?.data?.totalTransaksi)}
                </Text>
                <Ionicons name="receipt-outline" size={28} color="#8B5CF6" />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── History Cabang ── */}
      {loadingCabang || loadingCabangToday ? (
        <View style={styles.center}>
          <ActivityIndicator color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={isCabang ? cabangData : cabangTodayData}
          keyExtractor={(item: ICashFlow, index) => {
            return `${item.id}-${index}`;
          }}
          renderItem={renderCashFlow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cabangScroll}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"History"}</Text>
              <TouchableOpacity
                style={styles.lihatSemua}
                onPress={openCabangList}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Lihat semua history"
              ></TouchableOpacity>
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

      {/* ── Modal Calendar (sd / ed) — hanya di-mount untuk CABANG ── */}
      {isCabang && (
        <DateRangeCalendar
          visible={calendarOpen}
          value={dateRange}
          onClose={closeCalendar}
          onApply={handleApplyRange}
        />
      )}

      {/* ── Modal Detail (Laporan Harian) — tetap bottom sheet ── */}
      <Modal
        visible={selectedCabang !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDetail}
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeDetail}
          accessibilityRole="button"
          accessibilityLabel="Tutup detail cabang"
        >
          <Pressable
            style={[styles.sheet, styles.sheetTall]}
            onPress={() => {}}
          >
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
                  {
                    backgroundColor: selectedCabang?.verified
                      ? "#FEE2E2"
                      : "#D1FAE5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: selectedCabang?.verified ? "#DC2626" : GREEN,
                    },
                  ]}
                >
                  {detailData?.verified ? "Belum diverifikasi" : "Aktif"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.sheetList}
            >
              {/* Stock Awal */}
              <Text style={styles.detailSectionTitle}>Stock Awal</Text>
              {detailData?.cashFlowItems.map((item: any) => (
                <DetailRow
                  key={item.id}
                  label={item.product?.name}
                  value={item.in}
                />
              ))}
              <DetailTotalRow
                label="Jumlah"
                value={formatRupiah(detailTotalPrice)}
              />

              <View style={styles.detailDivider} />

              {/* Stock Sisa */}
              <Text style={styles.detailSectionTitle}>Stock Sisa</Text>
              {detailData?.cashFlowItems.map((item: any) => (
                <DetailRow
                  key={item.id}
                  label={item.product.name}
                  value={item.in - item.out}
                />
              ))}
              <DetailTotalRow
                label="Jumlah"
                value={formatRupiah(detailTotalPriceSisa)}
              />

              <View style={styles.detailDivider} />

              {/* Laporan Penjualan */}
              <Text style={styles.detailSectionTitle}>Laporan Penjualan</Text>
              <DetailRow label="Cash" value={formatRupiah(detailTotalPrice)} />
              <DetailTotalRow
                label="Total Penjualan"
                value={formatRupiah(detailTotalPrice)}
              />

              <View style={styles.detailDivider} />

              {/* Laporan Pengeluaran */}
              <Text style={styles.detailSectionTitle}>Laporan Pengeluaran</Text>
              <DetailTotalRow
                label={detailData?.note}
                value={formatRupiah(detailData?.overhead)}
              />
              <DetailTotalRow
                label="Jumlah Pengeluaran"
                value={formatRupiah(detailData?.overhead)}
              />

              {/* Sisa Cash */}
              <View style={styles.sisaCashBox}>
                <Text style={styles.sisaCashLabel}>Sisa Cash</Text>
                <Text style={styles.sisaCashValue}>
                  {formatRupiah(detailTotalPrice - detailData?.overhead)}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={closeDetail}
              accessibilityRole="button"
            >
              <Text style={styles.sheetCloseText}>Tutup</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Transaksi Hari Ini — sekarang full screen ──
       * Alasan: bottom-sheet + Modal transparan + KeyboardAvoidingView di
       * Android rawan flicker saat keyboard buka/tutup. Full-screen modal
       * pakai SafeAreaView biasa jauh lebih stabil dan juga kasih ruang
       * lebih lega buat ngisi form.
       */}
      <Modal
        visible={transaksiCashFlow !== null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
        statusBarTranslucent={false}
        onRequestClose={closeTransaksi}
      >
        <SafeAreaView
          style={styles.fullModalContainer}
          edges={["top", "bottom"]}
        >
          <StatusBar backgroundColor={ORANGE} barStyle="light-content" />
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.fullModalHeader}>
              <TouchableOpacity
                onPress={closeTransaksi}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                style={styles.fullModalBack}
              >
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>

              <View style={styles.flex}>
                <Text style={styles.fullModalTitle}>Transaksi</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {user?.name || "-"} -{" "}
                  {formatDate(
                    transaksiCashFlow?.createdAt || new Date().toDateString(),
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {trxLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator color={ORANGE} />
              </View>
            ) : (
              <FlatList
                data={trxItems}
                keyExtractor={trxKeyExtractor}
                style={styles.fullModalList}
                contentContainerStyle={styles.fullModalListContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
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
            )}

            <View style={styles.divider} />

            <View style={styles.extraFieldsWrap}>
              <Text style={styles.fieldLabel}>Pengeluaran Tambahan</Text>
              <TextInput
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                style={styles.fieldInput}
                value={pengeluaranTambahan}
                onChangeText={(val) => setPengeluaranTambahan(digitsOnly(val))}
                editable={transaksiCashFlow?.verified === 2 || isAdmin}
                accessibilityLabel="Pengeluaran tambahan"
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Note</Text>
              <TextInput
                placeholder="Tambahkan catatan (opsional)"
                placeholderTextColor="#9CA3AF"
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={trxNote}
                onChangeText={setTrxNote}
                editable={transaksiCashFlow?.verified === 2 || isAdmin}
                multiline
                numberOfLines={3}
                accessibilityLabel="Catatan transaksi"
              />
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  transaksiCashFlow?.verified === 1 && styles.btnDisabled,
                  transaksiCashFlow?.verified === 0 && styles.btnDisabled,
                ]}
                disabled={
                  savingTrx ||
                  transaksiCashFlow?.verified === 1 ||
                  transaksiCashFlow?.verified === 0
                }
                onPress={submitTrx}
                accessibilityRole="button"
              >
                {savingTrx ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnPrimaryText}>Submit</Text>
                )}
              </TouchableOpacity>

              {isAdmin ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnApprove]}
                  onPress={confirmApprove}
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: approving,
                  }}
                >
                  {approving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.actionBtnApproveText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </KeyboardAvoidingView>
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

  // DATE FILTER (trigger calendar)
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
  btnDisabled: { opacity: 0.5 },

  // SHEETS (Detail modal — tetap bottom sheet)
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
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  sheetRowLabel: { flex: 1, fontSize: 13, color: "#6B7280" },
  sheetRowValue: { fontSize: 14, fontWeight: "700" },
  sheetLoading: { paddingVertical: 48, alignItems: "center" },
  sheetList: { flexGrow: 0 },
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
    marginTop: 14,
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
  actionBtnApprove: { backgroundColor: GREEN },
  actionBtnApproveText: { color: "#fff", fontWeight: "800" },
  approveHint: {
    marginTop: 8,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },
  extraFieldsWrap: { marginTop: 4, paddingHorizontal: 18 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
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

  // FULL SCREEN MODAL (Transaksi Hari Ini)
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
  fullModalListContent: { paddingHorizontal: 18, paddingBottom: 12 },

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

  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyTitle: { fontWeight: "700", color: "#374151" },
  emptyText: { color: "#6B7280", fontSize: 12, textAlign: "center" },

  // DETAIL SHEET (Laporan Harian)
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

  // CALENDAR (Date range sd / ed)
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
