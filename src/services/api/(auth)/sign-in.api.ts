export async function SignInApi({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const res = await fetch(`http://103.150.191.78:3000/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) console.log();
  return res.json();
}
