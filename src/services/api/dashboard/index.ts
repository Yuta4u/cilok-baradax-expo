import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

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

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function getAllCashFlowApi(payload: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/cash-flow?page=${payload.page}&limit=10&type=${payload.type}`,
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

export async function getCashFlowByIdApi(id?: string) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/cash-flow/${id}`,
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

export async function getViewCashFlowApi(id?: string) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/cash-flow/view/${id}`,
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

export async function addReportApi(payload: AddReport) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/cash-flow/report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await res.json();
  console.log(data, "test");

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }
  return data;
}

export async function confirmReportApi(payload: ConfirmReport) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/cash-flow/confirm`,
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
