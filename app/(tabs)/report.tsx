// app/(tabs)/sales-report.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ToastError } from "../../src/utils/toast";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  useSalesReportExcelMutation,
  useSalesReportQuery,
  useSalesReportUsersQuery,
} from "../../src/services/queries/report/report.query";
import { useGetDetailByIdQuery } from "../../src/services/queries/dashboard";
import {
  SalesReportItem,
  toYMD,
} from "../../src/services/api/report/report.api";

const BRAND = "#B94A1C";
const BRAND_SOFT = "#FFF3EE";
const GREEN = "#059669";
const RED = "#DC2626";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─── Detail ────────────────────────────────────────────────────────────── */
/** Detail data comes from GET /cash-flow/detail/:id (see useSalesReportDetail). */

type DetailStockRow = {
  id: number;
  name: string;
  price: number;
  stockIn: number;
  stockOut: number; // terjual
};

type DetailExpense = { id: number; note: string; amount: number };
type DetailChannel = { label: string; amount: number };

type SalesDetail = {
  id: number | string;
  userName: string;
  createdAt: string;
  verified: number;
  note?: string;
  items: DetailStockRow[];
  cash: number;
  channels: DetailChannel[];
  totalSales: number;
  expenses: DetailExpense[];
  stockOverhead: number;
};


/** Real detail from GET /cash-flow/detail/:id, mapped to SalesDetail. */
function useSalesReportDetail(item: SalesReportItem | null) {
  const q = useGetDetailByIdQuery(item ? String(item.id) : undefined);

  const data = useMemo<SalesDetail | undefined>(() => {
    const raw = q.data as any;
    if (!item || !raw) return undefined;
    const n = (v: unknown) => Number(v ?? 0) || 0;

    const channels: DetailChannel[] = [
      { label: "QRIS", amount: n(raw.qris) },
      { label: "GoFood", amount: n(raw.goFood) },
      { label: "GrabFood", amount: n(raw.grabFood) },
      { label: "ShopeeFood", amount: n(raw.shopeeFood) },
    ].filter((c) => c.amount > 0);

    const overheads: any[] = Array.isArray(raw.cashFlowOverheads)
      ? raw.cashFlowOverheads
      : [];
    const expenses: DetailExpense[] =
      overheads.length > 0
        ? overheads.map((e, i) => ({
            id: e.id ?? i,
            note: e.note || `Pengeluaran ${i + 1}`,
            amount: n(e.amount),
          }))
        : n(raw.overhead) > 0
          ? [{ id: 0, note: "Pengeluaran Tambahan", amount: n(raw.overhead) }]
          : [];

    const items: DetailStockRow[] = (raw.cashFlowItems ?? []).map((i: any) => ({
      id: i.id,
      name: i.product?.name ?? "-",
      price: n(i.price ?? i.product?.price),
      stockIn: n(i.in),
      stockOut: n(i.out),
    }));

    return {
      id: raw.id,
      userName: raw.user?.name ?? item.userName,
      createdAt: raw.createdAt ?? item.createdAt,
      verified: n(raw.verified),
      note: raw.note,
      items,
      cash: 0, // derived in the sheet: penjualan - kanal
      channels,
      totalSales: 0, // derived in the sheet
      expenses,
      stockOverhead: n(raw.stockOverhead),
    };
  }, [q.data, item]);

  return { data, isLoading: q.isLoading, isError: q.isError };
}

/* ─── Row ───────────────────────────────────────────────────────────────── */
const VERIFIED_LABEL: Record<
  number,
  { text: string; color: string; bg: string }
> = {
  0: { text: "Approved", color: "#059669", bg: "#05966815" },
  1: { text: "Menunggu Approval", color: "#e09626", bg: "#e0962613" },
  2: { text: "Pending", color: "#dcbb26", bg: "#dcbb2611" },
};

const ReportRow = React.memo<{
  item: SalesReportItem;
  onPress: (item: SalesReportItem) => void;
}>(({ item, onPress }) => {
  const badge = VERIFIED_LABEL[item.verified] ?? VERIFIED_LABEL[0];
  const channels = [
    { label: "Tunai", value: item.cash },
    { label: "QRIS", value: item.qris },
    { label: "ShopeeFood", value: item.shopeeFood },
    { label: "GrabFood", value: item.grabFood },
    { label: "GoFood", value: item.goFood },
  ].filter((c) => c.value > 0);

  return (
    <TouchableOpacity
      style={s.row}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Detail laporan ${item.userName}`}
    >
      <View style={s.rowTopLine}>
        <View style={{ flex: 1 }}>
          <Text style={s.userName} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={s.metaText}>
            {dateTimeFormatter.format(new Date(item.createdAt))}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.totalText}>{rupiah.format(item.totalSales)}</Text>
          <View style={[s.badge, { backgroundColor: badge.bg }]}>
            <Text style={[s.badgeText, { color: badge.color }]}>
              {badge.text}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.channelWrap}>
        {channels.map((c) => (
          <View key={c.label} style={s.channelChip}>
            <Text style={s.channelLabel}>{c.label}</Text>
            <Text style={s.channelValue}>{rupiah.format(c.value)}</Text>
          </View>
        ))}
      </View>

      <View style={s.rowBottomLine}>
        <Text style={s.outText}>Keluar: {rupiah.format(item.out)}</Text>
        {!!item.note && (
          <Text style={s.noteText} numberOfLines={1}>
            {item.note}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );
});
ReportRow.displayName = "ReportRow";

/* ─── Screen ────────────────────────────────────────────────────────────── */

type PickerTarget = "from" | "to" | null;

export default function SalesReportScreen() {
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [userId, setUserId] = useState<string | "all">("all");
  const [sd, setSd] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d;
  });
  const [ed, setEd] = useState<Date>(today);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search.trim());

  const [picker, setPicker] = useState<PickerTarget>(null);
  const [tempDate, setTempDate] = useState<Date>(today);

  /** Card yang sedang dibuka detailnya */
  const [selected, setSelected] = useState<SalesReportItem | null>(null);

  const { data: users } = useSalesReportUsersQuery();

  const {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSalesReportQuery(userId, toYMD(sd), toYMD(ed), debouncedSearch);

  const items = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  /* ── Export Excel ── */

  const { mutate: exportExcel, isPending: exporting } =
    useSalesReportExcelMutation();

  const handleExport = useCallback(() => {
    const from = toYMD(sd);
    const to = toYMD(ed);
    exportExcel(
      { userId, sd: from, ed: to, q: debouncedSearch },
      {
        onSuccess: async (bytes) => {
          try {
            const file = new File(
              Paths.cache,
              `laporan-penjualan_${from}_${to}.xlsx`,
            );
            if (file.exists) file.delete();
            file.create();
            file.write(bytes);

            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(file.uri, {
                mimeType:
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                dialogTitle: "Laporan Penjualan",
                UTI: "org.openxmlformats.spreadsheetml.sheet",
              });
            } else {
              ToastError("Fitur berbagi tidak tersedia di perangkat ini.");
            }
          } catch (error) {
            console.error("EXPORT EXCEL ERROR:", error);
            ToastError("Gagal menyimpan file Excel.");
          }
        },
      },
    );
  }, [exportExcel, userId, sd, ed, debouncedSearch]);
  const totalCount = data?.pages[0]?.meta?.total ?? 0;
  const summary = data?.pages[0]?.meta?.summary;

  /**
   * Total per kanal online. Kalau API summary sudah mengirim
   * totalShopeeFood / totalGrabFood / totalGoFood, dipakai itu.
   * Kalau belum, dijumlahkan dari data yang sudah termuat.
   */
  const channelTotals = useMemo(() => {
    const sum = summary as unknown as Record<string, number | undefined>;
    const fallback = (key: "shopeeFood" | "grabFood" | "goFood") =>
      items.reduce((acc, i) => acc + (i[key] ?? 0), 0);

    return {
      shopeeFood: sum?.totalShopeeFood ?? fallback("shopeeFood"),
      grabFood: sum?.totalGrabFood ?? fallback("grabFood"),
      goFood: sum?.totalGoFood ?? fallback("goFood"),
    };
  }, [summary, items]);

  /* ── Detail ── */

  const {
    data: detail,
    isLoading: loadingDetail,
    isError: errorDetail,
  } = useSalesReportDetail(selected);

  const openDetail = useCallback((item: SalesReportItem) => {
    setSelected(item);
  }, []);
  const closeDetail = useCallback(() => setSelected(null), []);

  /* ── Date picker handlers ── */

  const applyDate = useCallback(
    (target: Exclude<PickerTarget, null>, date: Date) => {
      if (target === "from") {
        setSd(date);
        if (date > ed) setEd(date);
      } else {
        setEd(date);
        if (date < sd) setSd(date);
      }
    },
    [sd, ed],
  );

  const openPicker = (target: Exclude<PickerTarget, null>) => {
    setTempDate(target === "from" ? sd : ed);
    setPicker(target);
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      const target = picker;
      setPicker(null);
      if (event.type === "set" && date && target) applyDate(target, date);
      return;
    }
    // iOS: simpan sementara, terapkan saat tekan "Selesai"
    if (date) setTempDate(date);
  };

  const confirmIOS = () => {
    if (picker) applyDate(picker, tempDate);
    setPicker(null);
  };

  /* ── List ── */

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: SalesReportItem }) => (
      <ReportRow item={item} onPress={openDetail} />
    ),
    [openDetail],
  );

  const renderHeader = () => (
    <View style={s.summaryCard}>
      <Text style={s.summaryLabel}>Total Penjualan</Text>
      <Text style={s.summaryTotal}>
        {rupiah.format(summary?.totalSales ?? 0)}
      </Text>
      <View style={s.summaryGrid}>
        <SummaryCell label="Tunai" value={summary?.totalCash ?? 0} />
        <SummaryCell label="QRIS" value={summary?.totalQris ?? 0} />
        <SummaryCell label="Keluar" value={summary?.totalOut ?? 0} />
      </View>
      <View style={s.summaryGrid}>
        <SummaryCell label="ShopeeFood" value={channelTotals.shopeeFood} />
        <SummaryCell label="GrabFood" value={channelTotals.grabFood} />
        <SummaryCell label="GoFood" value={channelTotals.goFood} />
      </View>
      <View style={s.summaryGrid}>
        <SummaryCell label="Total Online" value={summary?.totalOnline ?? 0} />
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={s.footerLoader}>
        <ActivityIndicator color={BRAND} size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={s.empty}>
          <ActivityIndicator color={BRAND} />
          <Text style={s.emptyText}>Memuat laporan penjualan...</Text>
        </View>
      );
    }
    if (isError) {
      return (
        <View style={s.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>Laporan gagal dimuat.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.empty}>
        <Ionicons name="stats-chart-outline" size={48} color="#D1D5DB" />
        <Text style={s.emptyText}>
          Tidak ada penjualan pada rentang tanggal ini.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={BRAND} barStyle="light-content" />

      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ width: 36 }} />
        <Text style={s.headerTitle}>Laporan Penjualan</Text>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={handleExport}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel="Export laporan ke Excel"
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9CA3AF"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Cari cabang atau catatan..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date range */}
      <View style={s.dateRow}>
        <DateButton
          label="Dari"
          value={dateFormatter.format(sd)}
          onPress={() => openPicker("from")}
        />
        <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
        <DateButton
          label="Sampai"
          value={dateFormatter.format(ed)}
          onPress={() => openPicker("to")}
        />
      </View>

      {/* User filter */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          <UserChip
            label="Semua"
            active={userId === "all"}
            onPress={() => setUserId("all")}
          />
          {users?.map((u) => (
            <UserChip
              key={u.id}
              label={u.name}
              active={userId === u.id}
              onPress={() => setUserId(u.id)}
            />
          ))}
        </ScrollView>
      </View>

      <Text style={s.countText}>{totalCount} laporan</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? s.listEmptyContainer : { paddingBottom: 20 }
        }
        ListHeaderComponent={items.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading && !isFetchingNextPage}
            onRefresh={refetch}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      />

      {/* Android: dialog native */}
      {Platform.OS === "android" && picker && (
        <DateTimePicker
          value={picker === "from" ? sd : ed}
          mode="date"
          maximumDate={today}
          onChange={onPickerChange}
        />
      )}

      {/* iOS: bottom sheet */}
      {Platform.OS === "ios" && (
        <Modal
          visible={picker !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setPicker(null)}
        >
          <View style={s.modalBackdrop}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Text style={s.modalCancel}>Batal</Text>
                </TouchableOpacity>
                <Text style={s.modalTitle}>
                  {picker === "from" ? "Tanggal mulai" : "Tanggal akhir"}
                </Text>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={s.modalDone}>Selesai</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={today}
                onChange={onPickerChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Modal Detail (bottom sheet) */}
      <DetailSheet
        visible={selected !== null}
        item={selected}
        detail={detail}
        loading={loadingDetail}
        error={errorDetail}
        onClose={closeDetail}
      />
    </SafeAreaView>
  );
}

/* ─── Detail sheet ──────────────────────────────────────────────────────── */

function DetailSheet({
  visible,
  item,
  detail,
  loading,
  error,
  onClose,
}: {
  visible: boolean;
  item: SalesReportItem | null;
  detail?: SalesDetail;
  loading: boolean;
  error: boolean;
  onClose: () => void;
}) {
  const badge = VERIFIED_LABEL[item?.verified ?? 0] ?? VERIFIED_LABEL[0];

  const calc = useMemo(() => {
    if (!detail) return null;
    // Client's formula:
    //   penjualan = stok awal - stok sisa;  tunai = penjualan - kanal
    //   sisa cash = penjualan - kanal - pengeluaran  (stok sisa is NOT an expense)
    const totalAwal = detail.items.reduce(
      (acc, i) => acc + i.stockIn * i.price,
      0,
    );
    const totalSisa = detail.items.reduce(
      (acc, i) => acc + (i.stockIn - i.stockOut) * i.price,
      0,
    );
    const penjualan = totalAwal - totalSisa;
    const channelTotal = detail.channels.reduce((acc, c) => acc + c.amount, 0);
    const totalPengeluaran = detail.expenses.reduce(
      (acc, e) => acc + e.amount,
      0,
    );

    return {
      totalAwal,
      totalSisa,
      penjualan,
      channelTotal,
      cash: penjualan - channelTotal,
      totalPengeluaran,
      sisaCash: penjualan - channelTotal - totalPengeluaran,
    };
  }, [detail]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        {/* Tap outside the sheet closes it. Kept as a sibling (not a wrapper)
            so it doesn't steal touches from the ScrollView inside the sheet. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup detail"
        />
        <View style={[s.sheet, s.sheetTall]}>
          <View style={s.sheetHandle} />

          <View style={s.sheetHeader}>
            <View style={s.sheetIconWrap}>
              <Ionicons name="storefront-outline" size={22} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle} numberOfLines={2}>
                {item?.userName ?? "-"}
              </Text>
              {item ? (
                <Text style={s.metaText}>
                  {dateTimeFormatter.format(new Date(item.createdAt))}
                </Text>
              ) : null}
            </View>
            <View
              style={[s.badge, { backgroundColor: badge.bg, marginTop: 0 }]}
            >
              <Text style={[s.badgeText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
          </View>

          <View style={s.sheetDivider} />

          {loading ? (
            <View style={s.sheetLoading}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : error || !detail || !calc ? (
            <View style={s.sheetLoading}>
              <Text style={s.emptyText}>Gagal memuat detail.</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={s.sheetList}
            >
              {/* Stock Awal */}
              <Text style={s.detailSectionTitle}>Stock Awal</Text>
              {detail.items.map((i) => (
                <DetailRow key={i.id} label={i.name} value={i.stockIn} />
              ))}
              <DetailTotalRow
                label="Jumlah"
                value={rupiah.format(calc.totalAwal)}
              />

              <View style={s.detailDivider} />

              {/* Stock Sisa: kembali ke inventory, bukan pengeluaran */}
              <Text style={s.detailSectionTitle}>Stock Sisa</Text>
              {detail.items.map((i) => (
                <DetailRow
                  key={i.id}
                  label={i.name}
                  value={i.stockIn - i.stockOut}
                />
              ))}
              <DetailTotalRow
                label="Total Stok Sisa"
                value={rupiah.format(calc.totalSisa)}
              />

              <View style={s.detailDivider} />

              {/* Pengeluaran */}
              <Text style={s.detailSectionTitle}>Laporan Pengeluaran</Text>
              {detail.expenses.length === 0 ? (
                <DetailRow label="Pengeluaran tambahan" value="-" />
              ) : (
                detail.expenses.map((e) => (
                  <DetailRow
                    key={e.id}
                    label={e.note}
                    value={rupiah.format(e.amount)}
                  />
                ))
              )}
              <DetailTotalRow
                label="Jumlah Pengeluaran"
                value={rupiah.format(calc.totalPengeluaran)}
              />

              {/* Pendapatan per kanal */}
              {detail.channels.length > 0 ? (
                <>
                  <View style={s.detailDivider} />
                  <Text style={s.detailSectionTitle}>Pendapatan Kanal</Text>
                  {detail.channels.map((c) => (
                    <DetailRow
                      key={c.label}
                      label={c.label}
                      value={rupiah.format(c.amount)}
                    />
                  ))}
                  <DetailTotalRow
                    label="Total Kanal"
                    value={rupiah.format(calc.channelTotal)}
                  />
                </>
              ) : null}

              <View style={s.detailDivider} />

              {/* Pendapatan Cash (paling bawah) */}
              <Text style={s.detailSectionTitle}>Pendapatan Cash</Text>
              <DetailRow label="Tunai" value={rupiah.format(calc.cash)} />
              <DetailTotalRow
                label="Total Penjualan"
                value={rupiah.format(calc.penjualan)}
              />

              {detail.note ? (
                <DetailRow label="Catatan" value={detail.note} />
              ) : null}

              {/* Sisa Cash */}
              <View style={s.sisaCashBox}>
                <Text style={s.sisaCashLabel}>Sisa Cash</Text>
                <Text style={s.sisaCashValue}>
                  {rupiah.format(calc.sisaCash)}
                </Text>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            style={s.sheetCloseBtn}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={s.sheetCloseText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Small components ──────────────────────────────────────────────────── */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailRowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={s.detailRowValue} numberOfLines={1}>
        {value === null || value === undefined ? "-" : value}
      </Text>
    </View>
  );
}

function DetailTotalRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={[s.detailRow, s.detailRowTotal]}>
      <Text style={s.detailRowTotalLabel}>{label}</Text>
      <Text style={s.detailRowTotalValue}>{value}</Text>
    </View>
  );
}

function DateButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.dateBtn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
    >
      <Ionicons name="calendar-outline" size={16} color={BRAND} />
      <View>
        <Text style={s.dateLabel}>{label}</Text>
        <Text style={s.dateValue}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

function UserChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.summaryCell}>
      <Text style={s.summaryCellLabel}>{label}</Text>
      <Text style={s.summaryCellValue} numberOfLines={1} adjustsFontSizeToFit>
        {rupiah.format(value)}
      </Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateLabel: { fontSize: 11, color: "#9CA3AF" },
  dateValue: { fontSize: 13, color: "#111827", fontWeight: "600" },

  chips: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  countText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
  },

  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  summaryLabel: { fontSize: 12, color: "#6B7280" },
  summaryTotal: { fontSize: 24, fontWeight: "800", color: BRAND },
  summaryGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  summaryCell: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  summaryCellLabel: { fontSize: 11, color: "#9CA3AF" },
  summaryCellValue: { fontSize: 12, fontWeight: "700", color: "#111827" },

  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  userName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  metaText: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  totalText: { fontSize: 15, fontWeight: "700", color: "#059669" },
  badge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
  channelWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  channelChip: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  channelLabel: { fontSize: 11, color: "#9CA3AF" },
  channelValue: { fontSize: 11, color: "#374151", fontWeight: "600" },
  rowBottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  outText: { fontSize: 12, color: "#DC2626", fontWeight: "500" },
  noteText: { flex: 1, fontSize: 12, color: "#6B7280", textAlign: "right" },

  footerLoader: { paddingVertical: 16, alignItems: "center" },

  listEmptyContainer: { flexGrow: 1, justifyContent: "center" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND,
  },
  retryText: { color: BRAND, fontSize: 13, fontWeight: "600" },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  modalCancel: { fontSize: 14, color: "#6B7280" },
  modalDone: { fontSize: 14, color: BRAND, fontWeight: "700" },

  // DETAIL SHEET
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
  sheetIconWrap: {
    backgroundColor: BRAND_SOFT,
    borderRadius: 8,
    padding: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetDivider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 },
  sheetLoading: { paddingVertical: 48, alignItems: "center" },
  sheetList: { flexGrow: 0, flexShrink: 1 },
  sheetCloseBtn: {
    marginTop: 14,
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sheetCloseText: { color: "#fff", fontWeight: "800" },

  detailSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND,
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
});
