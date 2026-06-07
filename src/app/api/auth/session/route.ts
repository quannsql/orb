import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-api";

export async function GET() {
  try {
    const user = await getSession();
    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("[Session API] Error:", err);
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}
