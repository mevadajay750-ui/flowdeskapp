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

  const isProduction = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true });

  if (status === "approved") {
    response.cookies.set("fd_token", uid, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });

    response.cookies.set("fd_status", status, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });

    response.cookies.set("fd_role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("fd_token", "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("fd_status", "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("fd_role", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

