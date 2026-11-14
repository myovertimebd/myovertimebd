
import { NextResponse } from "next/server";
import { randomInt, createHash } from "node:crypto";

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

async function dbRequest(path, method = "GET", body) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 409) return false;
    throw new Error(`DATABASE_ERROR_${response.status}`);
  }

  return true;
}

async function rateAllowed(identifier, limit) {
  const { url, key } = config();
  const hash = createHash("sha256").update(identifier).digest("hex");

  const response = await fetch(`${url}/rest/v1/rpc/check_cloud_rate_limit`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_key_hash: hash,
      p_limit: limit,
      p_window_seconds: 900,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("RATE_LIMIT_SERVICE_ERROR");
  return (await response.json()) === true;
}

function getClientIp(request) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  ).slice(0, 100);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply({ error: "Invalid request." }, 400);
    }

    const ip = getClientIp(request);

    if (ip && !(await rateAllowed(`uid:ip:${ip}`, 10))) {
      return reply({ error: "অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।" }, 429);
    }

    // Existing UID: verify it exists; never register or claim it here.
    if (body.uid !== undefined) {
      const uid = String(body.uid).trim().toUpperCase();

      if (!/^[A-Z0-9]{6}$/.test(uid)) {
        return reply({ error: "Invalid UID." }, 400);
      }

      const { url, key } = config();
      const response = await fetch(
        `${url}/rest/v1/uid_registry?uid=eq.${encodeURIComponent(uid)}&select=uid`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) throw new Error("DATABASE_ERROR");
      const rows = await response.json();

      if (!rows.length) {
        return reply({ error: "UID নিবন্ধিত নয়।" }, 404);
      }

      return reply({ success: true, uid });
    }

    // New UID: generate a random one and reserve it once.
    for (let i = 0; i < 12; i++) {
      const uid = makeUid();
      const created = await dbRequest("uid_registry", "POST", { uid });

      if (created) {
        return reply({ success: true, uid }, 201);
      }
    }

    return reply({ error: "UID তৈরি করা যায়নি। আবার চেষ্টা করুন।" }, 503);
  } catch (error) {
    console.error("UID API error:", error.message);

    return reply({
      error: error.message === "SERVER_CONFIG_MISSING"
        ? "Server configuration missing."
        : "UID service temporarily unavailable.",
    }, 503);
  }
}
