"use client";

import { useAppContext } from "../AppContext";

export default function CloudBackup() {
  const { uid, isLoaded } = useAppContext();

  async function copyUid() {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      alert("UID কপি হয়েছে!");
    } catch {
      alert("আপনার UID: " + uid);
    }
  }

  return (
    <div className="glass-card" style={{
      background: "rgba(0,120,100,0.10)",
      border: "1px solid rgba(0,180,140,0.35)",
      padding: "16px",
      borderRadius: "12px",
      marginBottom: "22px",
    }}>
      <div style={{ color: "#45d6ad", fontWeight: "bold", marginBottom: "8px" }}>
        🆔 My Permanent UID
      </div>
      <p style={{ color: "#ccc", fontSize: "0.82rem", lineHeight: 1.6 }}>
        এটি আপনার স্থায়ী পরিচয় নম্বর। একই ফোনে অ্যাপ খুললে UID একই থাকবে।
      </p>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "12px",
        padding: "14px", background: "rgba(0,0,0,0.3)",
        borderRadius: "8px",
      }}>
        <strong style={{ color: "#fff", fontSize: "1.5rem", letterSpacing: "4px" }}>
          {!isLoaded ? "......" : (uid || "Unavailable")}
        </strong>
        <button type="button" onClick={copyUid} disabled={!uid}
          style={{
            padding: "10px 14px", border: 0, borderRadius: "7px",
            background: "#087f65", color: "#fff", fontWeight: "bold",
          }}>
          Copy UID
        </button>
      </div>
      <p style={{ color: "#999", fontSize: "0.72rem", marginTop: "10px" }}>
        অ্যাপের ডেটা মুছে ফেললে Local UID হারাতে পারে।
      </p>
    </div>
  );
}
