import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../../src/utils/authStore";

export default function Logout() {
  const { logout } = useAuthStore();
  useEffect(() => {
    const doLogout = async () => {
      // hapus token / session
      // contoh:
      // await AsyncStorage.removeItem('token');

      router.replace("/sign-in");
      logout();
    };

    doLogout();
  }, []);

  return null;
}
