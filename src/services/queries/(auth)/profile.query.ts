import { useQuery } from "@tanstack/react-query";
import { API_URL_DEV } from "../../../../constant";

export const useProfileQuery = (accessToken: string | null) => {
  return useQuery({
    queryKey: ["auth:profile", accessToken],
    queryFn: async () => {
      const res = await fetch(`http://192.168.1.4:3000/api/auth/profile`, {
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
