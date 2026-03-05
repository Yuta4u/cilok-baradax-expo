import { API_URL_DEV } from "../../../../constant";
import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

export async function addCashFlow(payload: AddCashFlow) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`http://192.168.1.4:3000/api/cash-flow`, {
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

export async function getAllCashFlowApi(payload: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `http://192.168.1.4:3000/api/cash-flow?page=${payload.page}&limit=10&type=${payload.type}`,
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
