import { useCallback, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useDashboardStore } from "../../store/dashboard.store";
import { useAuthStore } from "../../utils/authStore";
import {
  useAddReportMutation,
  useGetCashFlowByIdQuery,
} from "../../services/queries/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { ToastSuccess } from "../../utils/toast";
import { formatIDR, parseRupiah } from "../../utils/format";

export const AddReportModal = () => {
  const queryClient = useQueryClient();

  const { user } = useAuthStore();
  const { reportModal, toggleReportModal } = useDashboardStore();
  const { mutate } = useAddReportMutation();

  const { data, isPending, isRefetching } = useGetCashFlowByIdQuery(
    user?.id,
    reportModal,
  );

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [out, setOut] = useState("");

  const handleReset = useCallback(() => {
    setQuantities({});
    setOut("");
    setNote("");
  }, []);

  const handleQuantityChange = (id: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handlePengeluaranOnChange = (value: string) => {
    setOut(formatIDR(value));
  };

  const handleConfirm = useCallback(() => {
    const payload = {
      quantities,
      out: parseRupiah(out),
      note,
    };

    mutate(payload, {
      onSuccess: ({ message }) => {
        queryClient.invalidateQueries({
          queryKey: ["cash-flow:all"],
          exact: false,
          refetchType: "all",
        });
        queryClient.invalidateQueries({
          queryKey: ["cash-flow:byId"],
        });
        handleReset();
        ToastSuccess(message);
        toggleReportModal();
      },
    });
  }, [quantities, out, note]);

  const handleCancel = () => {
    queryClient.removeQueries({ queryKey: ["cash-flow:byId"] });
    queryClient.invalidateQueries({ queryKey: ["cash-flow:all"] });
    handleReset();
    toggleReportModal();
  };

  const loading = isPending || isRefetching;

  return (
    <Modal transparent animationType="slide" visible={reportModal}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Add Report</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Produk</Text>

            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderText,
                { marginRight: 20 },
              ]}
            >
              Stock
            </Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Qty</Text>
          </View>

          {/* Table Body */}
          {isPending ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : data?.data ? (
            <FlatList
              data={data?.data?.cashFlowItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.tableRow}>
                  <Text
                    style={[styles.tableCell, { flex: 3 }]}
                    numberOfLines={1}
                  >
                    {item.product.name}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {item.in}
                  </Text>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={quantities[item.id] ?? ""}
                    onChangeText={(val) => handleQuantityChange(item.id, val)}
                    placeholder="0"
                    editable={!loading}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}
            />
          ) : (
            <Text>Data not found</Text>
          )}

          <Text style={styles.title2}>Pengeluaran</Text>
          <TextInput
            style={[styles.noteInput, { marginBottom: 20 }]}
            value={out}
            onChangeText={handlePengeluaranOnChange}
            placeholder="..."
            keyboardType="numeric"
            placeholderTextColor="#94A3B8"
            multiline
            editable={!loading}
            textAlignVertical="top"
          />

          <Text style={styles.title2}>Note</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Note (opsional)"
            placeholderTextColor="#94A3B8"
            multiline
            editable={!loading}
            textAlignVertical="top"
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Konfirmasi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  title2: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
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
  confirmText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
});
