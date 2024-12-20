import { NextResponse, NextRequest } from "next/server";
import { adminAuth } from "@/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const user = await adminAuth.getUser(uid);
    return NextResponse.json({ emailVerified: user.emailVerified });
  } catch (error) {
    console.error("Error verifying email status:", error);
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}