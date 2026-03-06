import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

export async function getAllKaryawanApi() {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`http://192.168.60.107:3000/api/user/karyawan`, {
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

  console.log(payload, "test");

  const res = await fetch(
    `http://192.168.60.107:3000/api/user/stock-cilok/${payload.id}`,
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
