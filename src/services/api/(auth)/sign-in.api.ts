import { ToastError } from "../../../utils/toast";

export async function SignInApi({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Response> {
  console.log(process.env.EXPO_PUBLIC_API_URL, "testx");

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
