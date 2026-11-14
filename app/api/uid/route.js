import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function reply(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SERVER_CONFIG_MISSING");
  return { url: url.replace(/\/$/, ""), key };
}

function makeUid() {
  return Array.from(
    { length: 6 },
    () => ALPHABET[randomInt(0, ALPHABET.length)]
  ).join("");
}

async function reserve(uid) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/uid_registry`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ uid }),
    cache: "no-store",
  });

  if (response.status === 409) return false;
  if (!response.ok) throw new Error("DATABASE_ERROR");
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.uid !== undefined) {
      const uid = String(body.uid).trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(uid)) {
        return reply({ error: "Invalid UID." }, 400);
      }
      const created = await reserve(uid);
      return reply({ success: true, uid, alreadyRegistered: !created });
    }

    for (let i = 0; i < 12; i++) {
      const uid = makeUid();
      if (await reserve(uid)) return reply({ success: true, uid }, 201);
    }

    return reply({ error: "UID তৈরি করা যায়নি। আবার চেষ্টা করুন।" }, 503);
  } catch (error) {
    console.error("UID API error:", error.message);
    return reply(
      { error: error.message === "SERVER_CONFIG_MISSING"
        ? "Server configuration missing."
        : "UID service temporarily unavailable." },
      503
    );
  }
}
