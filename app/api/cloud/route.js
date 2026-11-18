import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { status: "unavailable", message: "Legacy cloud sync is disabled until authenticated user-owned storage is implemented." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
export async function OPTIONS() { return new Response(null, { status: 204 }); }
