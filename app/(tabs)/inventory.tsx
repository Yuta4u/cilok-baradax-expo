import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import PageLayout from "../../src/components/layout";
import InventoryCard from "../../src/components/card/inventory.card";
import { useInventoryStore } from "../../src/store/inventory.store";
import {
  useGetAllIngredientQuery,
  useGetAllProducttQuery,
} from "../../src/services/queries/inventory";
import {
  AddIngredientModal,
  AddIngredientModalBtn,
} from "../../src/components/modal/add-ingredient.modal";
import { AddStockModal } from "../../src/components/modal/add-stock.modal";
import { SubtractStockModal } from "../../src/components/modal/subtract-stock.modal";
import {
  AddProductModal,
  AddProductModalBtn,
} from "../../src/components/modal/add-product.modal";
import debounce from "lodash/debounce";

const FILTERS = [
  { key: "ingredient", label: "Ingredient" },
  { key: "product", label: "Product" },
];

export default function InventoryScreen({ navigation }: any) {
  const [filter, setFilter] = useState("ingredient");
  const [data, setData] = useState<Ingredient[] | []>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const handleSearch = useMemo(
    () => debounce((text: string) => setDebouncedSearch(text), 300),
    [],
  );

  const onChangeText = (text: string) => {
    setSearch(text);
    handleSearch(text);
  };

  const {
    addIngredientModal,
    addProductModal,
    addStockModal,
    subtractStockModal,
    toggleAddIngredientModal,
    toggleAddProductModal,
    toggleAddStockModal,
    toggleSubtractStockModal,
  } = useInventoryStore();
  const {
    data: ingredients,
    isPending: loadingIngredient,
    refetch: refetchIngredient,
  } = useGetAllIngredientQuery(debouncedSearch);
  const {
    data: products,
    isPending: loadingProduct,
    refetch: refetchProduct,
  } = useGetAllProducttQuery(debouncedSearch);

  useEffect(() => {
    if (filter === "ingredient") refetchIngredient();
    if (filter === "product") refetchProduct();
  }, [filter, debouncedSearch]);

  useEffect(() => {
    if (filter === "ingredient") setData(ingredients || []);
    if (filter === "product") setData(products || []);
  }, [filter, ingredients, products]);

  // ✅ Tambahkan ini untuk mencegah memory leak
  useEffect(() => {
    return () => handleSearch.cancel();
  }, [handleSearch]);

  const loading = loadingIngredient || loadingProduct;

  return (
    <PageLayout title="Inventory" sub="Supplay Chain Management">
      <View
        style={{
          width: "auto",
          margin: 14,
          marginBottom: 0,
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <AddIngredientModalBtn />
        <AddProductModalBtn />
      </View>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari item inventaris..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={onChangeText}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterBtn,
              filter === f.key && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Item list */}
      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <InventoryCard item={item} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Tidak ada item ditemukan</Text>
            </View>
          )
        }
      />

      {/* FAB tambah item */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("TambahItem")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {addIngredientModal && (
        <AddIngredientModal
          visible={addIngredientModal}
          onClose={toggleAddIngredientModal}
        />
      )}
      {addProductModal && (
        <AddProductModal
          visible={addProductModal}
          onClose={toggleAddProductModal}
        />
      )}
      {addStockModal && (
        <AddStockModal visible={addStockModal} onClose={toggleAddStockModal} />
      )}
      {subtractStockModal && (
        <SubtractStockModal
          visible={subtractStockModal}
          onClose={toggleSubtractStockModal}
        />
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  headerSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2,
  },
  headerDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  riwayatBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 24,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  riwayatBtnText: { fontSize: 20 },
  alertBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "#EF4444",
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  alertText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3E9DC",
  },
  filterBtnActive: {
    backgroundColor: "#D96F32",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    backgroundColor: "#6C3DE8",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#6C3DE8",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
});
