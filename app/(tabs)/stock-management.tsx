import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useProductQuery } from "../../src/services/queries/inventory";
import {
  useCabangTodayQuery,
  useCashFlowDetailMutation,
  useCashFlowMutation,
  useGetCabangQuery,
  useUpdateCashFlowItemMutation,
} from "../../src/services/queries/stock-management";
import { ToastSuccess } from "../../src/utils/toast";
import { handleError } from "../../src/utils/error";
import { useQueryClient } from "@tanstack/react-query";

const ORANGE = "#B94A1A";
const ORANGE_SOFT = "#FFF3EE";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type RowId = string | number;

type Cabang = {
  id: string;
  name: string;
  deletedAt?: string | null;
};

type Product = {
  id: number;
  name: string;
  price: number | string;
};

/** Shape returned by useCashFlowDetailMutation. Fields are optional
 *  because the API response is read defensively. */
type CashFlowDetail = {
  id: number | string;
  productId?: number | string;
  qty?: number;
  in?: number;
  price?: number;
  name?: string;
  product?: { id?: number | string; name?: string; price?: number };
};

/** The row id used as the payload key. Falls back through the shapes the
 *  API might return so editing still works if `productId` isn't present. */
const getProductId = (item: CashFlowDetail): RowId =>
  item.productId ?? item.product?.id ?? item.id;

/** The API has used both `in` and `qty` for the stocked-in amount. Read
 *  both so the row shows a number either way. */
const getRowQty = (item: CashFlowDetail): number =>
  toNumber(item.in ?? item.qty);

const getRowPrice = (item: CashFlowDetail): number =>
  toNumber(item.price ?? item.product?.price);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Accepts numbers and the pre-formatted strings the API sometimes sends
 *  ("12.500", "Rp 12.500"), so a formatted price never becomes 0. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const cleaned = value.replace(/[^0-9,-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Intl is unreliable on older Hermes builds, so format manually. */
const formatIDR = (value: unknown): string => {
  const amount = Math.round(toNumber(value));
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${sign}${digits}`;
};

const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, "");

/* ------------------------------------------------------------------ */
/* Product row (memoized so typing in one row doesn't re-render all)   */
/* ------------------------------------------------------------------ */

type ProductRowProps = {
  id: RowId;
  name: string;
  /** Optional second line. Omit it to render the row without any price. */
  priceLabel?: string;
  qty: string;
  onChangeQty: (id: RowId, qty: string) => void;
};

const ProductRow = React.memo(function ProductRow({
  id,
  name,
  priceLabel,
  qty,
  onChangeQty,
}: ProductRowProps) {
  return (
    <View style={styles.productRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {name}
        </Text>
        {priceLabel ? (
          <Text style={styles.productPrice} numberOfLines={1}>
            {priceLabel}
          </Text>
        ) : null}
      </View>

      <TextInput
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="#9CA3AF"
        maxLength={6}
        style={[styles.input, toNumber(qty) > 0 && styles.inputFilled]}
        value={qty}
        onChangeText={(val) => onChangeQty(id, digitsOnly(val))}
        accessibilityLabel={`Qty ${name}`}
      />
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function StockManagement() {
  const {
    data: cabangTodayData,
    isLoading: loadingCabang,
    isRefetching,
    refetch,
  } = useGetCabangQuery();

  const { data: product, isLoading: loadingProduct } = useProductQuery(
    "Semua",
    "",
  );
  const queryClient = useQueryClient();
  const { mutate: addCashFlow } = useCashFlowMutation();
  const { mutate: fetchCashFlowDetail } = useCashFlowDetailMutation();
  const { mutate: updateCashFlowItem } = useUpdateCashFlowItemMutation();

  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [detailStockVisible, setDetailStockVisible] = useState(false);
  const [selectedCabang, setSelectedCabang] = useState<Cabang | null>(null);

  /** productId -> qty as a raw string (keeps the TextInput controlled) */
  const [stockInput, setStockInput] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [detail, setDetail] = useState<CashFlowDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  /** productId -> qty string, seeded from the API and edited in place */
  const [detailInput, setDetailInput] = useState<Record<string, string>>({});
  /** Untouched copy of the seed, so "dirty" survives a re-fetch. */
  const [detailBaseline, setDetailBaseline] = useState<Record<string, string>>(
    {},
  );
  const [submittingDetail, setSubmittingDetail] = useState(false);

  const cabangList: Cabang[] = cabangTodayData ?? [];
  const products: Product[] = product?.data ?? [];

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, search]);

  /** Only rows with qty > 0 count as input. Built from the full product
   *  list, not the filtered one, so searching never drops typed values. */
  const filledEntries = useMemo(
    () =>
      products
        .map((p) => ({ product: p, qty: toNumber(stockInput[String(p.id)]) }))
        .filter((row) => row.qty > 0),
    [products, stockInput],
  );

  const estimatedTotal = useMemo(
    () =>
      filledEntries.reduce(
        (sum, row) => sum + row.qty * toNumber(row.product.price),
        0,
      ),
    [filledEntries],
  );

  /** Enables the detail save button only when a qty actually changed. */
  const detailDirty = useMemo(
    () =>
      Object.keys(detailBaseline).some(
        (key) => toNumber(detailInput[key]) !== toNumber(detailBaseline[key]),
      ),
    [detailBaseline, detailInput],
  );

  /* ---------------------------------------------------------------- */
  /* Handlers                                                          */
  /* ---------------------------------------------------------------- */

  const handleChangeQty = useCallback((productId: RowId, qty: string) => {
    const key = String(productId);
    setStockInput((prev) => {
      if (!qty) {
        // Drop the key entirely so empty rows never reach the payload.
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: qty };
    });
  }, []);

  const closeStockModal = useCallback(() => {
    setStockModalVisible(false);
    setStockInput({});
    setSearch("");
    setSelectedCabang(null);
  }, []);

  const handleChangeDetailQty = useCallback((id: RowId, qty: string) => {
    // Empty stays empty here: a cleared field means 0, not "unchanged".
    setDetailInput((prev) => ({ ...prev, [String(id)]: qty }));
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailStockVisible(false);
    setDetail([]);
    setDetailInput({});
    setDetailBaseline({});
    setSelectedCabang(null);
  }, []);

  const openStockModal = useCallback((cabang: Cabang) => {
    setSelectedCabang(cabang);
    setStockInput({});
    setSearch("");
    setStockModalVisible(true);
  }, []);

  const openDetailStockModal = useCallback(
    (cabang: Cabang) => {
      setSelectedCabang(cabang);
      setDetail([]);
      setDetailInput({});
      setDetailBaseline({});

      fetchCashFlowDetail(cabang.id, {
        onSuccess: (data: CashFlowDetail[]) => {
          const items = data;
          const seed = items.reduce<Record<string, string>>((acc, item) => {
            acc[String(getProductId(item))] = String(getRowQty(item));
            return acc;
          }, {});

          setDetail(items);
          setDetailInput(seed);
          setDetailBaseline(seed);
          setDetailLoading(true);
          setDetailStockVisible(true);
        },
        onError: (err) => handleError(err as never),
        onSettled: () => setDetailLoading(false),
      });
    },
    [fetchCashFlowDetail],
  );

  const submitStock = () => {
    if (!selectedCabang || submitting) return;

    if (!filledEntries.length) {
      Alert.alert(
        "Belum ada qty",
        "Isi minimal satu produk sebelum menyimpan.",
      );
      return;
    }

    // Same object shape as before, but with clean numbers and no empty rows.
    // If the API expects an array instead, swap this for:
    //   filledEntries.map(({ product, qty }) => ({
    //     productId: product.id, qty, price: toNumber(product.price),
    //   }))
    const cashFlowItems = filledEntries.reduce<
      Record<number, { qty: number; price: number }>
    >((acc, { product: p, qty }) => {
      acc[p.id] = { qty, price: toNumber(p.price) };
      return acc;
    }, {});

    setSubmitting(true);

    addCashFlow(
      { id: selectedCabang.id as never, cashFlowItems },
      {
        onSuccess: ({ message }: { message: string }) => {
          queryClient.invalidateQueries({ queryKey: ["inventory:product"] });
          queryClient.invalidateQueries({
            queryKey: ["cash-flow:cabang:today"],
          });
          ToastSuccess(message);
          closeStockModal();
        },
        onError: (err) => {
          closeStockModal();
          // Keep the modal open so the user doesn't lose what they typed.
          handleError(err as never);
        },
        onSettled: () => setSubmitting(false),
      },
    );
  };

  const submitDetail = () => {
    if (!selectedCabang || submittingDetail || !detailDirty) return;

    const cashFlowItems = detail.reduce<Record<string, number>>((acc, item) => {
      const key = String(getProductId(item));
      acc[key] = toNumber(detailInput[key]);
      return acc;
    }, {});

    updateCashFlowItem(cashFlowItems, {
      onSuccess: ({ message }: { message: string }) => {
        queryClient.invalidateQueries({ queryKey: ["inventory:product"] });
        ToastSuccess(message);
        closeDetailModal();
      },
      onError: (err) => handleError(err as never),
      onSettled: () => setSubmittingDetail(false),
    });
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const renderCabang = useCallback(
    ({ item: cabang }: { item: Cabang }) => {
      const isActive = !cabang.deletedAt;

      return (
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="store-outline"
                size={22}
                color={ORANGE}
              />
            </View>

            <Text style={styles.cabangName} numberOfLines={1}>
              {cabang.name}
            </Text>

            <View
              style={[
                styles.badge,
                { backgroundColor: isActive ? "#DCFCE7" : "#FEE2E2" },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isActive ? "#16A34A" : "#DC2626" },
                ]}
              >
                {isActive ? "Aktif" : "Nonaktif"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.addStockBtn, !isActive && styles.btnDisabled]}
              disabled={!isActive}
              onPress={() => openStockModal(cabang)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isActive }}
              accessibilityLabel={`Tambah stock ${cabang.name}`}
            >
              <Text style={styles.addStockText}>+ Tambah Stock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openDetailStockModal(cabang)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Detail stock ${cabang.name}`}
            >
              <Text style={styles.detailText}>Detail Stock →</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [openStockModal, openDetailStockModal],
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={ORANGE} barStyle="light-content" />

      {/* HEADER */}
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Dashboard</Text>

          <TouchableOpacity
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* CABANG LIST */}
      {loadingCabang ? (
        <View style={styles.center}>
          <ActivityIndicator color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={cabangList}
          keyExtractor={(item, index) => `${item?.id ?? "cabang"}-${index}`}
          renderItem={renderCabang}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Semua Cabang</Text>
              <Text style={styles.sectionCount}>
                {cabangList.length} cabang
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="store-off-outline"
                size={28}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>Belum ada cabang</Text>
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

      {/* ---------------- ADD STOCK ---------------- */}
      <Modal
        visible={stockModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeStockModal}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalHeader}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>Tambah Stock</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedCabang?.name}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeStockModal}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                placeholder="Cari produk"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus pencarian"
                >
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingProduct ? (
              <View style={styles.center}>
                <ActivityIndicator color={ORANGE} />
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                keyExtractor={(item, index) =>
                  `${item?.id ?? "cabang"}-${index}`
                }
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item }) => {
                  const qty = stockInput[String(item.id)] ?? "";
                  const subtotal = toNumber(qty) * toNumber(item.price);

                  return (
                    <ProductRow
                      id={item.id}
                      name={item.name}
                      priceLabel={
                        formatIDR(item.price) +
                        (subtotal > 0 ? `  ·  ${formatIDR(subtotal)}` : "")
                      }
                      qty={qty}
                      onChangeQty={handleChangeQty}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>
                      Produk tidak ditemukan
                    </Text>
                    <Text style={styles.emptyText}>
                      Coba kata kunci yang lain.
                    </Text>
                  </View>
                }
              />
            )}

            {/* FOOTER */}
            <View style={styles.modalFooter}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {filledEntries.length} produk terisi
                </Text>
                <Text style={styles.summaryValue}>
                  {formatIDR(estimatedTotal)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!filledEntries.length || submitting) && styles.btnDisabled,
                ]}
                onPress={submitStock}
                disabled={!filledEntries.length || submitting}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !filledEntries.length || submitting,
                  busy: submitting,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Simpan Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ---------------- DETAIL STOCK ---------------- */}
      <Modal
        visible={detailStockVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeDetailModal}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalHeader}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>Detail Stock</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedCabang?.name}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeDetailModal}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={ORANGE} />
              </View>
            ) : (
              // detail x
              <FlatList
                data={detail}
                keyExtractor={(item, index) =>
                  `${String(getProductId(item))}-${index}`
                }
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item }) => {
                  const key = String(getProductId(item));
                  const qty = detailInput[key] ?? "";
                  const price = getRowPrice(item);
                  const subtotal = toNumber(qty) * price;

                  return (
                    <ProductRow
                      id={key}
                      name={item.product?.name ?? item.name ?? "-"}
                      priceLabel={
                        price > 0
                          ? formatIDR(price) +
                            (subtotal > 0 ? `  ·  ${formatIDR(subtotal)}` : "")
                          : undefined
                      }
                      qty={qty}
                      onChangeQty={handleChangeDetailQty}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      size={28}
                      color="#9CA3AF"
                    />
                    <Text style={styles.emptyTitle}>Belum ada cash flow</Text>
                    <Text style={styles.emptyText}>
                      Tambahkan stock terlebih dahulu lewat tombol Tambah Stock.
                    </Text>
                  </View>
                }
              />
            )}

            {detail.length ? (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!detailDirty || submittingDetail) && styles.btnDisabled,
                  ]}
                  onPress={submitDetail}
                  disabled={!detailDirty || submittingDetail}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !detailDirty || submittingDetail,
                    busy: submittingDetail,
                  }}
                >
                  {submittingDetail ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Simpan Perubahan</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
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
  container: { flex: 1, backgroundColor: "#F5F6FA" },
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
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

  scroll: { padding: 16, paddingBottom: 40, flexGrow: 1 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sectionCount: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  // CARD
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { backgroundColor: ORANGE_SOFT, padding: 8, borderRadius: 10 },
  cabangName: { flex: 1, fontWeight: "700", fontSize: 14, color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 14,
  },
  addStockBtn: {
    backgroundColor: ORANGE_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addStockText: { color: ORANGE, fontWeight: "700", fontSize: 12 },
  detailText: { color: ORANGE, fontWeight: "700", fontSize: 12 },
  btnDisabled: { opacity: 0.5 },

  // EMPTY
  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyTitle: { fontWeight: "700", color: "#374151" },
  emptyText: { color: "#6B7280", fontSize: 12, textAlign: "center" },

  // MODAL
  modalSafeArea: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  modalSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  modalListContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  searchInput: { flex: 1, color: "#111827", padding: 0 },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  productInfo: { flex: 1 },
  productName: { color: "#111827", fontWeight: "600" },
  productPrice: { color: "#6B7280", fontSize: 12, marginTop: 2 },

  input: {
    width: 72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 8,
    color: "#111827",
    textAlign: "center",
  },
  inputFilled: { borderColor: ORANGE, backgroundColor: ORANGE_SOFT },

  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: { color: "#6B7280", fontSize: 13 },
  summaryValue: { fontWeight: "800", color: "#111827", fontSize: 15 },

  saveBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  saveText: { color: "#fff", textAlign: "center", fontWeight: "800" },
});
