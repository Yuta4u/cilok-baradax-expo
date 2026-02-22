import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../src/utils/authStore";

export default function Index() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Tunggu zustand selesai load dari AsyncStorage
  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/sign-in" />;
}
