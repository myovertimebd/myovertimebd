import { NextResponse } from "next/server";
import {
  randomBytes,
  randomInt,
  pbkdf2,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";

const hashPassword = promisify(pbkdf2);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const WINDOW_SECONDS = 900;
const MAX_BODY_BYTES = 1200000;

function reply(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SERVER_CONFIG_MISSING");
  }

  return { url: url.replace(/\/$/, ""), key };
}

async function dbRequest(path, method = "GET", body) {
  const { url, key } = getConfig();

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("CONFLICT");
    }
    throw new Error("DATABASE_ERROR");
  }

  return response.status === 204 ? [] : response.json();
}

function getClientIp(request) {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 100);

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim().slice(0, 100);
  }

  return "unknown";
}

async function checkRateLimit(identifier, limit) {
  const { key } = getConfig();

  const keyHash = createHmac("sha256", key)
    .update(identifier)
    .digest("hex");

  const result = await dbRequest(
    "rpc/check_cloud_rate_limit",
    "POST",
    {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: WINDOW_SECONDS,
    }
  );

  return result === true;
}

async function makeHash(code, salt) {
  return (
    await hashPassword(
      code,
      Buffer.from(salt, "hex"),
      ITERATIONS,
      KEY_LENGTH,
      "sha256"
    )
  ).toString("hex");
}

async function verifyCode(code, salt, storedHash) {
  const actual = Buffer.from(await makeHash(code, salt), "hex");
  const expected = Buffer.from(storedHash, "hex");

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

function validData(settings, entries) {
  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings) ||
    !Array.isArray(entries)
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
    const contentLength = Number(
      request.headers.get("content-length") || 0
    );

    if (contentLength > MAX_BODY_BYTES) {
      return reply({ error: "Request is too large." }, 413);
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return reply({ error: "JSON content type required." }, 415);
    }

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return reply({ error: "Invalid request." }, 400);
    }

    const action = body.action;

    if (!["create", "sync", "restore"].includes(action)) {
      return reply({ error: "Unknown action." }, 400);
    }

    const ip = getClientIp(request);

    // Limit account creation attempts by client IP.
    if (action === "create") {
      const allowed = await checkRateLimit(`create:${ip}`, 3);

      if (!allowed) {
        return reply(
          { error: "Too many account creation attempts. Try again later." },
          429
        );
      }

      if (!validData(body.settings, body.entries)) {
        return reply({ error: "Invalid backup data." }, 400);
      }

      const recoveryCode = randomBytes(16)
        .toString("hex")
        .toUpperCase();

      const salt = randomBytes(16).toString("hex");
      const recoveryHash = await makeHash(recoveryCode, salt);

      for (let attempt = 0; attempt < 5; attempt++) {
        const uid = String(randomInt(100000, 1000000));

        try {
          await dbRequest("app_accounts", "POST", {
            uid,
            recovery_salt: salt,
            recovery_hash: recoveryHash,
            settings: body.settings,
            entries: body.entries,
          });

          return reply(
            {
              success: true,
              uid,
              recoveryCode,
              message: "Account created. Save your Recovery Code safely.",
            },
            201
          );
        } catch (error) {
          if (error.message !== "CONFLICT") throw error;
        }
      }

      return reply(
        { error: "Could not create account. Try again." },
        503
      );
    }

    const uid = String(body.uid || "");
    const recoveryCode = String(body.recoveryCode || "")
      .trim()
      .toUpperCase();

    if (
      !/^[0-9]{6}$/.test(uid) ||
      !/^[A-F0-9]{32}$/.test(recoveryCode)
    ) {
      return reply(
        { error: "UID or Recovery Code is incorrect." },
        401
      );
    }

    // Limit attempts by both client IP and account UID.
    const ipAllowed = await checkRateLimit(`access-ip:${ip}`, 20);
    const uidAllowed = await checkRateLimit(`access-uid:${uid}`, 8);

    if (!ipAllowed || !uidAllowed) {
      return reply(
        { error: "Too many attempts. Try again after 15 minutes." },
        429
      );
    }

    const rows = await dbRequest(
      `app_accounts?uid=eq.${uid}&select=uid,recovery_salt,recovery_hash,settings,entries`
    );

    if (!rows.length) {
      return reply(
        { error: "UID or Recovery Code is incorrect." },
        401
      );
    }

    const account = rows[0];

    const verified = await verifyCode(
      recoveryCode,
      account.recovery_salt,
      account.recovery_hash
    );

    if (!verified) {
      return reply(
        { error: "UID or Recovery Code is incorrect." },
        401
      );
    }

    if (action === "restore") {
      return reply({
        success: true,
        settings: account.settings,
        entries: account.entries,
      });
    }

    if (!validData(body.settings, body.entries)) {
      return reply({ error: "Invalid backup data." }, 400);
    }

    const updated = await dbRequest(
      `app_accounts?uid=eq.${uid}`,
      "PATCH",
      {
        settings: body.settings,
        entries: body.entries,
        updated_at: new Date().toISOString(),
      }
    );

    if (!Array.isArray(updated) || updated.length !== 1) {
      return reply(
        { error: "Cloud backup could not be updated." },
        503
      );
    }

    return reply({
      success: true,
      message: "Cloud backup updated.",
    });
  } catch (error) {
    console.error("Cloud API error:", error.message);

    if (error.message === "SERVER_CONFIG_MISSING") {
      return reply(
        { error: "Cloud service is not configured yet." },
        503
      );
    }

    return reply(
      { error: "Cloud service temporarily unavailable." },
      500
    );
  }
}
