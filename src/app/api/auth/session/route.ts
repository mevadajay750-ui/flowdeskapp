import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const uid = body?.uid as string | undefined;
  const role = body?.role as string | undefined;
  const status = body?.status as string | undefined;

  if (!uid || !role || !status) {
    return NextResponse.json(
      { error: "uid, role and status are required." },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const isProduction = process.env.NODE_ENV === "production";

  if (status === "approved") {
    cookieStore.set("fd_token", uid, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });

    cookieStore.set("fd_status", status, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });

    cookieStore.set("fd_role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const cookieStore = cookies();

  cookieStore.delete("fd_token");
  cookieStore.delete("fd_status");
  cookieStore.delete("fd_role");

  return NextResponse.json({ success: true });
}

