import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAddUserMutation,
  useChangePasswordMutation,
  useGetAllUserQuery,
  useSetActiveMutation,
} from "../../src/services/queries/user";
import { useAuthStore } from "../../src/utils/authStore";
import { enumeratePermission, PERMISSION } from "../../src/utils/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { ToastSuccess } from "../../src/utils/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: "Super User" | "Admin" | "Cabang";
  permission: number;
  deletedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = "#B94A1C";
const BRAND_LIGHT = "#FCF0EB";

const ROLE_OPTIONS: User["role"][] = ["Super User", "Admin", "Cabang"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleColor = (role: User["role"]) => {
  if (role === "Super User") return { bg: BRAND_LIGHT, text: BRAND };
  if (role === "Admin") return { bg: "#EFF6FF", text: "#2563EB" };
  return { bg: "#F0FDF4", text: "#16A34A" };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfilScreen() {
  const queryClient = useQueryClient();
  const { mutate } = useAddUserMutation();

  const { user } = useAuthStore();
  const { data: res } = useGetAllUserQuery();
  const { mutate: setActive } = useSetActiveMutation();
  const { mutate: changePassword } = useChangePasswordMutation();

  const [activeModal, setActiveModal] = useState<
    "users" | "password" | "create" | null
  >(null);

  // Logged-in user (user id "1" sebagai contoh)
  const currentUser: User = res?.data?.find((u: User) => {
    return u.id === user?.id;
  });

  const role = currentUser
    ? enumeratePermission(currentUser?.permission)
        .toString()
        .replace("_", " ") || "?"
    : "";

  // Change password
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<User["role"]>("Cabang");
  const [password, setPassword] = useState("");

  const closeModal = () => {
    setActiveModal(null);
    setNewPass("");
    setConfirmPass("");
    setName("");
    setEmail("");
    setPassword("");
    setPermission("Cabang");
  };

  const handleSetActive = (id: string, deletedAt: string) => {
    const payload = {
      id,
      active: deletedAt ? 1 : 0,
    };
    setActive(payload, {
      onSuccess: () => {
        ToastSuccess("Status berhasil diubah.");
        queryClient.invalidateQueries({ queryKey: ["user:all"] });
      },
    });
  };

  const handleSimpanPassword = () => {
    if (!newPass || !confirmPass) {
      Alert.alert("Lengkapi Data", "Semua kolom harus diisi.");
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert("Tidak Cocok", "Password baru dan konfirmasi tidak sama.");
      return;
    }
    if (newPass.length < 6) {
      Alert.alert("Terlalu Pendek", "Password minimal 6 karakter.");
      return;
    }

    if (!user) {
      Alert.alert("User login not found", "Please re-login");
      return;
    }
    changePassword(
      { id: user?.id, password: newPass },
      {
        onSuccess: () => {
          Alert.alert("Berhasil", "Password berhasil diubah.", [
            { text: "OK", onPress: closeModal },
          ]);
        },
      },
    );
  };

  const handleBuatAkun = () => {
    const permissionObj = {
      ["Super User"]: "SUPER_USER",
      ["Admin"]: "ADMIN",
      ["Cabang"]: "CABANG",
    };
    const payload = {
      name,
      email,
      password,
      permission: [permissionObj[permission]],
    };
    mutate(payload, {
      onSuccess: () => {
        Alert.alert("Berhasil", `Akun "${name}" berhasil dibuat.`, [
          { text: "OK", onPress: closeModal },
        ]);
        queryClient.invalidateQueries({ queryKey: ["user:all"] });
        queryClient.invalidateQueries({ queryKey: ["cabang:today"] });
      },
    });
  };

  const handleHapusUser = (user: User) => {
    if (user.id === "1") {
      Alert.alert("Tidak Bisa", "Akun admin utama tidak bisa dihapus.");
      return;
    }
    Alert.alert("Hapus Akun", `Hapus akun "${user.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => handleSetActive(user.id, user.deletedAt),
      },
    ]);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={BRAND} barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Ionicons name="person" size={36} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{currentUser?.name || ""}</Text>
            <Text style={s.profileEmail}>{currentUser?.email || ""}</Text>
            <View
              style={[
                s.badge,
                { backgroundColor: roleColor(currentUser?.role || "").bg },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  { color: roleColor(currentUser?.role || "").text },
                ]}
              >
                {role}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Cards */}
        {[
          {
            id: "users",
            icon: "people-outline" as const,
            label: "Kelola Pengguna",
            sub: `${res?.data?.length} akun terdaftar`,
          },
          {
            id: "password",
            icon: "lock-closed-outline" as const,
            label: "Ubah Password",
            sub: "Perbarui kata sandi Anda",
          },
          {
            id: "create",
            icon: "person-add-outline" as const,
            label: "Buat Akun Baru",
            sub: "Tambah pengguna ke sistem",
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.actionCard}
            onPress={() => setActiveModal(item.id as any)}
            activeOpacity={0.75}
          >
            <View style={s.actionIcon}>
              <Ionicons name={item.icon} size={22} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionLabel}>{item.label}</Text>
              <Text style={s.actionSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={[s.actionCard, { borderColor: "#FEE2E2" }]}
          activeOpacity={0.75}
          onPress={() =>
            Alert.alert("Keluar", "Apakah Anda yakin ingin keluar?", [
              { text: "Batal", style: "cancel" },
              {
                text: "Keluar",
                style: "destructive",
                onPress: () => Alert.alert("Berhasil", "Anda telah keluar."),
              },
            ])
          }
        >
          <View style={[s.actionIcon, { backgroundColor: "#FEF2F2" }]}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </View>
          <Text style={[s.actionLabel, { color: "#EF4444", flex: 1 }]}>
            Keluar
          </Text>
        </TouchableOpacity>

        <Text style={s.version}>Cilok Baradax v1.0.0</Text>
      </ScrollView>

      {/* ── Modal: Kelola Pengguna ── */}
      <Modal
        visible={activeModal === "users"}
        animationType="slide"
        transparent
      >
        <View style={m.overlay}>
          <View style={[m.sheet, { maxHeight: "85%" }]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>Daftar Pengguna</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={res?.data || []}
              keyExtractor={(u) => u.id}
              scrollEnabled
              style={{ maxHeight: 400 }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
              )}
              renderItem={({ item }) => {
                const rc = roleColor(item.role);
                const permission =
                  enumeratePermission(item?.permission)
                    .toString()
                    .replace("_", " ") || "?";
                return (
                  <View style={m.userRow}>
                    <View style={m.userAvatar}>
                      <Ionicons name="person" size={18} color={BRAND} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={m.userName}>{item.name}</Text>
                      <Text style={m.userEmail}>{item.email}</Text>
                    </View>
                    <View style={[m.roleBadge, { backgroundColor: rc.bg }]}>
                      <Text style={[m.roleText, { color: rc.text }]}>
                        {permission}
                      </Text>
                    </View>
                    {item.id !== "1" && (
                      <TouchableOpacity
                        onPress={() => handleHapusUser(item)}
                        style={{ marginLeft: 8 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />

            <TouchableOpacity
              style={[m.saveBtn, { backgroundColor: "#6B7280", marginTop: 8 }]}
              onPress={closeModal}
            >
              <Text style={m.saveBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Ubah Password ── */}
      <Modal
        visible={activeModal === "password"}
        animationType="slide"
        transparent
      >
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>Ubah Password</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {(
              [
                {
                  label: "Password Baru",
                  val: newPass,
                  set: setNewPass,
                  show: showNew,
                  toggle: setShowNew,
                },
                {
                  label: "Konfirmasi Password",
                  val: confirmPass,
                  set: setConfirmPass,
                  show: showConfirm,
                  toggle: setShowConfirm,
                },
              ] as const
            ).map((field) => (
              <View key={field.label}>
                <Text style={m.label}>
                  {field.label} <Text style={{ color: BRAND }}>*</Text>
                </Text>
                <View style={m.passWrap}>
                  <TextInput
                    style={m.passInput}
                    placeholder={
                      field.label === "Password Baru"
                        ? "Minimal 6 karakter"
                        : `Masukkan ${field.label.toLowerCase()}`
                    }
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!field.show}
                    value={field.val}
                    onChangeText={field.set}
                  />
                  <TouchableOpacity onPress={() => field.toggle(!field.show)}>
                    <Ionicons
                      name={field.show ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={m.saveBtn} onPress={handleSimpanPassword}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
              <Text style={m.saveBtnText}>Simpan Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Buat Akun Baru ── */}
      <Modal
        visible={activeModal === "create"}
        animationType="slide"
        transparent
      >
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>Buat Akun Baru</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={m.label}>
              Nama<Text style={{ color: BRAND }}>*</Text>
            </Text>
            <TextInput
              style={m.input}
              placeholder="Nama pengguna"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={m.label}>
              Email <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <TextInput
              style={m.input}
              placeholder="Email aktif"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={m.label}>
              Password <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <TextInput
              style={m.input}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={m.label}>Role</Text>
            <View style={m.roleRow}>
              {ROLE_OPTIONS.map((r) => {
                const rc = roleColor(r);
                const selected = permission === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setPermission(r)}
                    style={[
                      m.roleOption,
                      selected && {
                        backgroundColor: rc.bg,
                        borderColor: rc.text,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        m.roleOptionText,
                        selected && { color: rc.text, fontWeight: "700" },
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={m.saveBtn} onPress={handleBuatAkun}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={m.saveBtnText}>Buat Akun</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  profileEmail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  badge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  actionSub: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#D1D5DB",
    marginTop: 4,
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: -2,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FAFAFA",
  },
  passWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 11,
    backgroundColor: "#FAFAFA",
  },
  passInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 11 },
  saveBtn: {
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  userEmail: { fontSize: 12, color: "#9CA3AF" },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleText: { fontSize: 11, fontWeight: "600" },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  roleOptionText: { fontSize: 13, color: "#6B7280" },
});
