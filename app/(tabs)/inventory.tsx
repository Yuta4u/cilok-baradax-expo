import React, { useState } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useProductMutation,
  useProductQuery,
} from "../../src/services/queries/inventory";
import { useQueryClient } from "@tanstack/react-query";
import { ToastSuccess } from "../../src/utils/toast";

const BRAND = "#B94A1C";
const FILTER_OPTIONS = ["Semua", "Aman", "Menipis"];

const StatusBadge: React.FC<{ status: boolean }> = ({ status }) => {
  return (
    <View
      style={[badge.wrap, { backgroundColor: status ? "#ECFDF5" : "#FFF7ED" }]}
    >
      <Text style={[badge.text, { color: status ? "#059669" : "#EA580C" }]}>
        {status ? "Aman" : "Menipis"}
      </Text>
    </View>
  );
};

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  text: { fontSize: 12, fontWeight: "600" },
});

export default function DataStokScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"Semua" | "Aman" | "Menipis">("Semua");
  const [modalVisible, setModalVisible] = useState(false);

  const { data: product } = useProductQuery(type, search);
  const { mutate: addProduct } = useProductMutation();

  // Form state
  const [name, setName] = useState("");
  const [minimalStock, setMinimalStock] = useState("");
  const [price, setPrice] = useState("");

  const resetForm = () => {
    setName("");
    setMinimalStock("");
    setPrice("");
  };

  const handleTambah = () => {
    if (!name.trim() || !minimalStock) {
      Alert.alert("Lengkapi Data", "Nama produk dan stok harus diisi.");
      return;
    }

    const payload = {
      name,
      minimalStock: Number(minimalStock),
      price: Number(price),
    };

    addProduct(payload, {
      onSuccess: () => {
        setModalVisible(false);
        setTimeout(() => {
          resetForm();
          ToastSuccess("Produk berhasil ditambahkan");
          queryClient.invalidateQueries({ queryKey: ["inventory:product"] });
        }, 300);
      },
    });
  };

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    return (
      <View style={[s.row, index % 2 === 0 ? s.rowEven : s.rowOdd]}>
        <Text style={s.colProduk} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={s.colStok}>{item.stock}</Text>
        <Text style={s.colSatuan}>{item.uom}</Text>
        <View style={s.colStatus}>
          <StatusBadge status={item.status} />
        </View>
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
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterIcon}>
          <Ionicons name="filter-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={s.chips}>
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, type === f && s.chipActive]}
            onPress={() => setType(f as never)}
          >
            <Text style={[s.chipText, type === f && s.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.countText}> produk</Text>
      </View>

      {/* Table Header */}
      <View style={s.tableHeader}>
        <Text style={[s.colProduk, s.th]}>Produk</Text>
        <Text style={[s.colStok, s.th]}>Stok</Text>
        <Text style={[s.colSatuan, s.th]}>Satuan</Text>
        <Text style={[s.colStatus, s.th]}>Status</Text>
      </View>

      <FlatList
        data={product?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyText}>Tidak ada produk ditemukan</Text>
          </View>
        }
      />

      {/* Modal Tambah Produk */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>Tambah Produk</Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={m.label}>
              Nama Produk <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <TextInput
              style={m.input}
              placeholder="Contoh: Cilok Original"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={m.label}>
              Jumlah Minimal Stock <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <TextInput
              style={m.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={minimalStock}
              onChangeText={setMinimalStock}
            />

            <Text style={m.label}>
              Price <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <TextInput
              style={m.input}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <TouchableOpacity style={m.saveBtn} onPress={handleTambah}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={m.saveBtnText}>Simpan Produk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  filterIcon: {
    width: 42,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
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
  colStatus: { flex: 1.2, alignItems: "flex-end", paddingLeft: 45 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  saveBtn: {
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
