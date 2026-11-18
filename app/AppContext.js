"use client";

import { createContext, useContext, useState, useEffect } from "react";
import CustomDialog from "./components/CustomDialog";

const AppContext = createContext();

export const initialSettings = {
  name: "User", floor: "", gross: 14650, basic: 8133, house: 4067,
  medical: 750, transport: 450, food: 1250, bonus: 725,
  hourlyRate: 78.21, tiffinRate: 30, nightRate: 50,
  savingsGoal: 10, holidayMultiplier: 2.0,
};

const SETTINGS_KEYS = ["my_ot_settings", "sagor_pro_settings", "settings", "sagor_settings"];
const ENTRY_KEYS = ["my_ot_entries", "sagor_pro_entries", "entries", "sagor_entries"];

function makeLocalUid() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(initialSettings);
  const [entries, setEntries] = useState([]);
  const [uid, setUid] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: null, onCancel: null });

  const showDialog = (options) => new Promise((resolve) => {
    setDialog({
      isOpen: true, title: options.title || "Notification", message: options.message || "",
      type: options.type || "info",
      onConfirm: () => { setDialog((p) => ({ ...p, isOpen: false })); resolve(true); },
      onCancel: () => { setDialog((p) => ({ ...p, isOpen: false })); resolve(false); },
    });
  });

  useEffect(() => {
    let active = true;

    async function loadApp() {
      try {
        const savedUid =
          localStorage.getItem("my_ot_uid") ||
          localStorage.getItem("sagor_pro_uid") ||
          localStorage.getItem("uid") ||
          localStorage.getItem("user_id");

        const settingsRaw = SETTINGS_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
        const entriesRaw = ENTRY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

        if (settingsRaw) {
          try { setSettings({ ...initialSettings, ...JSON.parse(settingsRaw) }); }
          catch { console.warn("Saved settings could not be parsed; keeping defaults."); }
        }

        if (entriesRaw) {
          try {
            const parsed = JSON.parse(entriesRaw);
            if (Array.isArray(parsed)) setEntries(parsed);
          } catch { console.warn("Saved entries could not be parsed; keeping an empty list."); }
        }

        // Until secure account authentication is available, keep identity local-only.
        // A six-character local identifier is NOT an account credential or cloud recovery key.
        const permanentUid = savedUid && /^[A-Z0-9]{6}$/i.test(savedUid)
          ? savedUid.toUpperCase()
          : makeLocalUid();

        if (active && permanentUid) {
          localStorage.setItem("my_ot_uid", permanentUid);
          setUid(permanentUid);
        }
      } catch (error) {
        console.error("Local data load failed:", error);
      } finally {
        if (active) setIsLoaded(true);
      }
    }

    loadApp();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("my_ot_settings", JSON.stringify(settings));
      localStorage.setItem("my_ot_entries", JSON.stringify(entries));
    } catch (error) {
      console.error("Local save failed:", error);
    }
  }, [settings, entries, isLoaded]);

  const addEntry = (entry) => setEntries((prev) => [...prev, entry]);
  const deleteEntry = (id) => setEntries((prev) => prev.filter((entry) => entry.id !== id));

  const importBackupData = (data) => {
    const allowedTypes = new Set([
      "work", "friday-off", "leave", "eid-bonus", "earned-leave"
    ]);

    const isValidDate = (value) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
    };

    const isValidNumber = (value) =>
      value === undefined || value === null || value === "" ||
      (Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 1000000000);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data.app !== "My Overtime" ||
      !data.settings ||
      typeof data.settings !== "object" ||
      Array.isArray(data.settings) ||
      !Array.isArray(data.entries) ||
      data.entries.length > 100000
    ) {
      return { success: false, message: "ব্যাকআপ ফাইলের কাঠামো সঠিক নয়।" };
    }

    for (const entry of data.entries) {
      if (
        !entry ||
        typeof entry !== "object" ||
        Array.isArray(entry) ||
        !isValidDate(entry.date) ||
        (entry.type !== undefined && !allowedTypes.has(entry.type)) ||
        !isValidNumber(entry.ot) ||
        !isValidNumber(entry.friday) ||
        !isValidNumber(entry.amount) ||
        (entry.tiffin !== undefined && typeof entry.tiffin !== "boolean") ||
        (entry.night !== undefined && typeof entry.night !== "boolean")
      ) {
        return {
          success: false,
          message: "ব্যাকআপে ভুল বা অসম্পূর্ণ Entry পাওয়া গেছে। বর্তমান ডেটা অপরিবর্তিত আছে।"
        };
      }
    }

    setSettings({ ...initialSettings, ...data.settings });
    setEntries(data.entries);
    return { success: true, message: "ডেটা পুনরুদ্ধার হয়েছে।" };
  };

  const clearData = () => { setSettings(initialSettings); setEntries([]); };

  return (
    <AppContext.Provider value={{ settings, setSettings, entries, uid, isLoaded, addEntry, deleteEntry, importBackupData, clearData, showDialog }}>
      {children}
      <CustomDialog {...dialog} />
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
