import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  FlatList,
  Keyboard,
  Pressable,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useAddUserMutation,
  useChangePasswordMutation,
  useGetAllUserQuery,
  useSetActiveMutation,
  useUpdateUserMutation,
} from "../../src/services/queries/user";
import { useAuthStore } from "../../src/utils/authStore";
import { enumeratePermission } from "../../src/utils/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { ToastSuccess } from "../../src/utils/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleLabel = "Admin" | "Cabang";

interface User {
  id: string;
  name: string;
  email: string;
  permission: number;
  deletedAt: string | null;
}

type ModalType = "users" | "password" | "create" | "rename" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = "#B94A1C";
const BRAND_LIGHT = "#FCF0EB";
const MIN_PASSWORD = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: RoleLabel[] = ["Admin", "Cabang"];

const ROLE_TO_PERMISSION: Record<RoleLabel, string> = {
  Admin: "ADMIN",
  Cabang: "CABANG",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const permissionLabel = (permission?: number) => {
  if (permission === undefined || permission === null) return "";
  return enumeratePermission(permission).toString().replace(/_/g, " ") || "?";
};

const roleColor = (label: string) => {
  const key = label.toUpperCase();
  if (key === "SUPER USER") return { bg: BRAND_LIGHT, text: BRAND };
  if (key === "ADMIN") return { bg: "#EFF6FF", text: "#2563EB" };
  return { bg: "#F0FDF4", text: "#16A34A" };
};

// Tinggi keyboard secara real-time. Dipakai supaya bottom sheet naik
// mengikuti keyboard (KeyboardAvoidingView tidak andal di dalam <Modal>,
// terutama di Android).
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

// ─── Reusable bottom sheet ────────────────────────────────────────────────────

function Sheet({
  visible,
  title,
  onClose,
  children,
  scrollable = true,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** false jika children sudah berisi list scroll sendiri (mis. FlatList) */
  scrollable?: boolean;
}) {
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();

  // Sheet tidak boleh lebih tinggi dari ruang yang tersisa di atas keyboard.
  const maxSheetHeight = (windowHeight - keyboardHeight) * 0.92;

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={m.overlay}>
        {/* Area kosong di luar sheet: tap untuk menutup modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View
          style={[
            m.sheet,
            {
              maxHeight: maxSheetHeight,
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 16 : 36,
            },
          ]}
        >
          <View style={m.sheetHeader}>
            <Text style={m.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={m.sheetBody}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={m.sheetBodyFixed}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SubmitButton({
  label,
  icon,
  loading,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[m.saveBtn, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Ionicons name={icon} size={20} color="#fff" />
      )}
      <Text style={m.saveBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfilScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // CATATAN: sesuaikan nama fungsi logout dengan authStore Anda
  // (mis. `logout`, `clearAuth`, `signOut`).
  const { user, logout } = useAuthStore();

  const { data: res, isLoading: usersLoading } = useGetAllUserQuery();
  const { mutate: addUser, isPending: adding } = useAddUserMutation();
  const { mutate: setActive } = useSetActiveMutation();
  const { mutate: changePassword, isPending: changing } =
    useChangePasswordMutation();

  const { mutate: changeName, isPending: renaming } = useUpdateUserMutation();

  const users: User[] = res?.data ?? [];

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Rename form (khusus admin)
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // Logged-in user
  const currentUser = useMemo(
    () => users.find((u) => u.id === user?.id),
    [users, user?.id],
  );
  const currentRole = permissionLabel(currentUser?.permission);
  const currentRoleColor = roleColor(currentRole);
  const canManage = currentRole !== "CABANG";

  // Change password form
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Create account form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RoleLabel>("Cabang");

  const closeModal = () => {
    Keyboard.dismiss();
    setActiveModal(null);
    setNewPass("");
    setConfirmPass("");
    setShowNew(false);
    setShowConfirm(false);
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("Cabang");
    setEditTarget(null);
    setEditName("");
  };

  // ─── Logout ──────────────────────────────────────────────────────────────

  const doLogout = async () => {
    try {
      setLoggingOut(true);
      await Promise.resolve(logout?.());
      queryClient.clear();
      router.replace("/");
      ToastSuccess("Anda berhasil logout");
    } catch {
      Alert.alert("Gagal", "Tidak dapat keluar. Silakan coba lagix.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Keluar", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: doLogout },
    ]);
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleToggleActive = (target: User) => {
    const isInactive = !!target.deletedAt;
    const verb = isInactive ? "Aktifkan" : "Nonaktifkan";

    if (target.id === "1" || target.id === user?.id) {
      Alert.alert(
        "Tidak Bisa",
        target.id === "1"
          ? "Akun admin utama tidak bisa dinonaktifkan."
          : "Anda tidak bisa menonaktifkan akun sendiri.",
      );
      return;
    }

    Alert.alert(`${verb} Akun`, `${verb} akun "${target.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: verb,
        style: isInactive ? "default" : "destructive",
        onPress: () =>
          setActive(
            { id: target.id, active: isInactive ? 1 : 0 },
            {
              onSuccess: () => {
                ToastSuccess("Status berhasil diubah.");
                queryClient.invalidateQueries({ queryKey: ["user:all"] });
              },
              onError: () =>
                Alert.alert("Gagal", "Status akun tidak dapat diubah."),
            },
          ),
      },
    ]);
  };

  const openRename = (target: User) => {
    setEditTarget(target);
    setEditName(target.name);
    setActiveModal("rename");
  };

  // Kembali ke daftar pengguna tanpa menutup semua modal
  const backToUsers = () => {
    Keyboard.dismiss();
    setEditTarget(null);
    setEditName("");
    setActiveModal("users");
  };

  const handleSimpanNama = () => {
    if (!editTarget) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert("Lengkapi Data", "Nama tidak boleh kosong.");
      return;
    }
    if (trimmed === editTarget.name) {
      backToUsers();
      return;
    }

    changeName(
      { id: editTarget.id, name: trimmed },
      {
        onSuccess: (msg) => {
          ToastSuccess(msg);
          queryClient.invalidateQueries({ queryKey: ["user:all"] });
          backToUsers();
        },
      },
    );
  };

  const handleSimpanPassword = () => {
    if (!newPass || !confirmPass) {
      Alert.alert("Lengkapi Data", "Semua kolom harus diisi.");
      return;
    }
    if (newPass.length < MIN_PASSWORD) {
      Alert.alert(
        "Terlalu Pendek",
        `Password minimal ${MIN_PASSWORD} karakter.`,
      );
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert("Tidak Cocok", "Password baru dan konfirmasi tidak sama.");
      return;
    }
    if (!user) {
      Alert.alert("User tidak ditemukan", "Silakan login ulang.");
      return;
    }
    changePassword(
      { id: user.id, password: newPass },
      {
        onSuccess: () => {
          Alert.alert("Berhasil", "Password berhasil diubah.", [
            { text: "OK", onPress: closeModal },
          ]);
        },
        onError: () =>
          Alert.alert("Gagal", "Password tidak dapat diubah. Coba lagi."),
      },
    );
  };

  const handleBuatAkun = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert("Lengkapi Data", "Nama, email, dan password harus diisi.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert("Email Tidak Valid", "Periksa kembali format email.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      Alert.alert(
        "Terlalu Pendek",
        `Password minimal ${MIN_PASSWORD} karakter.`,
      );
      return;
    }

    addUser(
      {
        name: trimmedName,
        email: trimmedEmail,
        password,
        permission: [ROLE_TO_PERMISSION[role]],
      },
      {
        onSuccess: () => {
          Alert.alert("Berhasil", `Akun "${trimmedName}" berhasil dibuat.`, [
            { text: "OK", onPress: closeModal },
          ]);
          queryClient.invalidateQueries({ queryKey: ["user:all"] });
          queryClient.invalidateQueries({ queryKey: ["cabang:today"] });
        },
        onError: () =>
          Alert.alert("Gagal", "Akun tidak dapat dibuat. Coba lagi."),
      },
    );
  };

  // ─── Data ────────────────────────────────────────────────────────────────

  const actions: {
    id: Exclude<ModalType, null>;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    sub: string;
    show?: boolean;
  }[] = [
    {
      id: "users",
      icon: "people-outline",
      label: "Kelola Pengguna",
      sub: `${users.length} akun terdaftar`,
      show: currentRole !== "CABANG",
    },
    {
      id: "password",
      icon: "lock-closed-outline",
      label: "Ubah Password",
      sub: "Perbarui kata sandi Anda",
      show: true,
    },
    {
      id: "create",
      icon: "person-add-outline",
      label: "Buat Akun Baru",
      sub: "Tambah pengguna ke sistem",
      show: currentRole !== "CABANG",
    },
  ];

  const passwordFields = [
    {
      label: "Password Baru",
      placeholder: `Minimal ${MIN_PASSWORD} karakter`,
      val: newPass,
      set: setNewPass,
      show: showNew,
      toggle: setShowNew,
    },
    {
      label: "Konfirmasi Password",
      placeholder: "Ulangi password baru",
      val: confirmPass,
      set: setConfirmPass,
      show: showConfirm,
      toggle: setShowConfirm,
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

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
            {usersLoading && !currentUser ? (
              <ActivityIndicator
                color={BRAND}
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <>
                <Text style={s.profileName}>
                  {currentUser?.name || user?.name || "-"}
                </Text>
                <Text style={s.profileEmail}>
                  {currentUser?.email || user?.email || ""}
                </Text>
                {!!currentRole && (
                  <View
                    style={[s.badge, { backgroundColor: currentRoleColor.bg }]}
                  >
                    <Text
                      style={[s.badgeText, { color: currentRoleColor.text }]}
                    >
                      {currentRole}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Action Cards */}
        {actions.map((item) => {
          return (
            item.show && (
              <TouchableOpacity
                key={item.id}
                style={s.actionCard}
                onPress={() => setActiveModal(item.id)}
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
            )
          );
        })}

        {/* Logout */}
        <TouchableOpacity
          style={[s.actionCard, { borderColor: "#FEE2E2" }]}
          activeOpacity={0.75}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <View style={[s.actionIcon, { backgroundColor: "#FEF2F2" }]}>
            {loggingOut ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            )}
          </View>
          <Text style={[s.actionLabel, { color: "#EF4444", flex: 1 }]}>
            Keluar
          </Text>
        </TouchableOpacity>

        <Text style={s.version}>Cilok Baradax v1.0.0</Text>
      </ScrollView>

      {/* ── Modal: Kelola Pengguna ── */}
      <Sheet
        visible={activeModal === "users"}
        title="Daftar Pengguna"
        onClose={closeModal}
        scrollable={false}
      >
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          style={{ flexShrink: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={m.empty}>Belum ada pengguna.</Text>}
          ItemSeparatorComponent={() => <View style={m.separator} />}
          renderItem={({ item }) => {
            const label = permissionLabel(item.permission);
            const rc = roleColor(label);
            const inactive = !!item.deletedAt;
            const isProtected = item.id === "1" || item.id === user?.id;
            return (
              <View style={[m.userRow, inactive && { opacity: 0.5 }]}>
                <View style={m.userAvatar}>
                  <Ionicons name="person" size={18} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={m.userName}>
                    {item.name}
                    {item.id === user?.id ? " (Anda)" : ""}
                  </Text>
                  <Text style={m.userEmail}>{item.email}</Text>
                  {inactive && <Text style={m.inactiveText}>Nonaktif</Text>}
                </View>
                <View style={[m.roleBadge, { backgroundColor: rc.bg }]}>
                  <Text style={[m.roleText, { color: rc.text }]}>{label}</Text>
                </View>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => openRename(item)}
                    style={{ marginLeft: 8 }}
                    hitSlop={8}
                  >
                    <Ionicons name="create-outline" size={20} color={BRAND} />
                  </TouchableOpacity>
                )}
                {!isProtected && (
                  <TouchableOpacity
                    onPress={() => handleToggleActive(item)}
                    style={{ marginLeft: 8 }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        inactive ? "refresh-circle-outline" : "trash-outline"
                      }
                      size={20}
                      color={inactive ? "#16A34A" : "#EF4444"}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />

        <TouchableOpacity
          style={[m.saveBtn, { backgroundColor: "#6B7280", marginTop: 12 }]}
          onPress={closeModal}
        >
          <Text style={m.saveBtnText}>Tutup</Text>
        </TouchableOpacity>
      </Sheet>

      {/* ── Modal: Ubah Nama Pengguna (admin) ── */}
      <Sheet
        visible={activeModal === "rename"}
        title="Ubah Nama Pengguna"
        onClose={backToUsers}
      >
        <View>
          <Text style={m.label}>Email</Text>
          <Text style={m.readonly}>{editTarget?.email}</Text>
        </View>

        <View>
          <Text style={m.label}>
            Nama <Text style={{ color: BRAND }}>*</Text>
          </Text>
          <TextInput
            style={m.input}
            placeholder="Nama pengguna"
            placeholderTextColor="#9CA3AF"
            value={editName}
            onChangeText={setEditName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSimpanNama}
          />
        </View>

        <SubmitButton
          label="Simpan Nama"
          icon="checkmark-circle-outline"
          loading={renaming}
          onPress={handleSimpanNama}
        />
      </Sheet>

      {/* ── Modal: Ubah Password ── */}
      <Sheet
        visible={activeModal === "password"}
        title="Ubah Password"
        onClose={closeModal}
      >
        {passwordFields.map((field, index) => (
          <View key={field.label}>
            <Text style={m.label}>
              {field.label} <Text style={{ color: BRAND }}>*</Text>
            </Text>
            <View style={m.passWrap}>
              <TextInput
                style={m.passInput}
                placeholder={field.placeholder}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!field.show}
                autoCapitalize="none"
                autoCorrect={false}
                value={field.val}
                onChangeText={field.set}
                returnKeyType={
                  index === passwordFields.length - 1 ? "done" : "next"
                }
                onSubmitEditing={
                  index === passwordFields.length - 1
                    ? handleSimpanPassword
                    : undefined
                }
              />
              <TouchableOpacity
                onPress={() => field.toggle(!field.show)}
                hitSlop={8}
              >
                <Ionicons
                  name={field.show ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <SubmitButton
          label="Simpan Password"
          icon="checkmark-circle-outline"
          loading={changing}
          onPress={handleSimpanPassword}
        />
      </Sheet>

      {/* ── Modal: Buat Akun Baru ── */}
      <Sheet
        visible={activeModal === "create"}
        title="Buat Akun Baru"
        onClose={closeModal}
      >
        <View>
          <Text style={m.label}>
            Nama <Text style={{ color: BRAND }}>*</Text>
          </Text>
          <TextInput
            style={m.input}
            placeholder="Nama pengguna"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>

        <View>
          <Text style={m.label}>
            Email <Text style={{ color: BRAND }}>*</Text>
          </Text>
          <TextInput
            style={m.input}
            placeholder="Email aktif"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
        </View>

        <View>
          <Text style={m.label}>
            Password <Text style={{ color: BRAND }}>*</Text>
          </Text>
          <View style={m.passWrap}>
            <TextInput
              style={m.passInput}
              placeholder={`Minimal ${MIN_PASSWORD} karakter`}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text style={m.label}>Role</Text>
          <View style={m.roleRow}>
            {ROLE_OPTIONS.map((r) => {
              const rc = roleColor(r);
              const selected = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
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
        </View>

        <SubmitButton
          label="Buat Akun"
          icon="person-add-outline"
          loading={adding}
          onPress={handleBuatAkun}
        />
      </Sheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 10 : 14,
    paddingBottom: 14,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  sheetBody: { gap: 10, paddingBottom: 4 },
  sheetBodyFixed: { flexShrink: 1 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
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
  readonly: {
    fontSize: 14,
    color: "#6B7280",
    paddingVertical: 4,
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
  separator: { height: 1, backgroundColor: "#F3F4F6" },
  empty: { textAlign: "center", color: "#9CA3AF", paddingVertical: 24 },
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
  inactiveText: { fontSize: 11, color: "#EF4444", marginTop: 1 },
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
