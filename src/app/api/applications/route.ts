import { NextResponse } from "next/server";

/** Public listing disabled — students access only via verified session. */
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
