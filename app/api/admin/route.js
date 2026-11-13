import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function unavailable() {
  return NextResponse.json(
    { status: 'unavailable', message: 'Admin API is disabled until the new authentication and database are configured.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
