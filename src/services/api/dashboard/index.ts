import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";
import { API_URL } from "../../../../constant";
import { fetch as fetchBuffer } from "expo/fetch";

export async function getHistory(query: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const params = new URLSearchParams();

  if (query.sd) {
    params.append("sd", query.sd);
  }

  if (query.ed) {
    params.append("ed", query.ed);
  }

  const res = await fetch(
    `${API_URL}/cash-flow/history?${params.toString()}`,
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

export async function getHistoryExcel(query: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const params = new URLSearchParams();

  if (query.sd) {
    params.append("sd", query.sd);
  }

  if (query.ed) {
    params.append("ed", query.ed);
  }

  const res = await fetchBuffer(
    `${API_URL}/cash-flow/history/excel?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    ToastError(
      data?.message || "Something went wrong, please try again later.",
    );

    throw new Error(data?.message);
  }

  return await res.bytes();
}

export async function getCabangToday() {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow/cabang/today`, {
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

export async function getDashboard(query: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const params = new URLSearchParams();

  if (query.sd) {
    params.append("sd", query.sd);
  }

  if (query.ed) {
    params.append("ed", query.ed);
  }

  const res = await fetch(
    `${API_URL}/cash-flow/dashboard?${params.toString()}`,
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

export async function addCashFlow(payload: AddCashFlow) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow`, {
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

export async function approvalCashFlow(payload: AddCashFlow) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow/approval`, {
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

export async function getAllCashFlowApi(payload: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${API_URL}/cash-flow?page=${payload.page}&limit=10&type=${payload.type}`,
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

  const res = await fetch(`${API_URL}/cash-flow/${id}`, {
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

export async function getViewCashFlowApi(id?: string) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow/view/${id}`, {
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

export async function addReportApi(payload: AddReport) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow/report`, {
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

export async function getDetailById(id: string) {
  const { accessToken } = useAuthStore.getState();

  console.log("hot");

  const res = await fetch(`${API_URL}/cash-flow/detail/${id}`, {
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

export async function confirmReportApi(payload: ConfirmReport) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow/confirm`, {
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

export async function submitCashFlow(payload: any) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/cash-flow/submit`, {
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
