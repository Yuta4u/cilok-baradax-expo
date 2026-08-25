import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useProductMutation,
  useProductQuery,
  useUpdateStockMutation,
} from "../../src/services/queries/inventory";
import { useQueryClient } from "@tanstack/react-query";
import { ToastSuccess } from "../../src/utils/toast";
import { deFormatRupiah2, formatRupiah2 } from "../../src/utils/format";

const BRAND = "#B94A1C";
const PRODUCT_QUERY_KEY = ["inventory:product"];
const QUICK_QTY = [1, 5, 10, 25];

const FILTER_OPTIONS = ["Semua", "Aman", "Menipis"] as const;
type FilterType = (typeof FILTER_OPTIONS)[number];

// NOTE: `Product` is assumed to be a global type. If it isn't declared globally,
// import it from your types module instead of relying on ambient declaration.

/* ─── Debounce ──────────────────────────────────────────────────────────── */

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

/* ─── Status badge ──────────────────────────────────────────────────────── */

const StatusBadge = React.memo<{ status: boolean }>(({ status }) => (
  <View
    style={[badge.wrap, { backgroundColor: status ? "#ECFDF5" : "#FFF7ED" }]}
  >
    <Text style={[badge.text, { color: status ? "#059669" : "#EA580C" }]}>
      {status ? "Aman" : "Menipis"}
    </Text>
  </View>
));
StatusBadge.displayName = "StatusBadge";

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  text: { fontSize: 12, fontWeight: "600" },
});

/* ─── Row ───────────────────────────────────────────────────────────────── */

type RowProps = {
  item: Product;
  index: number;
  onAddStock: (item: Product) => void;
};

const ProductRow = React.memo<RowProps>(({ item, index, onAddStock }) => (
  <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}>
    <Text style={s.colProduk} numberOfLines={2}>
      {item.name}
    </Text>
    <Text style={s.colStok}>{item.stock}</Text>
    <Text style={s.colSatuan}>{item.uom}</Text>
    <View style={s.colStatus}>
      <StatusBadge status={item.status} />
    </View>
    <View style={s.colAksi}>
      <TouchableOpacity
        style={s.rowAddBtn}
        onPress={() => onAddStock(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Tambah stok ${item.name}`}
      >
        <Ionicons name="add" size={18} color={BRAND} />
      </TouchableOpacity>
    </View>
  </View>
));
ProductRow.displayName = "ProductRow";

/* ─── Modal Stok Masuk ──────────────────────────────────────────────────── */

type StockInModalProps = {
  product: Product | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (payload: { qty: number; note: string }) => void;
};

const StockInModal: React.FC<StockInModalProps> = ({
  product,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // Bersihkan form tiap kali produk berubah / modal dibuka.
  useEffect(() => {
    if (product) {
      setQty("");
      setNote("");
      setError("");
    }
  }, [product]);

  const parsedQty = Number(qty) || 0;
  const currentStock = Number(product?.stock ?? 0);

  const handleSave = () => {
    if (parsedQty <= 0) {
      setError("Isi jumlah stok masuk, minimal 1.");
      return;
    }
    setError("");
    onSubmit({ qty: parsedQty, note: note.trim() });
  };

  return (
    <Modal
      visible={!!product}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={m.overlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />

          <ScrollView
            style={m.sheetScroll}
            contentContainerStyle={m.sheet}
            keyboardShouldPersistTaps="handled"
          >
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>Stok Masuk</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Ringkasan produk */}
            <View style={m.productCard}>
              <Text style={m.productName} numberOfLines={2}>
                {product?.name}
              </Text>
              <Text style={m.productMeta}>
                Stok saat ini: {currentStock} {product?.uom}
              </Text>
            </View>

            <Text style={m.label}>
              Jumlah Masuk <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <View style={[m.qtyRow, !!error && m.inputError]}>
              <TouchableOpacity
                style={m.qtyStepBtn}
                onPress={() => setQty(String(Math.max(0, parsedQty - 1)))}
                disabled={parsedQty <= 0}
                accessibilityRole="button"
                accessibilityLabel="Kurangi jumlah"
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={parsedQty <= 0 ? "#D1D5DB" : BRAND}
                />
              </TouchableOpacity>

              <TextInput
                style={m.qtyInput}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={qty}
                onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ""))}
                selectTextOnFocus
              />

              <Text style={m.qtyUom}>{product?.uom}</Text>

              <TouchableOpacity
                style={m.qtyStepBtn}
                onPress={() => setQty(String(parsedQty + 1))}
                accessibilityRole="button"
                accessibilityLabel="Tambah jumlah"
              >
                <Ionicons name="add" size={20} color={BRAND} />
              </TouchableOpacity>
            </View>
            {!!error && <Text style={m.errorText}>{error}</Text>}

            {/* Tombol cepat */}
            <View style={m.quickRow}>
              {QUICK_QTY.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={m.quickChip}
                  onPress={() => setQty(String(parsedQty + n))}
                >
                  <Text style={m.quickChipText}>+{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={m.label}>Catatan</Text>
            <TextInput
              style={[m.input, m.noteInput]}
              placeholder="Contoh: Belanja dari supplier Pak Budi"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={140}
            />

            {/* Pratinjau hasil */}
            {parsedQty > 0 && (
              <View style={m.preview}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={18}
                  color="#059669"
                />
                <Text style={m.previewText}>
                  Stok menjadi {currentStock + parsedQty} {product?.uom}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[m.saveBtn, isPending && m.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isPending}
              accessibilityRole="button"
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={m.saveBtnText}>Simpan stock masuk</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ─── Screen ────────────────────────────────────────────────────────────── */

export default function DataStokScreen() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [type, setType] = useState<FilterType>("Semua");
  const [modalVisible, setModalVisible] = useState(false);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);

  const {
    data: product,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useProductQuery(type, debouncedSearch);

  const { mutate: addProduct, isPending } = useProductMutation();
  const { mutate: addStock, isPending: isStockPending } =
    useUpdateStockMutation();

  // Form state
  const [name, setName] = useState("");
  const [minimalStock, setMinimalStock] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items: Product[] = useMemo(() => product?.data ?? [], [product]);

  const resetForm = useCallback(() => {
    setName("");
    setMinimalStock("");
    setPrice("");
    setErrors({});
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    // Wait for the sheet to slide out before clearing, so fields don't flash empty.
    setTimeout(resetForm, 300);
  }, [resetForm]);

  const handleTambah = useCallback(() => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Isi nama produk.";
    if (!minimalStock.trim() || Number(minimalStock) < 0) {
      nextErrors.minimalStock = "Isi jumlah minimal stok, minimal 0.";
    }

    const parsedPrice = deFormatRupiah2(price);
    if (!price.trim() || Number(parsedPrice) <= 0) {
      nextErrors.price = "Isi harga produk.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    addProduct(
      {
        name: name.trim(),
        minimalStock: Number(minimalStock),
        price: parsedPrice,
      },
      {
        onSuccess: () => {
          closeModal();
          ToastSuccess("Produk berhasil ditambahkan");
          queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
        },
        onError: () => {
          setErrors({
            form: "Produk gagal disimpan. Periksa koneksi, lalu coba lagi.",
          });
        },
      },
    );
  }, [name, minimalStock, price, addProduct, closeModal, queryClient]);

  /* ─ Stok masuk ─ */

  const handleAddStock = useCallback((item: Product) => {
    setStockTarget(item);
  }, []);

  const handleSubmitStock = useCallback(
    ({ qty, note }: { qty: number; note: string }) => {
      if (!stockTarget) return;

      const payload = {
        id: stockTarget.id,
        quantity: qty,
        type: "inc" as "inc" | "dec",
        note,
      };

      addStock(payload, {
        onSuccess: () => {
          const label = `${qty} ${stockTarget.uom} ${stockTarget.name}`;
          setStockTarget(null);
          ToastSuccess(`Stok masuk ${label} tersimpan`);
          queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
        },
      });
    },
    [stockTarget, queryClient],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <ProductRow item={item} index={index} onAddStock={handleAddStock} />
    ),
    [handleAddStock],
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={s.empty}>
          <ActivityIndicator color={BRAND} />
          <Text style={s.emptyText}>Memuat produk...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={s.empty}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>Data stok gagal dimuat.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isFiltered = debouncedSearch.length > 0 || type !== "Semua";

    return (
      <View style={s.empty}>
        <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
        <Text style={s.emptyText}>
          {isFiltered
            ? "Tidak ada produk yang cocok dengan pencarian ini."
            : "Belum ada produk. Tambahkan produk pertama Anda."}
        </Text>
        {!isFiltered && (
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={s.retryText}>Tambah produk</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={BRAND} barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 36 }} />
        <Text style={s.headerTitle}>Data Stok</Text>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Tambah produk"
        >
          <Ionicons name="add" size={26} color="#fff" />
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
            placeholder="Cari produk..."
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

      {/* Filter chips */}
      <View style={s.chips}>
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, type === f && s.chipActive]}
            onPress={() => setType(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: type === f }}
          >
            <Text style={[s.chipText, type === f && s.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.countText}>{items.length} produk</Text>
      </View>

      {/* Table header */}
      <View style={s.tableHeader}>
        <Text style={[s.colProduk, s.th]}>Produk</Text>
        <Text style={[s.colStok, s.th]}>Stok</Text>
        <Text style={[s.colSatuan, s.th]}>Satuan</Text>
        <Text style={[s.colStatus, s.th, s.thStatus]}>Status</Text>
        <View style={s.colAksi} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? s.listEmptyContainer : { paddingBottom: 20 }
        }
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={refetch}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      />

      {/* Modal Stok Masuk */}
      <StockInModal
        product={stockTarget}
        isPending={false}
        onClose={() => setStockTarget(null)}
        onSubmit={handleSubmitStock}
      />

      {/* Modal Tambah Produk */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={m.overlay}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeModal}
            />
            <ScrollView
              style={m.sheetScroll}
              contentContainerStyle={m.sheet}
              keyboardShouldPersistTaps="handled"
            >
              <View style={m.sheetHeader}>
                <Text style={m.sheetTitle}>Tambah Produk</Text>
                <TouchableOpacity
                  onPress={closeModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <Text style={m.label}>
                Nama Produk <Text style={{ color: BRAND }}>*</Text>
              </Text>
              <TextInput
                style={[m.input, errors.name && m.inputError]}
                placeholder="Contoh: Cilok Original"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                maxLength={80}
              />
              {!!errors.name && <Text style={m.errorText}>{errors.name}</Text>}

              <Text style={m.label}>
                Jumlah Minimal Stok <Text style={{ color: BRAND }}>*</Text>
              </Text>
              <TextInput
                style={[m.input, errors.minimalStock && m.inputError]}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={minimalStock}
                onChangeText={(t) => setMinimalStock(t.replace(/[^0-9]/g, ""))}
              />
              {!!errors.minimalStock && (
                <Text style={m.errorText}>{errors.minimalStock}</Text>
              )}

              <Text style={m.label}>
                Harga <Text style={{ color: BRAND }}>*</Text>
              </Text>
              <TextInput
                style={[m.input, errors.price && m.inputError]}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={price}
                onChangeText={(t) => setPrice(formatRupiah2(t))}
              />
              {!!errors.price && (
                <Text style={m.errorText}>{errors.price}</Text>
              )}

              {!!errors.form && <Text style={m.errorText}>{errors.form}</Text>}

              <TouchableOpacity
                style={[m.saveBtn, isPending && m.saveBtnDisabled]}
                onPress={handleTambah}
                disabled={isPending}
                accessibilityRole="button"
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text style={m.saveBtnText}>Simpan produk</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
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
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  thStatus: { textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#FAFAFA" },
  colProduk: { flex: 2.5, fontSize: 14, color: "#111827", fontWeight: "500" },
  colStok: { flex: 1, fontSize: 14, color: "#374151", textAlign: "center" },
  colSatuan: { flex: 1, fontSize: 14, color: "#6B7280", textAlign: "center" },
  colStatus: { flex: 1.4, alignItems: "center", justifyContent: "center" },
  colAksi: { width: 36, alignItems: "flex-end" },
  rowAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3EC",
  },
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

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetScroll: {
    flexGrow: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheet: {
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FAFAFA",
  },
  noteInput: { minHeight: 64, textAlignVertical: "top" },
  inputError: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  errorText: { fontSize: 12, color: "#DC2626", marginTop: -8 },

  // Stok masuk
  productCard: {
    backgroundColor: "#FEF3EC",
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  productName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  productMeta: { fontSize: 13, color: "#6B7280" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 4,
  },
  qtyStepBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    padding: 0,
  },
  qtyUom: { fontSize: 13, color: "#6B7280", marginRight: 4 },
  quickRow: { flexDirection: "row", gap: 8, marginTop: -4 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  quickChipText: { fontSize: 13, fontWeight: "600", color: BRAND },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewText: { fontSize: 13, fontWeight: "600", color: "#059669" },
  saveBtn: {
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
    minHeight: 52,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
