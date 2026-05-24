import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

export async function getAllProductApi() {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/product`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function getAllProductBApi() {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/product`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}
