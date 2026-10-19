"use client";

import { LlmModel } from "@/lib/api";

interface LlmModelSelectProps {
  models: LlmModel[];
  value: string;
  onChange: (modelId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string | null;
  className?: string;
  selectClassName?: string;
}

export function LlmModelSelect({
  models,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  label = "Model LLM yang Digunakan",
  className = "",
  selectClassName = "",
}: LlmModelSelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          {label}
        </label>
      )}
      {isLoading ? (
        <div
          className={`h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse ${selectClassName}`}
        />
      ) : (
        <select
          aria-label={label ?? "Model LLM yang Digunakan"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || models.length === 0}
          className={`w-full px-3.5 py-2.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed ${selectClassName}`}
        >
          {models.length === 0 && <option value="">Tidak ada model tersedia</option>}
          {models.map((m) => (
            <option key={m.id} value={m.id} disabled={m.isAvailable === false}>
              {m.displayName} ({m.provider.toUpperCase()} - {m.modelIdentifier})
              {m.isAvailable === false ? " — Limit habis" : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
