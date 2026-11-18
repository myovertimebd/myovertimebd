"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../AppContext";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

const cardStyle = {
  background: "rgba(0,120,100,0.10)",
  border: "1px solid rgba(0,180,140,0.35)",
  padding: "15px",
  borderRadius: "18px",
  marginBottom: "18px",
};
const buttonStyle = {
  border: 0, borderRadius: "8px", padding: "11px 14px",
  color: "#fff", background: "#087f65", fontWeight: 700, cursor: "pointer",
};

function entryToRow(entry, userId) {
  const known = new Set(["id", "date", "type", "ot", "tiffin", "night", "friday", "amount"]);
  const extraData = Object.fromEntries(Object.entries(entry).filter(([key]) => !known.has(key)));
  return {
    id: String(entry.id),
    user_id: userId,
    entry_date: entry.date,
    entry_type: entry.type || "work",
    ot_hours: Number(entry.ot) || 0,
    tiffin: Boolean(entry.tiffin),
    night: Boolean(entry.night),
    friday_amount: Number(entry.friday) || 0,
    amount: Number(entry.amount) || 0,
    extra_data: extraData,
  };
}

function rowToEntry(row) {
  return {
    ...(row.extra_data && typeof row.extra_data === "object" ? row.extra_data : {}),
    id: String(row.id),
    type: row.entry_type,
    date: row.entry_date,
    ot: Number(row.ot_hours) || 0,
    tiffin: Boolean(row.tiffin),
    night: Boolean(row.night),
    friday: Number(row.friday_amount) || 0,
    amount: Number(row.amount) || 0,
  };
}

export default function CloudBackup() {
  const { uid, isLoaded, settings, entries, importBackupData, showDialog } = useAppContext();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [cloudSummary, setCloudSummary] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setStatus(error.message);
      setUser(data?.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUser(session?.user || null);
        setCloudSummary(null);
        setStatus(session?.user ? "ইমেইল অ্যাকাউন্টে লগইন হয়েছে। এখন Cloud Backup পরীক্ষা করতে পারো।" : "");
      }
    });
    return () => { alive = false; listener?.subscription?.unsubscribe(); };
  }, [supabase]);

  const refreshCloudSummary = useCallback(async () => {
    if (!supabase || !user) return;
    setBusy(true);
    setStatus("");
    try {
      const [{ data: settingRows, error: settingsError }, { data: entryRows, error: entriesError }] = await Promise.all([
        supabase.from("user_settings").select("settings").eq("user_id", user.id).maybeSingle(),
        supabase.from("overtime_entries").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);
      if (settingsError) throw settingsError;
      if (entriesError) throw entriesError;
      setCloudSummary({ hasSettings: Boolean(settingRows), entriesCount: entryRows?.length || 0 });
      setStatus("Cloud Backup-এর অবস্থা পাওয়া গেছে।");
    } catch (error) {
      setStatus(`Cloud পরীক্ষা করা যায়নি: ${error.message}`);
    } finally { setBusy(false); }
  }, [supabase, user]);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) return refreshCloudSummary();
      return undefined;
    });

    return () => {
      cancelled = true;
    };
  }, [user, refreshCloudSummary]);

  async function sendOtp(event) {
    event.preventDefault();
    if (!supabase) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus("সঠিক ইমেইল ঠিকানা লিখুন।");
      return;
    }
    setBusy(true); setStatus("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmail(normalizedEmail);
      setOtpSent(true);
      setStatus("৬ সংখ্যার OTP ইমেইলে পাঠানো হয়েছে। Inbox ও Spam ফোল্ডার দেখুন।");
    } catch (error) {
      setOtpSent(false);
      setStatus(`OTP পাঠানো যায়নি: ${error.message}`);
    } finally { setBusy(false); }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    if (!supabase) return;
    if (!/^\d{6}$/.test(otp.trim())) { setStatus("৬ সংখ্যার OTP লিখুন।"); return; }
    setBusy(true); setStatus("");
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: "email" });
      if (error) throw error;
      setOtp("");
      setOtpSent(false);
      setStatus("ইমেইল যাচাই সফল হয়েছে।");
    } catch (error) {
      setStatus(`OTP যাচাই হয়নি: ${error.message}`);
    } finally { setBusy(false); }
  }

  async function uploadLocalData() {
    if (!supabase || !user || !isLoaded) return;
    const confirmed = await showDialog({
      title: "Cloud-এ Backup",
      message: "এই ডিভাইসের Settings ও Entries আপনার লগইন করা অ্যাকাউন্টে আপলোড হবে। Cloud-এ আগে থাকা অন্য Entry মুছে ফেলা হবে না। চালিয়ে যাবে?",
      type: "confirm",
    });
    if (!confirmed) return;
    setBusy(true); setStatus("");
    try {
      const { error: settingsError } = await supabase.from("user_settings").upsert({ user_id: user.id, settings }, { onConflict: "user_id" });
      if (settingsError) throw settingsError;
      const rows = entries.map((entry) => entryToRow(entry, user.id));
      for (let index = 0; index < rows.length; index += 500) {
        const { error } = await supabase.from("overtime_entries").upsert(rows.slice(index, index + 500), { onConflict: "user_id,id" });
        if (error) throw error;
      }
      await refreshCloudSummary();
      setStatus(`Backup সফল: ${entries.length}টি Entry ও Settings Cloud-এ সংরক্ষিত হয়েছে।`);
    } catch (error) {
      setStatus(`Backup সম্পূর্ণ হয়নি: ${error.message}. আবার চেষ্টা করার আগে Cloud-এ থাকা ডেটা যাচাই করুন।`);
    } finally { setBusy(false); }
  }

  async function restoreCloudData() {
    if (!supabase || !user) return;
    const confirmed = await showDialog({
      title: "Cloud Backup Restore",
      message: "Cloud-এর Settings ও Entries এই ডিভাইসের বর্তমান ডেটা দিয়ে প্রতিস্থাপিত হবে। আগে JSON Backup ডাউনলোড করে রেখেছ তো?",
      type: "danger",
    });
    if (!confirmed) return;
    setBusy(true); setStatus("");
    try {
      const [{ data: settingRow, error: settingsError }, { data: entryRows, error: entriesError }] = await Promise.all([
        supabase.from("user_settings").select("settings").eq("user_id", user.id).maybeSingle(),
        supabase.from("overtime_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: true }),
      ]);
      if (settingsError) throw settingsError;
      if (entriesError) throw entriesError;
      if (!settingRow && (!entryRows || entryRows.length === 0)) {
        setStatus("এই অ্যাকাউন্টে এখনো কোনো Cloud Backup নেই। আগে Local Data Upload করো।");
        return;
      }
      const backup = {
        app: "My Overtime",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: settingRow?.settings || settings,
        entries: (entryRows || []).map(rowToEntry),
      };
      const result = importBackupData(backup);
      if (!result.success) throw new Error(result.message);
      setStatus(`Cloud Restore সফল: ${backup.entries.length}টি Entry এই ডিভাইসে এসেছে।`);
    } catch (error) {
      setStatus(`Restore হয়নি: ${error.message}`);
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setCloudSummary(null);
    setStatus(error ? `Logout হয়নি: ${error.message}` : "অ্যাকাউন্ট থেকে Logout হয়েছে। Local ডেটা এই ডিভাইসে থাকবে।");
  }

  async function copyUid() {
    if (!uid) return;
    try { await navigator.clipboard.writeText(uid); setStatus("Local Device ID কপি হয়েছে।"); }
    catch { setStatus(`আপনার Local ID: ${uid}`); }
  }

  return (
    <div className="glass-card" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,243,255,0.18)" }}>
        <span style={{ fontSize: "1.35rem" }}>☁️</span>
        <div>
          <div style={{ color: "var(--primary)", fontWeight: 800, fontSize: "1rem" }}>Email Account & Cloud Backup</div>
          <div style={{ color: "#999", fontSize: "0.72rem", marginTop: "3px" }}>Secure personal cloud storage</div>
        </div>
      </div>
      {!supabase ? (
        <p style={{ color: "#ffcc80", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Supabase সংযোগের Environment Variables পাওয়া যায়নি। NEXT_PUBLIC_SUPABASE_URL এবং NEXT_PUBLIC_SUPABASE_ANON_KEY সেট করতে হবে।
        </p>
      ) : !user ? (
        <>
          <p style={{ color: "#ccc", fontSize: "0.82rem", lineHeight: 1.6 }}>ইমেইলে ৬ সংখ্যার OTP নিয়ে লগইন করো। লগইন না করা পর্যন্ত Cloud-এ কোনো ডেটা পাঠানো হবে না।</p>
          <form onSubmit={sendOtp} style={{ display: "grid", gap: "10px" }}>
            <label htmlFor="cloud-email" style={{ color: "#ddd", fontSize: "0.85rem" }}>Email address</label>
            <input id="cloud-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #555", background: "#111", color: "#fff" }} />
            <button type="submit" disabled={busy} style={buttonStyle}>{busy ? "অপেক্ষা করো..." : "Send Email OTP"}</button>
          </form>
          {otpSent ? (
            <form onSubmit={verifyOtp} style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
              <label htmlFor="cloud-otp" style={{ color: "#ddd", fontSize: "0.85rem" }}>৬ সংখ্যার OTP</label>
              <input id="cloud-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #555", background: "#111", color: "#fff", letterSpacing: "5px" }} />
              <button type="submit" disabled={busy} style={buttonStyle}>{busy ? "যাচাই হচ্ছে..." : "Verify OTP & Login"}</button>
            </form>
          ) : null}
        </>
      ) : (
        <>
          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(0,243,255,0.055)", border: "1px solid rgba(0,243,255,0.16)", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ color: "#75e8c4", fontSize: "0.72rem", fontWeight: 700 }}>● ACCOUNT CONNECTED</span>
              <button type="button" disabled={busy} onClick={signOut} style={{ ...buttonStyle, background: "rgba(180,65,65,0.8)", padding: "6px 10px", fontSize: "0.72rem" }}>Logout</button>
            </div>
            <div style={{ color: "#fff", fontSize: "0.88rem", fontWeight: 700, overflowWrap: "anywhere", marginTop: "8px" }}>{user.email}</div>
            <div style={{ color: "#999", fontSize: "0.72rem", marginTop: "4px" }}>আপনার ব্যক্তিগত Cloud Account</div>
          </div>
          {cloudSummary && <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "9px", marginBottom: "12px" }}>
            <div style={{ padding: "11px", borderRadius: "10px", background: "rgba(0,243,255,0.06)", border: "1px solid rgba(0,243,255,0.14)" }}>
              <div style={{ color: "#999", fontSize: "0.7rem" }}>Cloud Entries</div>
              <strong style={{ color: "var(--primary)", fontSize: "1.15rem" }}>{cloudSummary.entriesCount}</strong>
            </div>
            <div style={{ padding: "11px", borderRadius: "10px", background: "rgba(0,243,255,0.06)", border: "1px solid rgba(0,243,255,0.14)" }}>
              <div style={{ color: "#999", fontSize: "0.7rem" }}>Settings</div>
              <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{cloudSummary.hasSettings ? "সংরক্ষিত" : "নেই"}</strong>
            </div>
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "9px" }}>
            <button type="button" disabled={busy || !isLoaded} onClick={uploadLocalData} style={{ ...buttonStyle, gridColumn: "1 / -1", padding: "12px", background: "linear-gradient(135deg,#087f65,#00a98b)" }}>☁️ এই ডিভাইসের ডেটা Backup</button>
            <button type="button" disabled={busy} onClick={restoreCloudData} style={{ ...buttonStyle, background: "#315b9b", fontSize: "0.8rem", padding: "10px 6px" }}>↓ Cloud Restore</button>
            <button type="button" disabled={busy} onClick={refreshCloudSummary} style={{ ...buttonStyle, background: "#343b43", fontSize: "0.8rem", padding: "10px 6px" }}>↻ Status Refresh</button>
          </div>
        </>
      )}
      {status && <p role="status" aria-live="polite" style={{ color: status.includes("হয়নি") || status.includes("যায়নি") || status.includes("সম্পূর্ণ হয়নি") ? "#ffb4a8" : "#9fe8cb", fontSize: "0.82rem", lineHeight: 1.6, marginTop: "12px", overflowWrap: "anywhere" }}>{status}</p>}
      <details style={{ marginTop: "14px", paddingTop: "11px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <summary style={{ color: "#9baeb2", fontSize: "0.76rem", cursor: "pointer" }}>অতিরিক্ত তথ্য · Local Device ID</summary>
        <div style={{ marginTop: "10px", padding: "11px", background: "rgba(0,0,0,0.22)", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "var(--primary)", fontSize: "0.72rem", marginBottom: "5px" }}>Local Device ID</div>
              <strong style={{ color: "#fff", fontSize: "0.95rem", letterSpacing: "2px", overflowWrap: "anywhere" }}>{!isLoaded ? "......" : (uid || "Unavailable")}</strong>
            </div>
            <button type="button" onClick={copyUid} disabled={!uid} style={{ ...buttonStyle, padding: "8px 10px", fontSize: "0.75rem", flexShrink: 0 }}>Copy ID</button>
          </div>
          <p style={{ color: "#999", fontSize: "0.7rem", lineHeight: 1.5, margin: "8px 0 0" }}>এই Local ID একা Account Recovery Key নয়। নিয়মিত JSON Backup রাখুন।</p>
        </div>
      </details>
    </div>
  );
}
