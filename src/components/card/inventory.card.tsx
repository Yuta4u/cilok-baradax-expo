import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatIDR } from "../../utils/format";
import { AddStockModalBtn } from "../modal/add-stock.modal";
import { SubtractStockModalBtn } from "../modal/subtract-stock.modal";
import { EditMinimalStockModalBtn } from "../modal/edit-minimal-stock.modal";

interface Props {
  item: Ingredient;
}

export default function InventoryCard({ item }: Props) {
  const persen = Math.min(
    100,
    Math.round(
      (Number(item.stock || 0) / (Number(item.minimalStock || 0) * 3)) * 100,
    ),
  );

  const color = persen < 50 ? "red" : "green";

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      {/* Row atas */}
      <View style={styles.topRow}>
        <View style={styles.infoRow}>
          <Text style={styles.icon}>{item.icon}</Text>
          <View>
            <Text style={styles.nama}>{item.name}</Text>
            <Text style={styles.sub}>
              {formatIDR(item?.price?.toString())}/{item.uom}
            </Text>
          </View>
        </View>
        <View style={styles.stokRight}>
          <Text style={[styles.stokAngka, { color }]}>{item.stock}</Text>
          <Text style={styles.stokSatuan}>{item.uom}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Stok saat ini</Text>
          <View style={[styles.statusBadge]}>
            <Text style={[styles.statusText, { color }]}>{item.stock}</Text>
          </View>
        </View>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressBar,
              { width: `${persen}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.minStokText}>
          Min: {item.minimalStock} {item.uom}
        </Text>
      </View>

      {/* Tombol aksi */}
      <View style={styles.btnRow}>
        <SubtractStockModalBtn id={item.id} />
        <AddStockModalBtn id={item.id} />
        <EditMinimalStockModalBtn id={item.id} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  icon: { fontSize: 28 },
  nama: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  sub: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  stokRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  stokAngka: {
    fontSize: 24,
    fontWeight: "800",
  },
  stokSatuan: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  progressWrap: {
    marginTop: 12,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  progressBg: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  minStokText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  btnMasuk: {
    backgroundColor: "#D96F32",
  },
  btnKeluar: {
    backgroundColor: "#F3E9DC",
  },
  btnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
