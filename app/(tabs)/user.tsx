import { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import Button from "../../src/components/button";
import {
  useAddUserMutation,
  useGetAllUserQuery,
  useSetActiveMutation,
} from "../../src/services/queries/user";
import { enumeratePermission } from "../../src/utils/permissions";
import { Picker } from "@react-native-picker/picker";
import { ToastSuccess } from "../../src/utils/toast";
import { useQueryClient } from "@tanstack/react-query";

export default function User() {
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<"active" | "inactive">("active");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("");
  const [password, setPassword] = useState("");
  const pickerRef = useRef(null);

  const queryClient = useQueryClient();

  const {
    data,
    refetch,
    isRefetching: refetchingGetAllUser,
    isPending: loadingGetAllUser,
  } = useGetAllUserQuery();
  const { mutate: addUser, isPending: loadingAddUser } = useAddUserMutation();
  const { mutate: setActive, isPending: loadingSetActive } =
    useSetActiveMutation();

  useEffect(() => {
    refetch();
  }, []);

  const loading =
    loadingAddUser ||
    loadingSetActive ||
    refetchingGetAllUser ||
    loadingGetAllUser;

  const handleReset = useCallback(() => {
    setName("");
    setEmail("");
    setPassword("");
    setPermission("");
  }, []);

  const handleAddUser = () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !permission.trim() ||
      !password.trim()
    ) {
      Alert.alert("Error", "Semua field harus diisi.");
      return;
    }
    const payload = {
      name,
      email,
      password,
      permission: [permission],
    };
    addUser(payload, {
      onSuccess: ({ message }) => {
        setModalVisible(false);
        setTimeout(() => {
          handleReset();
          ToastSuccess(message);
          refetch();
        }, 1000);
      },
    });
  };

  const handleSetActiveUser = (user: User) => {
    setActive(
      { id: user.id, active: user.deletedAt ? 1 : 0 },
      {
        onSuccess: ({ message }) => {
          queryClient.invalidateQueries({ queryKey: ["karyawan:all"] });
          ToastSuccess(message);
          refetch();
        },
      },
    );
  };

  const users: User[] | [] = data?.data || [];

  const filteredUsers = users.filter((u) => {
    if (filter === "active") return !u.deletedAt;
    if (filter === "inactive") return u.deletedAt;
    return true;
  });

  const confirmToggle = (user: User) => {
    Alert.alert(
      user.deletedAt ? "Nonaktifkan User" : "Aktifkan User",
      `${user.deletedAt ? "Nonaktifkan" : "Aktifkan"} ${user.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya",
          style: "cancel",
          onPress: () => handleSetActiveUser(user),
        },
      ],
    );
  };

  const renderUser = ({ item }: { item: User }) => {
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item?.name?.charAt(0).toUpperCase() || "X"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {enumeratePermission(item?.permission)
                .toString()
                .replace("_", " ") || "lolz"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.statusBtn,
            !item.deletedAt ? styles.activeBtn : styles.inactiveBtn,
          ]}
          onPress={() => confirmToggle(item)}
        >
          <Text style={styles.statusBtnText}>
            {item?.deletedAt ? "Nonaktif" : "Aktif"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manajemen User</Text>
          <Text style={styles.headerSub}>
            {data?.data?.length || 0} total pengguna
          </Text>
        </View>
        <Button text="+ Tambah" onPress={() => setModalVisible(true)} />
      </View>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["active", "inactive"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "active" ? "Aktif" : "Nonaktif"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: "#2cc76d" }]}>
            {users.filter((u) => !u.deletedAt)?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: "#c7362c" }]}>
            {users.filter((u) => u.deletedAt)?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Nonaktif</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: "#0050c7b2" }]}>
            {users?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.container}>
          {/* The built-in spinner component */}
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada user ditemukan.</Text>
            </View>
          }
        />
      )}

      {/* Add User Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Tambah User Baru</Text>

            <Text style={styles.label}>Nama</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama..."
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email..."
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan password..."
              placeholderTextColor="#64748B"
              value={password}
              secureTextEntry
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Role</Text>
            <View
              style={{
                borderRadius: 8,
                overflow: "hidden", // IMPORTANT
                borderWidth: 1,
                backgroundColor: "#fff2de",
                borderColor: "#3341553a",
              }}
            >
              <Picker
                ref={pickerRef}
                selectedValue={permission}
                onValueChange={(itemValue, itemIndex) =>
                  setPermission(itemValue)
                }
                style={{ height: 50, width: "100%" }}
              >
                <Picker.Item
                  label="Super User"
                  value="SUPER_USER"
                  style={{ color: "#64748B" }}
                />
                <Picker.Item
                  label="Admin"
                  value="ADMIN"
                  style={{ color: "#64748B" }}
                />
                <Picker.Item
                  label="Karyawan"
                  value="KARYAWAN"
                  style={{ color: "#64748B" }}
                />
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddUser}>
                <Text style={styles.saveBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff2de", color: "#ffffff" },
  containerAdds: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#d96f3275",
    marginTop: 80,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
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
    backgroundColor: "#e9b190",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    color: "#fff",
  },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#fff" },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    backgroundColor: "#fff2de",
    borderColor: "#3341553a",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "700", color: "#fff" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#D96F32",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  saveBtnText: {
    fontWeight: "700",
    color: "#fff",
  },
});
