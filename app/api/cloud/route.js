import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_SECONDS = 900;

function reply(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SERVER_CONFIG_MISSING");
  return { url: url.replace(/\/$/, ""), key };
}

function hashKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function dbRequest(path, method = "GET", body, prefer = "") {
  const { url, key } = config();

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DATABASE_ERROR_${response.status}`);
  }

  if (response.status === 204) return [];

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

async function rateAllowed(identifier, limit) {
  const result = await dbRequest(
    "rpc/check_cloud_rate_limit",
    "POST",
    {
      p_key_hash: hashKey(identifier),
      p_limit: limit,
      p_window_seconds: WINDOW_SECONDS,
    }
  );

  return result === true;
}

function getClientIp(request) {
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  return ip.slice(0, 100);
}

function validData(settings, entries) {
  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings) ||
    !Array.isArray(entries) ||
    entries.length > 10000
  ) {
    return false;
  }

  try {
    return (
      Buffer.byteLength(JSON.stringify(settings), "utf8") <= 100000 &&
      Buffer.byteLength(JSON.stringify(entries), "utf8") <= 1000000
    );
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const raw = await request.text();

    if (Buffer.byteLength(raw, "utf8") > 1200000) {
      return reply({ error: "ডেটার আকার অনেক বড়।" }, 413);
    }

    let body;

    try {
      body = JSON.parse(raw);
    } catch {
      return reply({ error: "সঠিক JSON পাঠানো হয়নি।" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply({ error: "সঠিক তথ্য পাঠানো হয়নি।" }, 400);
    }

    const uid = String(body.uid || "").trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(uid)) {
      return reply({ error: "৬ অক্ষরের সঠিক UID দিন।" }, 400);
    }

    if (!["sync", "restore"].includes(body.action)) {
      return reply({ error: "অজানা অনুরোধ।" }, 400);
    }

    const uidAllowed = await rateAllowed(`cloud:uid:${uid}`, 8);
    const ip = getClientIp(request);
    const ipAllowed = ip
      ? await rateAllowed(`cloud:ip:${ip}`, 40)
      : true;

    if (!uidAllowed || !ipAllowed) {
      return reply(
        { error: "অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।" },
        429
      );
    }

    const registered = await dbRequest(
      `uid_registry?uid=eq.${encodeURIComponent(uid)}&select=uid`
    );

    if (!registered.length) {
      return reply({ error: "এই UID নিবন্ধিত নয়।" }, 404);
    }

    if (body.action === "restore") {
      const rows = await dbRequest(
        `uid_cloud_data?uid=eq.${encodeURIComponent(uid)}&select=settings,entries`
      );

      if (!rows.length) {
        return reply(
          { error: "এই UID-তে কোনো Cloud Backup নেই।" },
          404
        );
      }

      if (!validData(rows[0].settings, rows[0].entries)) {
        return reply({ error: "Cloud Backup ডেটা সঠিক নয়।" }, 500);
      }

      return reply({
        success: true,
        settings: rows[0].settings,
        entries: rows[0].entries,
        message: "ডেটা পুনরুদ্ধার হয়েছে।",
      });
    }

    if (!validData(body.settings, body.entries)) {
      return reply({ error: "Backup ডেটা সঠিক নয়।" }, 400);
    }

    await dbRequest(
      "uid_cloud_data?on_conflict=uid",
      "POST",
      {
        uid,
        settings: body.settings,
        entries: body.entries,
        updated_at: new Date().toISOString(),
      },
      "resolution=merge-duplicates,return=minimal"
    );

    return reply({
      success: true,
      message: "Cloud Backup সফলভাবে আপডেট হয়েছে।",
    });
  } catch (error) {
    console.error("Cloud API error:", error.message);

    return reply({
      error:
        error.message === "SERVER_CONFIG_MISSING"
          ? "Server configuration missing."
          : "Cloud service সাময়িকভাবে unavailable।",
    }, 503);
  }
}
