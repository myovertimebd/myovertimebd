"use client";

import { useState } from "react";
import { useAppContext } from "../AppContext";

export default function CloudBackup() {
  const { settings, entries, importBackupData, showDialog } = useAppContext();

  const [uid, setUid] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [credentials, setCredentials] = useState(null);
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
      throw new Error(result.error || "Cloud request failed.");
    }

    return result;
  }

  async function createAccount() {
    const confirmed = await showDialog({
      title: "Create Cloud Account",
      message: "এই ফোনের বর্তমান Settings ও Overtime Entries ক্লাউডে আপলোড হবে। এগিয়ে যাবে?",
      type: "info",
    });

    if (!confirmed) return;

    setBusy(true);
    setCredentials(null);

    try {
      const result = await cloudRequest({
        action: "create",
        settings,
        entries,
      });

      setUid(result.uid);
      setRecoveryCode(result.recoveryCode);

      setCredentials({
        uid: result.uid,
        recoveryCode: result.recoveryCode,
      });

      await showDialog({
        title: "Cloud Account Created",
        message: "UID ও Recovery Code নিরাপদ জায়গায় লিখে রাখো। Recovery Code পরে আবার দেখানো হবে না।",
        type: "success",
      });
    } catch (error) {
      await showDialog({
        title: "Account Creation Failed",
        message: error.message,
        type: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function syncCloud() {
    if (!uid.trim() || !recoveryCode.trim()) {
      await showDialog({
        title: "Information Required",
        message: "UID এবং Recovery Code দুটোই দিতে হবে।",
        type: "danger",
      });
      return;
    }

    const confirmed = await showDialog({
      title: "Update Cloud Backup",
      message: "এই ফোনের বর্তমান Settings ও Entries দিয়ে ক্লাউডের পুরোনো Backup প্রতিস্থাপন হবে। আগে JSON Backup রেখে তারপর এগোও।",
      type: "danger",
    });

    if (!confirmed) return;

    setBusy(true);

    try {
      const result = await cloudRequest({
        action: "sync",
        uid,
        recoveryCode,
        settings,
        entries,
      });

      await showDialog({
        title: "Cloud Sync Successful",
        message: result.message || "Cloud backup updated.",
        type: "success",
      });
    } catch (error) {
      await showDialog({
        title: "Cloud Sync Failed",
        message: error.message,
        type: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function restoreCloud() {
    if (!uid.trim() || !recoveryCode.trim()) {
      await showDialog({
        title: "Information Required",
        message: "UID এবং Recovery Code দুটোই দিতে হবে।",
        type: "danger",
      });
      return;
    }

    const confirmed = await showDialog({
      title: "Restore Cloud Backup",
      message: "বর্তমান ফোনের Settings ও Entries ক্লাউডের Backup দিয়ে প্রতিস্থাপন হবে। আগে JSON Backup রেখে এগোও।",
      type: "danger",
    });

    if (!confirmed) return;

    setBusy(true);

    try {
      const result = await cloudRequest({
        action: "restore",
        uid,
        recoveryCode,
      });

      const imported = importBackupData({
        app: "My Overtime",
        settings: result.settings,
        entries: result.entries,
      });

      await showDialog({
        title: imported.success ? "Restore Successful" : "Restore Failed",
        message: imported.message,
        type: imported.success ? "success" : "danger",
      });
    } catch (error) {
      await showDialog({
        title: "Restore Failed",
        message: error.message,
        type: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

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
        UID ও Recovery Code ব্যবহার করে অন্য ফোনেও নিজের ডেটা Restore করতে পারবে।
        Recovery Code ছাড়া কেউ অ্যাকাউন্টে প্রবেশ করতে পারবে না।
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={createAccount}
        style={{
          width: "100%",
          padding: "12px",
          margin: "10px 0",
          border: 0,
          borderRadius: "8px",
          background: "#087f65",
          color: "#fff",
          fontWeight: "bold",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Please wait..." : "Create New Cloud Account"}
      </button>

      {credentials && (
        <div
          style={{
            padding: "12px",
            marginBottom: "14px",
            border: "1px solid #45d6ad",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <p style={{ color: "#45d6ad", fontWeight: "bold" }}>
            Save these credentials now
          </p>
          <p style={{ color: "#fff", fontSize: "0.85rem" }}>
            UID: {credentials.uid}
          </p>
          <p style={{ color: "#fff", fontSize: "0.85rem", overflowWrap: "anywhere" }}>
            Recovery Code: {credentials.recoveryCode}
          </p>
          <p style={{ color: "#ffcc66", fontSize: "0.75rem" }}>
            এই Recovery Code আর দেখানো হবে না। নিরাপদে লিখে রাখো।
          </p>
        </div>
      )}

      <label style={{ display: "block", color: "#ddd", marginBottom: "6px" }}>
        6-Digit UID
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={uid}
        onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Enter your UID"
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "12px",
          background: "#111",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "7px",
        }}
      />

      <label style={{ display: "block", color: "#ddd", marginBottom: "6px" }}>
        Recovery Code
      </label>
      <input
        type="text"
        autoComplete="off"
        maxLength={32}
        value={recoveryCode}
        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 32))}
        placeholder="Enter 32-character Recovery Code"
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "14px",
          background: "#111",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "7px",
        }}
      />

      <div style={{ display: "flex", gap: "9px" }}>
        <button
          type="button"
          disabled={busy}
          onClick={syncCloud}
          style={{
            flex: 1,
            padding: "11px 5px",
            background: "#2563eb",
            color: "#fff",
            border: 0,
            borderRadius: "7px",
            fontWeight: "bold",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Cloud Sync
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={restoreCloud}
          style={{
            flex: 1,
            padding: "11px 5px",
            background: "#555",
            color: "#fff",
            border: 0,
            borderRadius: "7px",
            fontWeight: "bold",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Restore
        </button>
      </div>

      <p style={{ color: "#999", fontSize: "0.72rem", marginTop: "12px" }}>
        বর্তমান ফোনে সংরক্ষিত এন্ট্রি: {entries.length}
      </p>
    </div>
  );
}
