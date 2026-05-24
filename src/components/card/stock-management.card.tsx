import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Button from "../button";
import { useStockManagementStore } from "../../store/stock-management.store";

// ─── Color Palette ────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  name: string;
  email: string;
  password: string;
  permission: number;
  stockCilok: number;
  active: boolean;
}

interface UserStockCardProps {
  user: User;
}

export default function StockManagementCard({ user }: UserStockCardProps) {
  const isActive = !user.deletedAt;
  const { toggleAddStockModal, setAddStockId } = useStockManagementStore();

  const handleOnPress = () => {
    setAddStockId(user.id);
    toggleAddStockModal();
  };

  const permLabel =
    user.permission === 0
      ? "Admin"
      : user.permission === 1
        ? "Manager"
        : "Staff";

  return (
    <>
      <Animated.View style={[cs.card]}>
        <View style={[cs.strip]} />
        <View style={cs.body}>
          <View style={cs.identityRow}>
            <View style={[cs.avatar]}>
              <Text style={cs.avatarInitial}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={cs.identityMid}>
              <Text style={cs.name} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={cs.email} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <View style={cs.metaRight}>
              <View style={[cs.permBadge, { backgroundColor: C.parchment }]}>
                <Text style={cs.permText}>{permLabel}</Text>
              </View>
              <View style={cs.activeRow}>
                <View
                  style={[
                    cs.activeDot,
                    { backgroundColor: user.active ? "#4CAF50" : C.gray },
                  ]}
                />
                <Text style={[cs.activeText, { color: "#4CAF50" }]}>
                  {"Aktif"}
                </Text>
              </View>
            </View>
          </View>
          <View style={cs.divider} />

          <View style={cs.btnRow}>
            <Button
              style={{ width: "100%" }}
              textStyle={{ fontSize: 14 }}
              text="+ Tambah"
              disabled={!isActive}
              onPress={handleOnPress}
            />
          </View>
        </View>
      </Animated.View>
    </>
  );
}

// ─── Card Styles ──────────────────────────────────────────────────────────────
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
    borderColor: "#C75D2C",
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
