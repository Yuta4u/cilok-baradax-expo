import { Tabs } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAuthStore } from "../../src/utils/authStore";
import { hasPermission } from "../../src/utils/permissions";

export default function TabLayout() {
  const { user } = useAuthStore.getState();

  const authorized =
    hasPermission(user!.permission, "SUPER_USER") ||
    hasPermission(user!.permission, "ADMIN");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#B94A1A",
        tabBarStyle: {
          backgroundColor: "#fdfdfde8",
          borderTopColor: "#fff2de",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"podium-sharp"} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"file-tray-sharp"} color={color} size={24} />
          ),
          href: authorized ? "/inventory" : null, // BARU: null = hilang dari tab bar
        }}
      />
      <Tabs.Screen
        name="stock-management"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"file-tray-sharp"} color={color} size={24} />
          ),
          href: authorized ? "/stock-management" : null, // BARU
        }}
      />
      <Tabs.Screen
        name="stock-log"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"time-sharp"} color={color} size={24} />
          ),
          href: authorized ? "/stock-log" : null, // BARU
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"home-sharp"} color={color} size={24} />
          ),
          href: authorized ? "/user" : null, // BARU

          // selalu tampil untuk semua role — tidak diubah
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="logout" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
