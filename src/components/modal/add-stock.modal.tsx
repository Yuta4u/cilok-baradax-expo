import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useGetAllProductQuery } from "../../services/queries/product";
import { useStockManagementStore } from "../../store/stock-management.store";
import { ToastError, ToastSuccess } from "../../utils/toast";
import { useAddCashFlowMutation } from "../../services/queries/stock-management";
import { useQueryClient } from "@tanstack/react-query";

type Product = {
  id: string;
  name: string;
  price: number;
};

export const AddStockModal = () => {
  const {
    addStockId: id,
    addStockModal: flag,
    toggleAddStockModal: setFlag,
  } = useStockManagementStore();
  const queryClient = useQueryClient();
  const { data, isPending } = useGetAllProductQuery();
  const { mutate, isPending: loading } = useAddCashFlowMutation();

  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const handleQuantityChange = (id: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = () => {
    const cashFlowItems: Record<string, { qty: number; price: number }> = {};

    data?.forEach((product: Product) => {
      const qty = Number(quantities[product.id]);
      if (qty > 0)
        cashFlowItems[product.id] = {
          qty,
          price: product.price,
        };
    });

    const payload = { id, cashFlowItems };

    if (Object.keys(cashFlowItems).length === 0) {
      setFlag();
      setTimeout(() => ToastError("Please enter at least one product"), 50);
      return;
    } else {
      mutate(payload, {
        onSuccess: ({ message }: { message: string }) => {
          queryClient.invalidateQueries({ queryKey: ["cash-flow:all"] });
          setFlag();
          setTimeout(() => ToastSuccess(message), 50);
        },
      });
    }
  };

  return (
    <Modal transparent animationType="slide" visible={flag}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>Add Stock</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.productCell]}>Produk</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Qty</Text>
          </View>

          {/* Table Body */}
          {isPending ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            // <View style={styles.tableContainer}>
            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.tableRow}>
                  <Text
                    style={[styles.tableCell, styles.productCell]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={quantities[item.id] ?? ""}
                    onChangeText={(val) => handleQuantityChange(item.id, val)}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}
            />
            // </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={setFlag}>
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmText}>
                {loading ? "Menyimpan..." : "Konfirmasi"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: "90%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  loader: {
    marginTop: 24,
  },
  // tableContainer: {
  //   flex: 1, // ambil sisa ruang yang tersedia
  //   minHeight: 300, // minimal ada ruang untuk beberapa item
  // },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    paddingRight: 10,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
  },
  productCell: {
    flex: 2,
  },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: "#0F172A",
    textAlign: "center",
  },
  noteInput: {
    maxHeight: 80,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 8,
    marginTop: 12,
    fontSize: 13,
    color: "#0F172A",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  confirmText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
});
