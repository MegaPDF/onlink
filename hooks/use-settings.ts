"use client";

import ClientSettings, { AppSettings } from "@/lib/settings-client";
import { useEffect, useState } from "react";

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(() => ClientSettings.getSettings());

  useEffect(() => {
    // Subscribe to settings updates
    ClientSettings.subscribe(setSettings);
  }, []);

  return settings;
}

// Initialize on app start
if (typeof window !== 'undefined') {
  ClientSettings.loadSettings();
}
