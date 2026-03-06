import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useUpdateStockCilokMutation } from "../../services/queries/stock-management";
import { ToastSuccess } from "../../utils/toast";
import { useQueryClient } from "@tanstack/react-query";

const C = {
  cream: "#fff2de",
  burnt: "#b34219",
  parchment: "#F3E9DC",
  orange: "#D96F32",
  rust: "#C75D2C",
  amber: "#F8B259",
  rustAlpha: "#c75d2c4d",
  amberAlpha: "#f8b359a9",
  white: "#FFFFFF",
  dark: "#2C1A0E",
  gray: "#9B7B6A",
};

export default function AddStockCilokModal({
  visible,
  mode,
  user,
  onClose,
}: {
  visible: boolean;
  mode: "add" | "subtract";
  user: User;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const queryClient = useQueryClient();

  const { mutate, isPending } = useUpdateStockCilokMutation();

  useEffect(() => {
    if (visible) {
      setQuantity("");
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 75,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isAdd = mode === "add";
  const accent = isAdd ? C.orange : C.burnt;
  const QUICK = isAdd ? [10, 25, 50, 100] : [5, 10, 20, 50];

  const parsed = parseInt(quantity) || 0;
  const preview = isAdd
    ? user.stockCilok + parsed
    : Math.max(0, user.stockCilok - parsed);
  const isValid = parsed > 0 && (isAdd || parsed <= user.stockCilok);

  const handleConfirm = async () => {
    const payload = {
      id: user.id,
      quantity,
    };
    mutate(payload, {
      onSuccess: ({ message }) => {
        queryClient.invalidateQueries({ queryKey: ["karyawan:all"] });
        ToastSuccess(message);
        onClose();
      },
    });
  };

  const loading = isPending;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[ms.overlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}
              >
                <View style={ms.handle} />

                {/* Header */}
                <View style={ms.headerRow}>
                  <View
                    style={[
                      ms.modeTag,
                      { backgroundColor: isAdd ? "#FFF0DB" : "#FDEAE4" },
                    ]}
                  >
                    <Text style={[ms.modeTagText, { color: accent }]}>
                      {isAdd ? "＋ Tambah Stok" : "－ Kurangi Stok"}
                    </Text>
                  </View>
                  <View style={ms.userPill}>
                    <Text style={ms.pillName}>{user.name.split(" ")[0]}</Text>
                  </View>
                </View>

                {/* Current / preview */}
                <View style={[ms.infoBox, { borderColor: C.rustAlpha }]}>
                  <View style={ms.infoCol}>
                    <Text style={ms.infoLabel}>Saat Ini</Text>
                    <Text style={[ms.infoVal, { color: C.gray }]}>
                      {user.stockCilok}
                    </Text>
                  </View>
                  <Text style={[ms.infoArrow, { color: accent }]}>→</Text>
                  <View style={ms.infoCol}>
                    <Text style={ms.infoLabel}>Setelah</Text>
                    <Text style={[ms.infoVal, { color: accent }]}>
                      {parsed > 0 ? preview : "—"}
                    </Text>
                  </View>
                  <View style={ms.infoCol}>
                    <Text style={ms.infoLabel}>Selisih</Text>
                    <Text
                      style={[
                        ms.infoVal,
                        { color: isAdd ? "#4CAF50" : C.burnt },
                      ]}
                    >
                      {parsed > 0 ? `${isAdd ? "+" : "-"}${parsed}` : "—"}
                    </Text>
                  </View>
                </View>

                {/* Quick pick */}
                <Text style={ms.sectionLabel}>Jumlah Cepat</Text>
                <View style={ms.quickRow}>
                  {QUICK.map((q) => {
                    const disabled = !isAdd && q > user.stockCilok;
                    return (
                      <TouchableOpacity
                        key={q}
                        style={[
                          ms.quickBtn,
                          parsed === q && {
                            backgroundColor: accent,
                            borderColor: accent,
                          },
                          disabled && ms.quickDisabled,
                        ]}
                        onPress={() => setQuantity(String(q))}
                        disabled={disabled}
                      >
                        <Text
                          style={[
                            ms.quickText,
                            parsed === q && { color: C.white },
                            disabled && { color: C.rustAlpha },
                          ]}
                        >
                          {q}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Input */}
                <Text style={ms.sectionLabel}>Manual</Text>
                <View
                  style={[
                    ms.inputRow,
                    { borderColor: quantity ? accent : C.rustAlpha },
                  ]}
                >
                  <Text style={[ms.inputPfx, { color: accent }]}>
                    {isAdd ? "+" : "−"}
                  </Text>
                  <TextInput
                    style={ms.input}
                    placeholder="0"
                    placeholderTextColor={C.gray}
                    keyboardType="number-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                  <Text style={ms.inputSfx}>pcs</Text>
                </View>

                {!isAdd && parsed > user.stockCilok && (
                  <Text style={ms.errText}>⚠ Maks {user.stockCilok} pcs</Text>
                )}

                {/* Confirm */}
                <TouchableOpacity
                  style={[
                    ms.confirmBtn,
                    {
                      backgroundColor:
                        isValid && !loading ? accent : C.rustAlpha,
                    },
                  ]}
                  onPress={handleConfirm}
                  disabled={!isValid || loading}
                  activeOpacity={0.8}
                >
                  <Text style={ms.confirmText}>
                    {loading ? "Menyimpan..." : isAdd ? "Tambahkan" : "Kurangi"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    marginVertical: 8,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
  strip: { height: 5 },
  body: { padding: 18 },

  // Identity
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: C.cream,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 22, fontWeight: "800", color: C.rust },
  identityMid: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: "800", color: C.dark, letterSpacing: -0.3 },
  email: { fontSize: 12, color: C.gray, fontWeight: "500" },
  metaRight: { alignItems: "flex-end", gap: 6 },
  permBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  permText: { fontSize: 11, fontWeight: "700", color: C.rust },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  activeText: { fontSize: 11, fontWeight: "600" },

  divider: { height: 1, backgroundColor: C.parchment, marginBottom: 14 },

  // Stock
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 11,
    color: C.gray,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stockNumRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  stockNum: { fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  stockUnit: { fontSize: 14, color: C.gray, fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },

  // Progress
  barTrack: {
    height: 8,
    backgroundColor: C.parchment,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 16,
  },
  barLabelText: { fontSize: 10, color: C.gray },

  // Buttons
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  btnDisabled: { opacity: 0.4 },
  btnSub: { backgroundColor: C.parchment },
  btnSubIcon: {
    fontSize: 20,
    fontWeight: "900",
    color: C.burnt,
    lineHeight: 22,
  },
  btnSubText: { fontSize: 13, fontWeight: "700", color: C.dark },
  btnAdd: { backgroundColor: C.rust },
  btnAddIcon: {
    fontSize: 20,
    fontWeight: "900",
    color: C.white,
    lineHeight: 22,
  },
  btnAddText: { fontSize: 13, fontWeight: "700", color: C.white },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(44,26,14,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 44,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.rustAlpha,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modeTag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  modeTagText: { fontSize: 14, fontWeight: "800" },
  userPill: {
    backgroundColor: C.parchment,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillName: { fontSize: 14, fontWeight: "700", color: C.dark },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: C.parchment,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  infoCol: { alignItems: "center", gap: 4 },
  infoLabel: {
    fontSize: 10,
    color: C.gray,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoVal: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  infoArrow: { fontSize: 20, fontWeight: "700" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.rustAlpha,
    backgroundColor: C.parchment,
    alignItems: "center",
  },
  quickDisabled: { opacity: 0.3 },
  quickText: { fontSize: 15, fontWeight: "800", color: C.rust },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.parchment,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputPfx: { fontSize: 22, fontWeight: "900", marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: C.dark,
    paddingVertical: 14,
  },
  inputSfx: { fontSize: 15, color: C.gray, fontWeight: "600" },
  errText: {
    color: C.burnt,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },

  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  confirmText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
