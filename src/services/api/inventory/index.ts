import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";
import { API_URL } from "../../../../constant";

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
    `${API_URL}/product?${params.toString()}`,
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
  const res = await fetch(`${API_URL}/ingredient?q=${q}`, {
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

export async function getAllProductApi(q: string) {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${API_URL}/product?q=${q}`, {
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

export async function addProduct(payload: AddProduct) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/product`, {
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

  const res = await fetch(`${API_URL}/product/stock`, {
    method: "PUT",
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

export async function editStockProduct(payload: EditStock) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/product/edit-stock`, {
    method: "PUT",
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
