"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
      title={theme === "dark" ? "Tema terang" : "Tema gelap"}
      className="btn btn--quiet btn--icon"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}
