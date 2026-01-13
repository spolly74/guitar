"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Desktop, Check } from "@phosphor-icons/react";

type Theme = "light" | "dark" | "system";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun; description: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Always use light mode",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Always use dark mode",
  },
  {
    value: "system",
    label: "System",
    icon: Desktop,
    description: "Match your device settings",
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-foreground-muted">
          Account settings, practice preferences, and app defaults.
        </p>
      </div>

      {/* Appearance Section */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-foreground-muted">
            Choose how the app looks to you
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`relative flex flex-col items-center gap-3 rounded-lg px-4 py-4 text-center transition-colors ${
                    isSelected
                      ? "bg-accent-subtle"
                      : "hover:bg-background-subtle"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-2 top-2">
                      <Check
                        weight="bold"
                        className="h-4 w-4 text-accent"
                      />
                    </div>
                  )}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "bg-background-subtle text-foreground-muted"
                    }`}
                  >
                    <Icon weight="duotone" className="h-5 w-5" />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        isSelected ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {option.label}
                    </div>
                    <div className="mt-0.5 text-xs text-foreground-muted">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Placeholder for future settings */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Practice</h2>
          <p className="text-sm text-foreground-muted">
            Customize your practice experience
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-foreground-muted">
            More settings coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}
