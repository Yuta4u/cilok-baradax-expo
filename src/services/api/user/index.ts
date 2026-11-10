import { ToastError } from "../../../utils/toast";
import { API_URL } from "../../../../constant";
import { useAuthStore } from "../../../utils/authStore";

export async function SignInApi({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Response> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();

  if (!res.ok) {
    ToastError(
      data.message || "Something went wrong, please try again letter.",
    );
    throw new Error(data.message);
  }

  return data;
}

export async function getAllUserApi() {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/user/all`, {
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

export async function addUserApi(payload: AddUser) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/user`, {
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

export async function changePassword(payload: {
  id: string;
  password: string;
}) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/user/change-password`, {
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

export async function updateUser(payload: { id: string; name: string }) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/user/update`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log(res, "xxxxxxxxx1asdasdasd");

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}

export async function setActiveApi(payload: { id: string; active: number }) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${API_URL}/user/active/${payload.id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ active: payload.active }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    ToastError(data.message || "Something went wrong, please try again later.");
    throw new Error(data.message);
  }

  return data;
}
