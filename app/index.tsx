import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../src/utils/authStore";
import { useProfileQuery } from "../src/services/queries/(auth)/profile.query";

export default function Index() {
  const { isLoggedIn, accessToken } = useAuthStore();
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const { data } = useProfileQuery(accessToken);

  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isLoggedIn && data) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/sign-in" />;
}
