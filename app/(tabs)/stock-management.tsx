import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCabangTodayQuery } from "../../src/services/queries/dashboard";
import { useProductQuery } from "../../src/services/queries/inventory";
import {
  useCashFlowDetailMutation,
  useCashFlowMutation,
} from "../../src/services/queries/stock-management";
import { ToastSuccess } from "../../src/utils/toast";
import { handleError } from "../../src/utils/error";

const ORANGE = "#B94A1A";

export default function StockManagement() {
  const { data: cabangTodayData } = useCabangTodayQuery();
  const { data: product } = useProductQuery("Semua", "");
  const { mutate: addCashFlow } = useCashFlowMutation();
  const { mutate: cabangTodayDetailData } = useCashFlowDetailMutation();

  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [detailStockVisible, setDetailStockVisible] = useState(false);
  const [selectedCabang, setSelectedCabang] = useState<any>(null);
  const [stockInput, setStockInput] = useState<
    Record<number, { qty: string; price: string }>
  >({});
  const [stockInputDetail, setStockInputDetail] = useState<any>([]);

  const openStockModal = (cabang: any) => {
    setSelectedCabang(cabang);
    setStockInput({});
    setStockModalVisible(true);
  };

  const openDetailStockModal = (cabang: any) => {
    setSelectedCabang(cabang);
    setDetailStockVisible(true);
    cabangTodayDetailData(cabang.id, {
      onSuccess: ({ data }) => {
        setStockInputDetail(data);
      },
    });
  };

  const submitStock = () => {
    const payload = {
      id: selectedCabang.id,
      cashFlowItems: stockInput,
    };

    addCashFlow(payload, {
      onSuccess: ({ message }) => {
        ToastSuccess(message);
        setStockModalVisible(false);
        setStockInput({});
        setSelectedCabang(null);
      },
      onError: (err) => {
        setStockModalVisible(false);
        setStockInput({});
        setSelectedCabang(null);
        handleError(err as never);
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <StatusBar backgroundColor={ORANGE} barStyle="light-content" />
        <TouchableOpacity>
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Dashboard</Text>

        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ALL CABANG */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Cabang</Text>
        </View>

        {cabangTodayData?.data?.map((cabang: any) => (
          <View key={cabang.id} style={styles.card}>
            {/* TOP */}
            <View style={styles.topRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={22}
                  color={ORANGE}
                />
              </View>

              <Text style={styles.cabangName} numberOfLines={1}>
                {cabang?.name}
              </Text>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: !cabang.deletedAt ? "#DCFCE7" : "#FEE2E2",
                  },
                ]}
              >
                <Text
                  style={{
                    color: !cabang.deletedAt ? "#16A34A" : "#DC2626",
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {cabang.deletedAt ? "Inactive" : "Active"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ACTION */}
            <View style={styles.actionRow}>
              {/* ADD STOCK */}
              <TouchableOpacity
                style={styles.addStockBtn}
                onPress={() => openStockModal(cabang)}
              >
                <Text style={styles.addStockText}>+ Add Stock</Text>
              </TouchableOpacity>

              {/* DETAIL STOCK */}
              <TouchableOpacity onPress={() => openDetailStockModal(cabang)}>
                <Text style={styles.detailText}>Detail Stock →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={stockModalVisible} animationType="slide">
        <View style={styles.modal}>
          {/* HEADER MODAL */}
          <Text style={styles.modalTitle}>
            Add Stock - {selectedCabang?.name}
          </Text>

          {/* PRODUCT LIST */}
          <FlatList
            data={product?.data || []}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.productRow}>
                <Text style={styles.productName}>{item.name}</Text>

                <TextInput
                  keyboardType="numeric"
                  placeholder="Qty"
                  style={styles.input}
                  value={stockInput[item.id]?.qty || ""}
                  onChangeText={(val) =>
                    setStockInput((prev) => {
                      return {
                        ...prev,
                        [item.id]: { qty: val, price: item.price },
                      };
                    })
                  }
                />
              </View>
            )}
          />

          {/* SAVE */}
          <TouchableOpacity style={styles.saveBtn} onPress={submitStock}>
            <Text style={styles.saveText}>Simpan Stock</Text>
          </TouchableOpacity>

          {/* CLOSE */}
          <TouchableOpacity
            onPress={() => setStockModalVisible(false)}
            style={{ marginTop: 12 }}
          >
            <Text style={styles.closeText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={detailStockVisible} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>
            Detail Stock - {selectedCabang?.name}
          </Text>

          {!stockInputDetail?.length ? (
            <Text>Cash flow is empty, please input stock first.</Text>
          ) : null}

          {/* PRODUCT LIST */}
          {stockInputDetail?.length ? (
            <FlatList
              data={product?.data || []}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.productRow}>
                  <Text style={styles.productName}>{item.name}</Text>

                  <TextInput
                    keyboardType="numeric"
                    placeholder="Qty"
                    style={styles.input}
                    value={stockInput[item.id]?.qty || ""}
                    onChangeText={(val) =>
                      setStockInput((prev) => {
                        return {
                          ...prev,
                          [item.id]: { qty: val, price: item.price },
                        };
                      })
                    }
                  />
                </View>
              )}
            />
          ) : null}

          {/* SAVE */}
          {stockInputDetail?.length ? (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={submitStock}
              disabled={!stockInputDetail.length}
            >
              <Text style={styles.saveText}>Simpan Stock</Text>
            </TouchableOpacity>
          ) : null}

          {/* CLOSE */}
          <TouchableOpacity
            onPress={() => {
              setStockInputDetail([]);
              setDetailStockVisible(false);
            }}
            style={{ marginTop: 12 }}
          >
            <Text style={styles.closeText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },

  header: {
    backgroundColor: ORANGE,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 30 : 50,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

  scroll: { padding: 16, paddingBottom: 40 },

  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },

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

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconBox: {
    backgroundColor: "#FFF3EE",
    padding: 8,
    borderRadius: 10,
  },

  cabangName: {
    flex: 1,
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 14,
  },

  addStockBtn: {
    backgroundColor: "#FFF3EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  addStockText: {
    color: ORANGE,
    fontWeight: "700",
    fontSize: 12,
  },

  detailText: {
    color: ORANGE,
    fontWeight: "700",
    fontSize: 12,
  },

  // MODAL
  modal: {
    flex: 1,
    padding: 16,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    backgroundColor: "#fff",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
    color: "#111827",
  },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 6,
  },

  productName: {
    flex: 1,
    color: "#111827",
  },

  input: {
    width: 70,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 6,
    textAlign: "center",
  },

  saveBtn: {
    backgroundColor: ORANGE,
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },

  saveText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
  },

  closeText: {
    textAlign: "center",
    color: "#6B7280",
    fontWeight: "600",
  },
});
