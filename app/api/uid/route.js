import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { status: "unavailable", message: "Legacy UID registration is disabled until secure account authentication is implemented." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST() { return unavailable(); }
