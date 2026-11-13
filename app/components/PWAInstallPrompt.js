"use client";

import { useEffect, useState } from "react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone || localStorage.getItem("pwa_install_dismissed") === "1") return;

    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert(deviceOS === "ios"
        ? "Safari-এর Share বাটনে চাপুন, তারপর Add to Home Screen নির্বাচন করুন।"
        : "Chrome-এর ⋮ মেনু খুলে Install app অথবা Add to Home screen নির্বাচন করুন।");
      return;
    }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem("pwa_install_dismissed", "1");
    setShow(false);
  };

  if (!show) return null;
  return (
    <div style={{ position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: "460px", background: "rgba(10,10,12,0.97)", border: "1px solid rgba(0,243,255,0.3)", borderRadius: "18px", padding: "18px", zIndex: 5000, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
      <div style={{ color: "#fff", fontWeight: 800, marginBottom: "6px" }}>My Overtime অ্যাপ ইনস্টল করুন</div>
      <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "14px" }}>হোম স্ক্রিন থেকে দ্রুত খুলুন এবং অ্যাপের মতো ব্যবহার করুন।</p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={dismiss} style={{ flex: 1, padding: "11px", background: "none", border: "1px solid #444", borderRadius: "9px", color: "#aaa" }}>পরে</button>
        <button onClick={handleInstall} style={{ flex: 1.5, padding: "11px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", border: 0, borderRadius: "9px", color: "#111", fontWeight: 800 }}>ইনস্টল করুন</button>
      </div>
    </div>
  );
}
