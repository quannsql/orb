import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("orb_session");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Logout API] Error:", err);
    return NextResponse.json({ error: "Logout failed", details: err.message }, { status: 500 });
  }
}
