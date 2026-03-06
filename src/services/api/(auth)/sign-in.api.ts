import { API_URL_DEV } from "../../../../constant";
import { ToastError } from "../../../utils/toast";

export async function SignInApi({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Response> {
  const res = await fetch(`http://192.168.60.107:3000/api/auth/login`, {
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
