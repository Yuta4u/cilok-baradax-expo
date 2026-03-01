import { StyleSheet, Text, View } from "react-native";

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function PageLayout({ title, children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>Sub Title</Text>
        </View>
      </View>
      <View style={styles.containerAdds}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff2de", color: "#ffffff" },
  containerAdds: {
    flex: 1,
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#d96f3275",
    marginTop: 90,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  headerSub: { fontSize: 13, color: "#64748B", marginTop: 2 },
  addButton: {
    backgroundColor: "#D96F32",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#c75d2c4d",
    borderRadius: 12,
    padding: 4,
    borderColor: "#c75d2c3a",
    borderWidth: 1,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  filterTabActive: { backgroundColor: "#C75D2C" },
  filterText: { fontWeight: "600", fontSize: 13 },
  filterTextActive: { color: "#fff" },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#c75d2c4d",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c75d2c79",
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#c75d2c4d",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#c75d2c79",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F8B259",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontWeight: "800", fontSize: 18, color: "#ffffffc0" },
  userInfo: { flex: 1 },
  userName: { fontWeight: "700", fontSize: 15 },
  userEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: {
    marginTop: 5,
    backgroundColor: "#c75d2c4d",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  roleText: { fontSize: 11, fontWeight: "600" },

  statusBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  activeBtn: { backgroundColor: "#2cc76d" },
  inactiveBtn: { backgroundColor: "#c7362c" },
  statusBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 15 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "700" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  saveBtnText: { fontWeight: "700" },
});
