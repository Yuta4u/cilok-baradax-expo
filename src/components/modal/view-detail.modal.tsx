import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import { useDashboardStore } from "../../store/dashboard.store";
import { useAuthStore } from "../../utils/authStore";
import {
  useConfirmReportMutation,
  useViewCashFlowQuery,
} from "../../services/queries/dashboard";
import { useQueryClient } from "@tanstack/react-query";

export const ViewDetailModal = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { viewDetailModal, toggleViewDetailModal } = useDashboardStore();

  const { mutate: confirm, isPending: confirmPending } =
    useConfirmReportMutation();

  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const { data, isPending, isRefetching } = useViewCashFlowQuery(
    id,
    viewDetailModal,
  );

  const handleQuantityChange = (id: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = useCallback(() => {
    const payload = {
      id: data?.data?.id,
      quantities,
    };
    confirm(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:all"] });
        toggleViewDetailModal();
      },
    });
  }, [quantities]);

  const handleCancel = () => {
    queryClient.removeQueries({ queryKey: ["cash-flow:detail"] });
    toggleViewDetailModal();
  };

  useEffect(() => {
    if (data?.data?.cashFlowItems) {
      const initialQuantities: Record<string, string> = {};
      data.data.cashFlowItems.forEach((item: any) => {
        initialQuantities[item.id] = item.out.toString();
      });
      setQuantities(initialQuantities);
    }
  }, [data]);

  const loading = isPending || isRefetching;
  const disabled = !data?.data?.verified;
  const confirmed = data?.data?.verified === 2;

  return (
    <Modal transparent animationType="slide" visible={viewDetailModal}>
      <TouchableWithoutFeedback onPress={toggleViewDetailModal}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={[styles.title, { marginBottom: 12 }]}>
              View Detail
            </Text>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Produk</Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { textAlign: "center", marginLeft: 35 },
                ]}
              >
                In
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  { marginRight: 5 },
                ]}
              >
                Out
              </Text>
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
                      style={[styles.tableCell, { textAlign: "center" }]}
                      numberOfLines={1}
                    >
                      {item.in}
                    </Text>
                    {confirmed ? (
                      <Text style={styles.confirmedText} numberOfLines={1}>
                        {item.in}
                      </Text>
                    ) : (
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        value={quantities[item.id] ?? ""}
                        onChangeText={(val) =>
                          handleQuantityChange(item.id, val)
                        }
                        placeholder="0"
                        editable={!loading}
                        placeholderTextColor="#94A3B8"
                      />
                    )}
                  </View>
                )}
              />
            ) : (
              <Text>Data not found</Text>
            )}

            <View
              style={[styles.tableRow, { justifyContent: "space-between" }]}
            >
              <Text>Pemasukan</Text>
              <Text>{data?.data?.in}</Text>
            </View>
            <View
              style={[styles.tableRow, { justifyContent: "space-between" }]}
            >
              <Text>Pengeluaran</Text>
              <Text>{data?.data?.out}</Text>
            </View>

            <Text>Note</Text>
            <Text style={{ fontSize: 10 }}>{data?.data?.note}</Text>

            {/* Actions */}
            {disabled && (
              <Text
                style={{ marginTop: 12, fontStyle: "italic", color: "red" }}
              >
                Belom melakukan laporan
              </Text>
            )}
            {confirmed ? (
              <View>
                <Text
                  style={{ marginTop: 12, fontStyle: "italic", color: "green" }}
                >
                  Sudah melakukan laporan
                </Text>
              </View>
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { opacity: disabled ? 0.7 : 1 }]}
                  onPress={handleConfirm}
                  disabled={disabled}
                >
                  <Text style={styles.confirmText}>Konfirmasi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
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
  confirmedText: {
    flex: 1,
    // borderColor: "#E2E8F0",
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
    backgroundColor: "#2bd873",
    alignItems: "center",
  },
  confirmText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
});
