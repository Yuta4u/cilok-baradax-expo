import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

export async function getCabang() {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`https://baradax.online/api/user/cabang`, {
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

export async function updateStockCilokApi(payload: UpdateStockCilok) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `https://baradax.online/api/user/stock-cilok/${payload.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ quantity: payload.quantity }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function getCabangToday() {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`https://baradax.online/api/cash-flow/cabang/today`, {
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

export async function addCashFlow(payload: AddCashFlow) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`https://baradax.online/api/cash-flow`, {
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

export async function getCashFlowDetail(id: string) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `https://baradax.online/api/cash-flow/cabang/today/detail/${id}`,
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

export async function updateCashFlowItem(payload: Record<string, number>) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`https://baradax.online/api/cash-flow-item/stock`, {
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
