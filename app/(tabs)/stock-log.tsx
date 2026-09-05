// app/(tabs)/stock-log.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  StockHistoryItem,
  StockHistoryType,
} from "../../src/services/api/stock-log";
import { useStockHistoryQuery } from "../../src/services/queries/stock-log";

const BRAND = "#B94A1C";

const FILTER_OPTIONS: { label: string; value: StockHistoryType }[] = [
  { label: "Semua", value: "all" },
  { label: "Masuk", value: "in" },
  { label: "Keluar", value: "out" },
];

/* ─── Debounce ──────────────────────────────────────────────────────────── */

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── Formatter tanggal ─────────────────────────────────────────────────── */

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatLogDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

/* ─── Row ───────────────────────────────────────────────────────────────── */

const LogRow = React.memo<{ item: StockHistoryItem }>(({ item }) => {
  const isIn = item.type === "in";
  return (
    <View style={s.row}>
      <View
        style={[s.iconWrap, { backgroundColor: isIn ? "#ECFDF5" : "#FEF2F2" }]}
      >
        <Ionicons
          name={isIn ? "arrow-down" : "arrow-up"}
          size={18}
          color={isIn ? "#059669" : "#DC2626"}
        />
      </View>

      <View style={s.rowBody}>
        <View style={s.rowTopLine}>
          <Text style={s.productName} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={[s.qtyText, { color: isIn ? "#059669" : "#DC2626" }]}>
            {isIn ? "+" : "-"}
            {item.qty} {item.uom}
          </Text>
        </View>

        {!!item.note && (
          <Text style={s.noteText} numberOfLines={1}>
            {item.note}
          </Text>
        )}

        <Text style={s.metaText}>{formatLogDate(item.createdAt)}</Text>
      </View>
    </View>
  );
});
LogRow.displayName = "LogRow";

/* ─── Screen ────────────────────────────────────────────────────────────── */

export default function StockLogScreen() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [type, setType] = useState<StockHistoryType>("all");

  const {
    data,
    isLoading,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStockHistoryQuery(type, debouncedSearch);

  const items = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  const totalCount = data?.pages[0]?.meta.total ?? 0;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: StockHistoryItem }) => <LogRow item={item} />,
    [],
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
          <Text style={s.emptyText}>Memuat riwayat stok...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={s.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>Riwayat stok gagal dimuat.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.empty}>
        <Ionicons name="time-outline" size={48} color="#D1D5DB" />
        <Text style={s.emptyText}>
          {debouncedSearch.length > 0 || type !== "all"
            ? "Tidak ada riwayat yang cocok."
            : "Belum ada riwayat stok."}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={BRAND} barStyle="light-content" />

      <View style={s.header}>
        <View style={{ width: 36 }} />
        <Text style={s.headerTitle}>Riwayat Stok</Text>
        <View style={{ width: 36 }} />
      </View>

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
            placeholder="Cari produk / catatan..."
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

      <View style={s.chips}>
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[s.chip, type === f.value && s.chipActive]}
            onPress={() => setType(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: type === f.value }}
          >
            <Text style={[s.chipText, type === f.value && s.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.countText}>{totalCount} riwayat</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? s.listEmptyContainer : { paddingBottom: 20 }
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading && !isFetchingNextPage}
            onRefresh={refetch}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      />
    </SafeAreaView>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  header: {
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
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
  chips: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  countText: { marginLeft: "auto", fontSize: 12, color: "#9CA3AF" },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  qtyText: { fontSize: 14, fontWeight: "700" },
  noteText: { fontSize: 13, color: "#6B7280" },
  metaText: { fontSize: 12, color: "#9CA3AF" },

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
});
