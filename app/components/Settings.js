"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "../AppContext";
import CloudBackup from "./CloudBackup";

export default function Settings() {
  const { settings, setSettings, entries, importBackupData, clearData, showDialog } = useAppContext();
  
  const [formData, setFormData] = useState({
    name: settings.name || "",
    floor: settings.floor || "",
    gross: settings.gross || 0,
    bonus: settings.bonus || 0,
    tiffinRate: settings.tiffinRate || 30,
    nightRate: settings.nightRate || 50,
    savingsGoal: settings.savingsGoal || 10,
    holidayMultiplier: settings.holidayMultiplier || 2.0,
  });

  useEffect(() => {
    setFormData({
      name: settings.name || "",
      floor: settings.floor || "",
      gross: settings.gross || 0,
      bonus: settings.bonus || 0,
      tiffinRate: settings.tiffinRate || 30,
      nightRate: settings.nightRate || 50,
      savingsGoal: settings.savingsGoal || 10,
      holidayMultiplier: settings.holidayMultiplier || 2.0,
    });
  }, [settings]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExportBackup = () => {
    const payload = { app: "My Overtime", version: 1, exportedAt: new Date().toISOString(), settings, entries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `my-overtime-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const confirmed = await showDialog({ title: "Restore Backup", message: "বর্তমান অ্যাপের ডেটা ব্যাকআপের ডেটা দিয়ে প্রতিস্থাপন হবে। আগে ব্যাকআপ ডাউনলোড করে রেখেছ তো?", type: "danger" });
      if (confirmed) {
        const result = importBackupData(parsed);
        await showDialog({ title: result.success ? "Restored" : "Failed", message: result.message, type: result.success ? "success" : "danger" });
      }
    } catch {
      await showDialog({ title: "Invalid backup", message: "JSON ব্যাকআপ ফাইলটি পড়া যায়নি।", type: "danger" });
    } finally { event.target.value = ""; }
  };

  const calculateBreakdown = () => {
    const gross = parseFloat(formData.gross) || 0;
    const fixed = 750 + 450 + 1250;
    let core = gross - fixed;
    if (core < 0) core = 0;
    
    const basic = Math.ceil(core / 1.5);
    const house = Math.round(core - basic);
    const rate = (basic / 208) * 2;
    
    return { basic, house, rate, medical: 750, transport: 450, food: 1250 };
  };

  const currentVars = calculateBreakdown();

  const handleSave = async () => {
    setSettings((prev) => ({
      ...prev,
      name: formData.name,
      floor: formData.floor,
      gross: parseFloat(formData.gross) || 0,
      bonus: parseFloat(formData.bonus) || 0,
      tiffinRate: parseFloat(formData.tiffinRate) || 30,
      nightRate: parseFloat(formData.nightRate) || 50,
      savingsGoal: parseFloat(formData.savingsGoal) || 10,
      holidayMultiplier: parseFloat(formData.holidayMultiplier) || 2.0,
      basic: currentVars.basic,
      house: currentVars.house,
      hourlyRate: parseFloat(currentVars.rate.toFixed(2)),
    }));
    await showDialog({ title: "Saved!", message: "Settings have been saved on this device.", type: "success" });
  };

  return (
    <section className="view active animate-fade-in pb-24">
      <div className="page-title">Settings</div>
      
      <form className="glass-form" onSubmit={e => e.preventDefault()}>
        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>Auto Salary Calculator (Gazette 2023)</div>
        
        <div className="glass-card p-3" style={{ background: "rgba(30, 30, 30, 0.9)", border: "1px solid #444", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
          <div className="form-group" style={{ marginBottom: "15px" }}>
            <label><i className="ri-money-dollar-circle-line"></i> Total Gross Salary (৳)</label>
            <input 
              type="number" 
              name="gross"
              value={formData.gross} 
              onChange={handleChange}
              style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#fff", width: "100%", padding: "10px", background: "#111", border: "1px solid #333", borderRadius: "8px" }}
            />
          </div>
          <div className="form-group">
            <label><i className="ri-hand-coin-line"></i> Attendance Bonus (৳)</label>
            <input 
              type="number" 
              name="bonus"
              value={formData.bonus}
              onChange={handleChange}
              style={{ padding: "10px", width: "100%", background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
            />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Bill Rates</div>
        <div className="form-row" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Tiffin (৳)</label>
            <input type="number" name="tiffinRate" value={formData.tiffinRate} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Night (৳)</label>
            <input type="number" name="nightRate" value={formData.nightRate} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>সেভিংস ও ছুটির রেট (Savings & Holidays)</div>
        <div className="form-row" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Savings Target (%)</label>
            <input type="number" name="savingsGoal" value={formData.savingsGoal} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Holiday Multiplier</label>
            <input type="number" step="0.1" name="holidayMultiplier" value={formData.holidayMultiplier} onChange={handleChange} style={{ width: "100%", padding: "8px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Full Breakdown</div>
        <div className="breakdown-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>Basic Salary</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.basic}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>House Rent</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.house}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>Medical</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.medical}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "600" }}>Transport</span>
            <span style={{ fontWeight: "800", color: "#fff", fontSize: "1.1rem" }}>৳{currentVars.transport}</span>
          </div>
          <div className="b-item glass-card-sm" style={{ padding: "12px", background: "rgba(0,150,255,0.1)", border: "1px solid rgba(0,150,255,0.3)", borderRadius: "12px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#4a9eff", fontWeight: "700", textTransform: "uppercase" }}>Food Allowance</span>
            <span style={{ fontWeight: "900", color: "#fff", fontSize: "1.2rem" }}>৳{currentVars.food}</span>
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: "center", border: "1px solid #444", background: "rgba(30, 30, 30, 0.9)", padding: "20px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ color: "var(--secondary)", marginBottom: "5px", fontSize: "0.9rem", fontWeight: "bold" }}>YOUR OT RATE (HOURLY)</div>
          <div style={{ fontSize: "2.5rem", fontWeight: "800", color: "#fff", fontFamily: "'Courier New', monospace" }}>
            {currentVars.rate.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>(Basic / 208) × 2</div>
        </div>

        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Profile Info</div>
        <div className="form-group" style={{ marginBottom: "15px" }}>
          <label>Your Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} style={{ width: "100%", padding: "10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
        </div>
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label>Floor / Unit</label>
          <input type="text" name="floor" value={formData.floor} onChange={handleChange} style={{ width: "100%", padding: "10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "5px" }} />
        </div>

        <div className="glass-card p-3" style={{ background: "rgba(0, 70, 255, 0.1)", border: "1px solid rgba(0, 100, 255, 0.3)", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
          <div style={{ color: "#4a9eff", marginBottom: "10px", fontWeight: "bold" }}><i className="ri-shield-check-line"></i> Data Backup & Restore</div>
          <p style={{ fontSize: "0.82rem", color: "#ccc", marginBottom: "12px", lineHeight: 1.6 }}>এই সংস্করণে ডেটা ফোনের মধ্যেই সেভ হয়। ফোন বদলানোর আগে নিয়মিত ব্যাকআপ ডাউনলোড করে রাখুন। পরে নতুন অ্যাকাউন্ট ও ক্লাউড সিঙ্ক যুক্ত হবে।</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={handleExportBackup} style={{ flex: 1, minWidth: "130px", background: "#2563eb", color: "#fff", border: 0, padding: "11px", borderRadius: "8px", fontWeight: 700 }}>ডেটা Backup</button>
            <label style={{ flex: 1, minWidth: "130px", textAlign: "center", background: "#333", color: "#fff", padding: "11px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>Backup Restore<input type="file" accept="application/json,.json" onChange={handleImportBackup} style={{ display: "none" }} /></label>
          </div>
          <div style={{ marginTop: "10px", color: "#aaa", fontSize: "0.75rem" }}>মোট সংরক্ষিত এন্ট্রি: {entries.length}</div>
        </div>

        <CloudBackup />

        {/* Developer Support Section */}
        <div className="section-label" style={{ marginBottom: "10px", color: "var(--primary)", fontWeight: "bold" }}>Developer Support</div>
        <div className="glass-card" style={{ padding: "18px", background: "rgba(0,0,0,0.5)", border: "1px solid #333", borderRadius: "10px", marginBottom: "30px" }}>
          <p style={{ fontSize: "0.85rem", color: "#ccc", marginBottom: "15px", lineHeight: "1.6" }}>
            অ্যাপটি নিয়ে আপনাদের যেকোনো পরামর্শ বা মতামত থাকলে, অথবা কোনো সমস্যা হলে আমাদের ইমেইল করে জানান।
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="ri-information-line" style={{ color: "var(--primary)", fontSize: "1.2rem" }}></i>
            <span style={{ color: "#fff", fontWeight: "bold" }}>Support contact will be added before public launch.</span>
          </div>
        </div>

        <button type="button" className="btn-primary" onClick={handleSave} style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#fff", border: "none", cursor: "pointer", borderRadius: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
          Save Configuration
        </button>
        
        <div style={{ marginTop: "30px", textAlign: "center" }}>
           <button type="button" onClick={async () => {
             const ok = await showDialog({ title: "Reset Data", message: "This will clear all local data. Are you sure?", type: "danger" });
             if(ok) clearData();
           }} style={{ background: "transparent", border: "1px solid #ff3838", color: "#ff3838", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", width: "100%", textTransform: "uppercase", fontWeight: "bold" }}>
             Reset Local Data
           </button>
        </div>

      </form>
    </section>
  );
}
