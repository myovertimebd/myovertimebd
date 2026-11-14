"use client";

import { useState } from "react";
import { useAppContext } from "../AppContext";

export default function CloudBackup() {
  const {
    uid,
    isLoaded,
    settings,
    entries,
    importBackupData,
    adoptUid,
  } = useAppContext();

  const [restoreUid, setRestoreUid] = useState("");
  const [busy, setBusy] = useState(false);

  async function cloudRequest(payload) {
    const response = await fetch("/api/cloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Cloud service unavailable.");
    }

    return result;
  }

  async function copyUid() {
    if (!uid) return;

    try {
      await navigator.clipboard.writeText(uid);
      alert("UID কপি হয়েছে!");
    } catch {
      alert("আপনার UID: " + uid);
    }
  }

  async function restoreCloud() {
    const targetUid = restoreUid.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(targetUid)) {
      alert("সঠিক ৬ অক্ষরের UID লিখুন।");
      return;
    }

    if (!confirm("এই ফোনের বর্তমান Settings ও Entries পরিবর্তিত হবে। Restore করবেন?")) {
      return;
    }

    setBusy(true);

    try {
      const result = await cloudRequest({
        action: "restore",
        uid: targetUid,
      });

      const imported = importBackupData({
        app: "My Overtime",
        settings: result.settings,
        entries: result.entries,
      });

      if (!imported.success) {
        throw new Error(imported.message);
      }

      adoptUid(targetUid);
      alert("Restore Successful! ডেটা ও UID এই ফোনে সেভ হয়েছে।");
    } catch (error) {
      alert("Restore Failed: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function syncCloud() {
    if (!uid) {
      alert("আপনার UID এখনো তৈরি হয়নি।");
      return;
    }

    if (!confirm("বর্তমান ফোনের Settings ও Entries দিয়ে Cloud Backup আপডেট করবেন?")) {
      return;
    }

    setBusy(true);

    try {
      const result = await cloudRequest({
        action: "sync",
        uid,
        settings,
        entries,
      });

      alert(result.message || "Cloud Sync Successful!");
    } catch (error) {
      alert("Cloud Sync Failed: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  const buttonStyle = {
    padding: "12px",
    border: 0,
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "bold",
    background: "#087f65",
    cursor: "pointer",
    opacity: busy ? 0.6 : 1,
  };

  return (
    <div
      className="glass-card"
      style={{
        background: "rgba(0,120,100,0.10)",
        border: "1px solid rgba(0,180,140,0.35)",
        padding: "16px",
        borderRadius: "12px",
        marginBottom: "22px",
      }}
    >
      <div style={{ color: "#45d6ad", fontWeight: "bold", marginBottom: "8px" }}>
        ☁️ Cloud Backup & Device Restore
      </div>

      <p style={{ color: "#ccc", fontSize: "0.82rem", lineHeight: 1.6 }}>
        আপনার ৬ অক্ষরের UID দিয়ে অন্য ফোনেও নিজের ডেটা Restore করতে পারবেন।
      </p>

      <div style={{ margin: "14px 0", padding: "14px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
        <div style={{ color: "#45d6ad", fontWeight: "bold", marginBottom: "8px" }}>
          🆔 My Permanent UID
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          <strong style={{ color: "#fff", fontSize: "1.5rem", letterSpacing: "4px" }}>
            {!isLoaded ? "......" : uid || "Unavailable"}
          </strong>

          <button type="button" onClick={copyUid} disabled={!uid || busy} style={buttonStyle}>
            Copy UID
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={busy || !uid}
        onClick={syncCloud}
        style={{ ...buttonStyle, width: "100%", marginBottom: "18px", background: "#2563eb" }}
      >
        {busy ? "Please wait..." : "Cloud Sync"}
      </button>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "16px" }}>
        <div style={{ color: "#45d6ad", fontWeight: "bold", marginBottom: "8px" }}>
          Restore From Another Device
        </div>

        <label style={{ display: "block", color: "#ddd", marginBottom: "6px" }}>
          6-Character UID
        </label>

        <input
          type="text"
          value={restoreUid}
          onChange={(e) => setRestoreUid(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          maxLength={6}
          autoComplete="off"
          placeholder="Enter your UID"
          disabled={busy}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px",
            marginBottom: "12px",
            background: "#111",
            color: "#fff",
            border: "1px solid #45d6ad",
            borderRadius: "8px",
            letterSpacing: "3px",
            fontSize: "1.1rem",
          }}
        />

        <button
          type="button"
          disabled={busy || restoreUid.length !== 6}
          onClick={restoreCloud}
          style={{ ...buttonStyle, width: "100%", background: "#555" }}
        >
          {busy ? "Please wait..." : "Restore My Data"}
        </button>
      </div>

      <p style={{ color: "#999", fontSize: "0.75rem", marginTop: "12px" }}>
        বর্তমান ফোনে সংরক্ষিত এন্ট্রি: {entries.length}
      </p>

      <p style={{ color: "#e5b85c", fontSize: "0.72rem", lineHeight: 1.5 }}>
        সতর্কতা: UID যার কাছে থাকবে, সে আপনার Cloud ডেটা দেখতে ও পরিবর্তন করতে পারবে।
      </p>
    </div>
  );
}
