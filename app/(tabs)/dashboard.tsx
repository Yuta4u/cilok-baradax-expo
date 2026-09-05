import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import {
  useApprovalCashFlowMutation,
  useCabangHistoryQuery,
  useCabangTodayQuery,
  useDashboardQuery,
  useSubmitCashFlowMutation,
} from "../../src/services/queries/dashboard";
import { useAuthStore } from "../../src/utils/authStore";
import { enumeratePermission } from "../../src/utils/permissions";
import { ToastError, ToastSuccess } from "../../src/utils/toast";
import { handleError } from "../../src/utils/error";
import { useQueryClient } from "@tanstack/react-query";
import { on } from "node:cluster";

const ORANGE = "#B94A1A";
const ORANGE_SOFT = "#FFF3EE";
const GREEN = "#059669";

type RowId = string | number;

type Cabang = {
  id: number | string;
  name?: string;
  verified?: number;
  totalOmset?: number | string;
  totalTransaksi?: number | string;
};

type CashFlowDetail = {
  id: number | string;
  productId?: number | string;
  qty?: number;
  in?: number;
  price?: number;
  name?: string;
  product?: { id?: number | string; name?: string; price?: number };
};

type Props = {
  navigation?: { navigate: (route: string, params?: object) => void };
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(/[^0-9,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getProductId = (item: CashFlowDetail): RowId =>
  item.productId ?? item.product?.id ?? item.id;

const getRowQty = (item: ICashFlowItem): number =>
  toNumber(item.out ?? item.in);

const getRowPrice = (item: CashFlowDetail): number =>
  toNumber(item.price ?? item.product?.price);

const formatRupiah = (value: unknown): string => {
  const amount = Math.round(toNumber(value));
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${sign}${digits}`;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCount = (value: unknown): string =>
  Math.round(toNumber(value)).toString();

const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, "");

type StockRowProps = {
  id: RowId;
  name: string;
  priceLabel?: string;
  qty: string;
  editable: boolean;
  onChangeQty: (id: RowId, qty: string) => void;
};

const StockRow = React.memo(function StockRow({
  id,
  name,
  priceLabel,
  qty,
  editable,
  onChangeQty,
}: StockRowProps) {
  return (
    <View style={styles.stockRow} key={`${id}-${name}`}>
      <View style={styles.flex}>
        <Text style={styles.stockName} numberOfLines={2}>
          {name}
        </Text>
        {priceLabel ? (
          <Text style={styles.stockPrice} numberOfLines={1}>
            {priceLabel}
          </Text>
        ) : null}
      </View>

      {editable ? (
        <TextInput
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          maxLength={6}
          style={[styles.qtyInput, toNumber(qty) > 0 && styles.qtyInputFilled]}
          value={qty}
          onChangeText={(val) => onChangeQty(id, digitsOnly(val))}
          accessibilityLabel={`Qty ${name}`}
        />
      ) : (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{toNumber(qty)}</Text>
        </View>
      )}
    </View>
  );
});

type CashFlowCardProps = {
  cashFlow: ICashFlow;
  isAdmin: boolean;
  onDetail: (cashFlow: ICashFlow) => void;
  onTransaksi: (cashFlow: ICashFlow) => void;
};

const CashFlowCard = React.memo(function CabangCard({
  cashFlow,
  onDetail,
  onTransaksi,
}: CashFlowCardProps) {
  const isVerified = cashFlow.verified === 0;

  const omset = cashFlow.cashFlowItems.reduce((acc, item) => {
    return acc + item.out! * item.price;
  }, 0);

  const omsetTodayObj = {
    2: "Submit First",
    1: "Approval",
    0: formatRupiah(omset),
  };

  return (
    <View style={styles.cabangCard}>
      <View style={styles.cabangTop}>
        <View style={styles.cabangIconWrap}>
          <MaterialCommunityIcons
            name="store-outline"
            size={22}
            color={ORANGE}
          />
        </View>

        <Text style={styles.cabangNama} numberOfLines={1}>
          {cashFlow?.user?.name || "-"}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: !isVerified ? "#FEE2E2" : "#D1FAE5" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: !isVerified ? "#DC2626" : GREEN },
            ]}
          >
            {!isVerified ? "Belum diverifikasi" : "Aktif"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats row: omset + transaksi */}
      <View style={styles.cabangStats}>
        <View style={styles.cabangStatItem}>
          <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
          </View>
          <View style={styles.cabangStatText}>
            <Text style={styles.cabangStatLabel}>Omset Hari Ini</Text>
            <Text
              style={[styles.cabangStatValue, { color: "#10B981" }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {omsetTodayObj[cashFlow.verified]}
            </Text>
          </View>
        </View>

        <View style={styles.cabangStatDivider} />

        <View style={styles.cabangStatItem}>
          <View style={[styles.statIconWrap, { backgroundColor: "#F5F3FF" }]}>
            <Ionicons name="receipt-outline" size={16} color="#8B5CF6" />
          </View>
          <View style={styles.cabangStatText}>
            <Text style={styles.cabangStatLabel}>Tanggal</Text>
            <Text
              style={[styles.cabangStatValue, { color: "#8B5CF6" }]}
              numberOfLines={1}
            >
              {formatDate(cashFlow.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer actions */}
      <View style={styles.cabangFooter}>
        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnGhost]}
          onPress={() => onDetail(cashFlow)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Detail cabang ${""}`}
        >
          <Ionicons name="newspaper-outline" size={15} color={ORANGE} />
          <Text style={styles.cardBtnGhostText}>Detail</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardBtn, styles.cardBtnSolid]}
          onPress={() => onTransaksi(cashFlow)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Transaksi hari ini ${""}`}
        >
          <Ionicons name="receipt-outline" size={15} color="#fff" />
          <Text style={styles.cardBtnSolidText}>Transaksi Hari Ini</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function DashboardScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const role = enumeratePermission(user?.permission ?? 1);
  const isCabang = role.includes("CABANG");
  const isAdmin = role.includes("ADMIN") || role.includes("SUPER_USER");

  const { mutate: submitCashFlow } = useSubmitCashFlowMutation();

  const {
    data: cabangData,
    isLoading: loadingCabang,
    isRefetching,
    refetch,
  } = useCabangHistoryQuery(isCabang);
  const { data: dashboardData, isLoading: loadingDashboard } =
    useDashboardQuery(isCabang);

  const { data: cabangTodayData, isLoading: loadingCabangToday } =
    useCabangTodayQuery(isAdmin);
  const { mutate: approvalCashFlow } = useApprovalCashFlowMutation();

  const [selectedCabang, setSelectedCabang] = useState<ICashFlow | null>(null);

  const openDetail = useCallback((cabang: ICashFlow) => {
    setSelectedCabang(cabang);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedCabang(null);
  }, []);

  const [trxItems, setTrxItems] = useState<ICashFlowItem[]>([]);
  const [trxLoading, setTrxLoading] = useState(false);
  /** productId -> qty string, seeded from the API and edited in place */
  const [trxInput, setTrxInput] = useState<Record<string, string>>({});
  /** Untouched copy of the seed, so "dirty" survives a re-fetch. */
  const [trxBaseline, setTrxBaseline] = useState<Record<string, string>>({});
  const [savingTrx, setSavingTrx] = useState(false);
  const [approving, setApproving] = useState(false);

  const [transaksiCashFlow, setTransaksiCashFlow] = useState<ICashFlow | null>(
    null,
  );

  const openTransaksi = useCallback((cashFlow: ICashFlow) => {
    const seed = cashFlow.cashFlowItems.reduce<Record<string, string>>(
      (acc, item) => {
        acc[item.id] = String(getRowQty(item));
        return acc;
      },
      {},
    );

    setTrxItems(cashFlow.cashFlowItems);
    setTrxInput(seed);
    setTrxBaseline(seed);
    setTransaksiCashFlow(cashFlow);
  }, []);

  const closeTransaksi = useCallback(() => {
    setTrxItems([]);
    setTrxInput({});
    setTrxBaseline({});
    setTransaksiCashFlow(null);
  }, []);

  const submitTrx = () => {
    if (!transaksiCashFlow) {
      ToastError("Cash flow not found, please reopen.");
    }

    const payload = {
      id: transaksiCashFlow?.id as never,
      cashFlowItems: buildPayload(),
    };

    submitCashFlow(payload, {
      onSuccess: ({ message }: { message: string }) => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:history"] });
        closeTransaksi();
        ToastSuccess(message);
      },
      onError: (err) => handleError(err as never),
      onSettled: () => setSavingTrx(false),
    });
  };

  const handleChangeTrxQty = useCallback((id: RowId, qty: string) => {
    setTrxInput((prev) => ({ ...prev, [String(id)]: qty }));
  }, []);

  const buildPayload = () =>
    trxItems.reduce<Record<string, { qty: number; price: number }>>(
      (acc, item) => {
        const key = item.id;
        acc[key] = {
          qty: toNumber(trxInput[key]),
          price: getRowPrice(item),
        };
        return acc;
      },
      {},
    );

  const confirmApprove = () => {
    const payload = {
      id: transaksiCashFlow?.id as never,
      cashFlowItems: buildPayload(),
    };

    approvalCashFlow(payload, {
      onSuccess: ({ message }: { message: string }) => {
        queryClient.invalidateQueries({ queryKey: ["cash-flow:history"] });
        queryClient.invalidateQueries({ queryKey: ["cash-flow:cabang:today"] });
        queryClient.invalidateQueries({ queryKey: ["cash-flow:cabang:today"] });

        closeTransaksi();
        ToastSuccess(message);
      },
    });
  };

  /* -------------------- Navigation -------------------- */

  /**
   * "Lihat Semua" still navigates to a full list screen. Under expo-router a
   * screen never receives a `navigation` prop, so this is a no-op there —
   * swap it for `useRouter()` + `router.push("/cabang")` if that's the setup.
   */
  const openCabangList = useCallback(() => {
    navigation?.navigate("Cabang");
  }, [navigation]);

  const renderCashFlow = useCallback(
    ({ item }: { item: ICashFlow }) => (
      <CashFlowCard
        cashFlow={item}
        isAdmin={isAdmin}
        onDetail={openDetail}
        onTransaksi={openTransaksi}
      />
    ),
    [openDetail, openTransaksi],
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={ORANGE} barStyle="light-content" />

      {/* ── Fixed Top Section ── */}
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
      </SafeAreaView>

      <View style={styles.fixedContent}>
        {/* Greeting Card */}
        <View style={styles.greetCard}>
          <View style={styles.shopIcon}>
            <MaterialCommunityIcons name="store" size={32} color={ORANGE} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.greetSub}>Selamat datang,</Text>
            <Text style={styles.greetName} numberOfLines={1}>
              {user?.name ?? "-"}
            </Text>
          </View>
        </View>

        {isCabang && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
              <Text style={styles.statLabel}>Omset Hari Ini</Text>
              <View style={styles.statRow}>
                <Text
                  style={styles.statValueMoney}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {loadingDashboard
                    ? "—"
                    : formatRupiah(dashboardData?.data?.totalOmset)}
                </Text>
                <Ionicons name="cash-outline" size={28} color="#10B981" />
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: "#8B5CF6" }]}>
              <Text style={styles.statLabel}>Total Transaksi</Text>
              <View style={styles.statRow}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {loadingDashboard
                    ? "—"
                    : formatCount(dashboardData?.data?.totalTransaksi)}
                </Text>
                <Ionicons name="receipt-outline" size={28} color="#8B5CF6" />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── History Cabang ── */}
      {loadingCabang || loadingCabangToday ? (
        <View style={styles.center}>
          <ActivityIndicator color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={isCabang ? cabangData : cabangTodayData}
          keyExtractor={(item: ICashFlow, index) => {
            return `${item.id}-${index}`;
          }}
          renderItem={renderCashFlow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cabangScroll}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"History"}</Text>
              <TouchableOpacity
                style={styles.lihatSemua}
                onPress={openCabangList}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Lihat semua history"
              >
                <Text style={styles.lihatSemuaText}>Lihat Semua</Text>
                <Ionicons name="chevron-forward" size={14} color={ORANGE} />
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="store-off-outline"
                size={28}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>Belum ada history</Text>
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

      <Modal
        visible={selectedCabang !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDetail}
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeDetail}
          accessibilityRole="button"
          accessibilityLabel="Tutup detail cabang"
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.cabangIconWrap}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={22}
                  color={ORANGE}
                />
              </View>

              <View style={styles.flex}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {selectedCabang?.user?.name || "-"}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  ID cabang {selectedCabang?.id ?? "-"}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: selectedCabang?.verified
                      ? "#FEE2E2"
                      : "#D1FAE5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: selectedCabang?.verified ? "#DC2626" : GREEN,
                    },
                  ]}
                >
                  {selectedCabang?.verified ? "Belum diverifikasi" : "Aktif"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.sheetRow}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}
              >
                <Ionicons name="cash-outline" size={16} color="#10B981" />
              </View>
              <Text style={styles.sheetRowLabel}>Omset Hari Ini</Text>
              <Text
                style={[styles.sheetRowValue, { color: "#10B981" }]}
                numberOfLines={1}
              >
                {formatRupiah("10000")}
              </Text>
            </View>

            <View style={styles.sheetRow}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#F5F3FF" }]}
              >
                <Ionicons name="receipt-outline" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.sheetRowLabel}>Transaksi</Text>
              <Text
                style={[styles.sheetRowValue, { color: "#8B5CF6" }]}
                numberOfLines={1}
              >
                1x
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={closeDetail}
              accessibilityRole="button"
            >
              <Text style={styles.sheetCloseText}>Tutup</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={transaksiCashFlow !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeTransaksi}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={closeTransaksi}
            accessibilityRole="button"
            accessibilityLabel="Tutup transaksi hari ini"
          >
            <Pressable
              style={[styles.sheet, styles.sheetTall]}
              onPress={() => {}}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View style={styles.flex}>
                  <Text style={styles.sheetTitle}>Transaksi</Text>
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>
                    {user?.name || "-"} -{" "}
                    {formatDate(
                      transaksiCashFlow?.createdAt || new Date().toDateString(),
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeTransaksi}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {trxLoading ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator color={ORANGE} />
                </View>
              ) : (
                <FlatList
                  data={trxItems}
                  keyExtractor={(item, index) =>
                    `${String(getProductId(item))}-${index}`
                  }
                  style={styles.sheetList}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <MaterialCommunityIcons
                        name="clipboard-text-outline"
                        size={28}
                        color="#9CA3AF"
                      />
                      <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
                      <Text style={styles.emptyText}>
                        Stock hari ini belum diinput untuk cabang ini.
                      </Text>
                    </View>
                  }
                  renderItem={({ item }: { item: ICashFlowItem }) => {
                    const qty = trxInput[item.id] ?? "";

                    const price = getRowPrice(item);
                    const subtotal = item.out
                      ? item.out * price
                      : item.in * price;

                    return (
                      <StockRow
                        id={item.id}
                        name={item.product?.name || "-"}
                        priceLabel={
                          price > 0
                            ? formatRupiah(price) +
                              (subtotal > 0
                                ? `  ·  ${formatRupiah(subtotal)}`
                                : "")
                            : undefined
                        }
                        qty={qty}
                        editable={transaksiCashFlow?.verified === 2 || isAdmin}
                        onChangeQty={handleChangeTrxQty}
                      />
                    );
                  }}
                />
              )}
              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionBtnPrimary,
                    transaksiCashFlow?.verified === 1 && styles.btnDisabled,
                    transaksiCashFlow?.verified === 0 && styles.btnDisabled,
                  ]}
                  disabled={
                    savingTrx ||
                    transaksiCashFlow?.verified === 1 ||
                    transaksiCashFlow?.verified === 0
                  }
                  onPress={submitTrx}
                  accessibilityRole="button"
                >
                  {savingTrx ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnPrimaryText}>Submit</Text>
                  )}
                </TouchableOpacity>

                {isAdmin ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnApprove]}
                    onPress={confirmApprove}
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: approving,
                    }}
                  >
                    {approving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.actionBtnApproveText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#F5F5F5" },
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
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  fixedContent: { paddingHorizontal: 16, paddingTop: 16 },
  cabangScroll: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },

  greetCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  shopIcon: { backgroundColor: ORANGE_SOFT, borderRadius: 10, padding: 10 },
  greetSub: { color: "#888", fontSize: 13 },
  greetName: { color: "#222", fontSize: 18, fontWeight: "700" },

  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    // flex:1 instead of width:"47%" — two 47% cards plus a 12px gap
    // overflow the row on narrow devices.
    flex: 1,
    minWidth: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: { color: "#888", fontSize: 12, marginBottom: 8 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statValue: { flexShrink: 1, fontSize: 28, fontWeight: "800", color: "#222" },
  statValueMoney: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  lihatSemua: { flexDirection: "row", alignItems: "center", gap: 2 },
  lihatSemuaText: { fontSize: 13, color: ORANGE, fontWeight: "600" },

  cabangCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  cabangTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cabangIconWrap: { backgroundColor: ORANGE_SOFT, borderRadius: 8, padding: 8 },
  cabangNama: { flex: 1, fontSize: 14, fontWeight: "700", color: "#222" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 },

  cabangStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cabangStatItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  cabangStatText: { flex: 1, marginLeft: 8 },
  statIconWrap: { borderRadius: 8, padding: 7 },
  cabangStatLabel: { fontSize: 10, color: "#9CA3AF", marginBottom: 2 },
  cabangStatValue: { fontSize: 13, fontWeight: "700", color: "#374151" },
  cabangStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  cabangFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    minHeight: 40,
  },
  cardBtnGhost: {
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: "#FADDD1",
  },
  cardBtnGhostText: { color: ORANGE, fontSize: 12, fontWeight: "700" },
  cardBtnSolid: { backgroundColor: ORANGE },
  cardBtnSolidText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  // SHEETS
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetTall: { maxHeight: "85%" },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  sheetRowLabel: { flex: 1, fontSize: 13, color: "#6B7280" },
  sheetRowValue: { fontSize: 14, fontWeight: "700" },
  sheetLoading: { paddingVertical: 48, alignItems: "center" },
  sheetList: { flexGrow: 0 },
  sheetCloseBtn: {
    marginTop: 14,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sheetCloseText: { color: "#fff", fontWeight: "800" },

  sheetActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 50,
  },
  actionBtnPrimary: { backgroundColor: ORANGE },
  actionBtnPrimaryText: { color: "#fff", fontWeight: "800" },
  actionBtnApprove: { backgroundColor: GREEN },
  actionBtnApproveText: { color: "#fff", fontWeight: "800" },
  approveHint: {
    marginTop: 8,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // STOCK ROW
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  stockName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  stockPrice: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  qtyInput: {
    width: 72,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 8,
    color: "#111827",
    textAlign: "center",
  },
  qtyInputFilled: { borderColor: ORANGE, backgroundColor: ORANGE_SOFT },
  qtyBadge: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: ORANGE_SOFT,
    alignItems: "center",
  },
  qtyBadgeText: { color: ORANGE, fontWeight: "800", fontSize: 13 },

  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyTitle: { fontWeight: "700", color: "#374151" },
  emptyText: { color: "#6B7280", fontSize: 12, textAlign: "center" },
});
