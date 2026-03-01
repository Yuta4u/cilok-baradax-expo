import { useSuspenseQuery } from "@tanstack/react-query";
import { API_URL_DEV } from "../../../../constant";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useProfileQuery = (token: string | null) => {
  const query = useSuspenseQuery({
    queryKey: ["auth:profile"],
    queryFn: async () => {
      const [ok, response] = (await fetch(`${API_URL_DEV}/api/auth/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => [res.ok, res.json()])) as any;

      return response;
    },
    refetchInterval: 60 * 1000,
    retry: false,
  });

  return query;
};
