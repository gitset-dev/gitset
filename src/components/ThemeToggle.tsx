"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [isReady, setIsReady] = useState(false);

  const applyTheme = useCallback((value: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(value);
    localStorage.setItem(THEME_STORAGE_KEY, value);
    setTheme(value);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    const initialTheme: Theme =
      stored === "light" || stored === "dark" ? stored : "dark";

    applyTheme(initialTheme);
    setIsReady(true);
  }, [applyTheme]);

  const handleToggle = () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("rounded-full", className)}
      onClick={handleToggle}
      aria-label="Toggle theme"
    >
      {isReady && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export default ThemeToggle;
