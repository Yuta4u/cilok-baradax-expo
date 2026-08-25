import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

// x
export async function getProduct(
  type: "Semua" | "Aman" | "Menipis",
  search?: string,
) {
  const { accessToken } = useAuthStore.getState();
  const params = new URLSearchParams({
    type,
    q: search ?? "",
  });

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/product?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function getAllIngredientApi(q: string) {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/ingredient?q=${q}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function getAllProductApi(q: string) {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/product?q=${q}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function addProduct(payload: AddProduct) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/product`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function updateStockProduct(payload: UpdateStock) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/product/stock`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}
