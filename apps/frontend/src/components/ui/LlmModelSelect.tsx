"use client";

import { useId } from "react";
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
  label = "Model LLM yang digunakan",
  className = "",
  selectClassName = "",
}: LlmModelSelectProps) {
  const selectId = useId();

  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      {isLoading ? (
        <div
          className={`field ${selectClassName}`}
          style={{
            color: "var(--app-faint)",
            display: "flex",
            alignItems: "center",
          }}
        >
          Memuat model...
        </div>
      ) : (
        <select
          id={selectId}
          aria-label={label ?? "Model LLM yang digunakan"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || models.length === 0}
          className={`select ${selectClassName}`}
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
