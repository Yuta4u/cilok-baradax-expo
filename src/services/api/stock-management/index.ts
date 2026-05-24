import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

export async function getAllKaryawanApi() {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/user/karyawan`,
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

export async function updateStockCilokApi(payload: UpdateStockCilok) {
  const { accessToken } = useAuthStore.getState();

  console.log(payload, "test");

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/user/stock-cilok/${payload.id}`,
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

export async function addCashFlow(payload: AddCashFlow) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/cash-flow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  console.log(data, "data");

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}
