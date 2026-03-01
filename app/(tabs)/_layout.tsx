import { Tabs } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabLayout() {
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
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={"home-sharp"} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
