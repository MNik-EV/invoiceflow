"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "تم روشن", icon: Sun },
  { value: "dark", label: "تم تیره", icon: Moon },
  { value: "system", label: "تم دستگاه", icon: Laptop },
] as const;

const subscribeToHydration = () => () => undefined;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const selectedTheme = mounted ? theme : "system";
  const currentIndex = Math.max(
    0,
    themes.findIndex((item) => item.value === selectedTheme),
  );
  const current = themes[currentIndex] ?? themes[2];
  const nextTheme = themes[(currentIndex + 1) % themes.length] ?? themes[0];
  const Icon = current.icon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("rounded-xl", className)}
      aria-label={`${current.label}؛ تغییر تم`}
      title={`${current.label}؛ برای تغییر کلیک کنید`}
      onClick={() => setTheme(nextTheme.value)}
    >
      <Icon className="size-4.5" aria-hidden="true" />
    </Button>
  );
}
