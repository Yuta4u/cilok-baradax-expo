import { Tabs } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";
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
        tabBarActiveTintColor: "#fff2de",
        tabBarStyle: {
          backgroundColor: "#000000e8",
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
          href: authorized ? "/inventory" : "/(tabs)/dashboard",
        }}
      />
      <Tabs.Screen
        name="stock-management"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"file-tray-sharp"} color={color} size={24} />
          ),
          href: authorized ? "/stock-management" : "/(tabs)/dashboard",
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"home-sharp"} color={color} size={24} />
          ),
          href: authorized ? "/user" : "/(tabs)/dashboard",
        }}
      />
    </Tabs>
  );
}
