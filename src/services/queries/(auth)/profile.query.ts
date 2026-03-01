import { useQuery } from "@tanstack/react-query";
import { API_URL_DEV } from "../../../../constant";

export const useProfileQuery = (accessToken: string | null) => {
  return useQuery({
    queryKey: ["auth:profile", accessToken],
    queryFn: async () => {
      const res = await fetch(`${API_URL_DEV}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Unauthorized");
      }

      return res.json();
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    enabled: !!accessToken,
  });
};
