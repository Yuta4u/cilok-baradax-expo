import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PageLayout from "../../src/components/layout";
import { useGetAllKaryawanQuery } from "../../src/services/queries/stock-management";
import StockManagementCard from "../../src/components/card/stock-management.card";
import { useStockManagementStore } from "../../src/store/stock-management.store";
import AddStockCilokModal from "../../src/components/modal/add-stock-cilok.modal";

export default function StockManagement() {
  const { data, isPending } = useGetAllKaryawanQuery();

  const {
    addStockCilokModal,
    addStockCilokModalData,
    toggleAddStockCilokModal,
  } = useStockManagementStore();

  const loading = isPending;
  return (
    <PageLayout title="Stock Management" sub="Stock management">
      <View>
        <FlatList
          data={data || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <StockManagementCard
              user={item}
              onUpdateStock={() => console.log("lol")}
            />
          )}
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
      </View>
      {addStockCilokModal && (
        <AddStockCilokModal
          mode="add"
          onClose={() => toggleAddStockCilokModal(undefined)}
          user={addStockCilokModalData || ({} as User)}
          visible={addStockCilokModal}
        />
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
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
});
