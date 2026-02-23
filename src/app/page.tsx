import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("fd_token");

  if (token?.value) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

