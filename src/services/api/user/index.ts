import { ToastError } from "../../../utils/toast";
import { useAuthStore } from "../../../utils/authStore";

export async function SignInApi({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Response> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
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

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/all`, {
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

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user`, {
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

export async function setActiveApi(payload: { id: string; active: number }) {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/user/active/${payload.id}`,
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
