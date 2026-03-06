import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { StockInProductModalBtn } from "../modal/stock-in-product.modal";
import { StockOutProductModalBtn } from "../modal/stock-out-product.modal";

interface Product {
  createdAt: string;
  deletedAt?: string;
  name: string;
  icon: string;
  id: string;
  uom: string;
  stock: string;
  updatedAt: string;
}

interface Props {
  item: Product;
  onAddStock?: (id: string) => void;
  onSubtractStock?: (id: string) => void;
  lowStockThreshold?: number;
}

function getStockLevel(stock: string, threshold: number) {
  const n = parseFloat(stock);
  if (isNaN(n)) return "normal";
  if (n <= 0) return "empty";
  if (n <= threshold) return "low";
  return "normal";
}

const STATUS_CONFIG = {
  empty: {
    label: "Habis",
    color: "#FF3B30",
    bg: "#FFF0EF",
    bar: "#FF3B30",
    barBg: "#FFD6D4",
  },
  low: {
    label: "Hampir Habis",
    color: "#FF9500",
    bg: "#FFF8EE",
    bar: "#FF9500",
    barBg: "#FFE8C4",
  },
  normal: {
    label: "Tersedia",
    color: "#34C759",
    bg: "#EDFAF1",
    bar: "#34C759",
    barBg: "#C8F0D5",
  },
};

export default function ProductCard({
  item,
  onAddStock,
  onSubtractStock,
  lowStockThreshold = 10,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const stockNum = parseFloat(item.stock) || 0;
  const level = getStockLevel(item.stock, lowStockThreshold);
  const status = STATUS_CONFIG[level];

  // Progress bar: cap at 100 for display, using threshold * 5 as "full"
  const maxDisplay = lowStockThreshold * 5;
  const progress = Math.min(stockNum / maxDisplay, 1);

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
      ]}
    >
      {/* Top accent line */}
      <View style={[styles.accentLine, { backgroundColor: status.bar }]} />

      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View
              style={[styles.statusDot, { backgroundColor: status.color }]}
            />
            <Text style={[styles.statusLabel, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stock display */}
      <View style={styles.stockSection}>
        <View>
          <Text style={styles.stockLabelText}>Stok Saat Ini</Text>
          <View style={styles.stockValueRow}>
            <Text style={[styles.stockNumber, { color: status.color }]}>
              {item.stock}
            </Text>
            <Text style={styles.stockUom}>{item.uom}</Text>
          </View>
        </View>

        {/* Circular stock indicator */}
        <View style={[styles.stockRing, { borderColor: status.barBg }]}>
          <View style={[styles.stockRingInner, { borderColor: status.bar }]}>
            <Text style={[styles.stockRingText, { color: status.color }]}>
              {level === "empty" ? "0" : stockNum > 999 ? "99+" : item.stock}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: status.barBg }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: status.bar,
                width: `${Math.max(progress * 100, level === "empty" ? 0 : 4)}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressMin}>0</Text>
          <Text style={styles.progressMax}>
            {maxDisplay} {item.uom}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <StockOutProductModalBtn id={item.id} />
        <StockInProductModalBtn id={item.id} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff2de",
    borderRadius: 20,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    overflow: "hidden",
  },
  accentLine: {
    height: 4,
    width: "100%",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 26,
  },
  headerRight: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#F2F2F7",
    marginHorizontal: 18,
  },

  // Stock section
  stockSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  stockLabelText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stockValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  stockNumber: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  stockUom: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "600",
  },
  stockRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  stockRingInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  stockRingText: {
    fontSize: 13,
    fontWeight: "800",
  },

  // Progress
  progressSection: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressMin: {
    fontSize: 10,
    color: "#C7C7CC",
    fontWeight: "500",
  },
  progressMax: {
    fontSize: 10,
    color: "#C7C7CC",
    fontWeight: "500",
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  btnSubtract: {
    backgroundColor: "#F8B259",
  },
  btnSubtractIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 22,
  },
  btnSubtractText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  btnAdd: {
    backgroundColor: "#C75D2C",
  },
  btnAddIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  btnAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
