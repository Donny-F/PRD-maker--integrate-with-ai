"use client";

import React, { useState } from "react";
import { History, RotateCcw, RefreshCw, Check, Sparkles } from "lucide-react";
import { ProjectVersion } from "@/lib/api";

interface VersionHistoryProps {
  versions: ProjectVersion[];
  currentVersionId?: string | null;
  onSelectVersion: (version: ProjectVersion) => void;
  onRevertVersion: (targetVersionNumber: number) => Promise<void>;
}

export function VersionHistory({
  versions,
  currentVersionId,
  onSelectVersion,
  onRevertVersion,
}: VersionHistoryProps) {
  const [isReverting, setIsReverting] = useState<number | null>(null);

  const handleRevert = async (vNumber: number) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin melakukan rollback ke Versi ${vNumber}? Sistem akan membuat snapshot baru bertanda "Reverted from v${vNumber}".`
    );
    if (!confirmed) return;

    try {
      setIsReverting(vNumber);
      await onRevertVersion(vNumber);
    } finally {
      setIsReverting(null);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-dark dark:text-brand" />
          <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
            Riwayat Revisi Dokumen
          </h3>
        </div>
        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          {versions.length} Versi Tersimpan
        </span>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {versions.map((ver) => {
          const isActive = ver.id === currentVersionId;
          const isRollback = ver.revisionPrompt?.startsWith("Reverted from");
          const isRegeneration = ver.revisionPrompt?.startsWith("Regenerated from");

          return (
            <div
              key={ver.id}
              onClick={() => onSelectVersion(ver)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-start justify-between gap-3 ${
                isActive
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/70"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isActive ? "bg-brand text-neutral-950" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    v{ver.versionNumber}
                  </span>

                  {isRollback ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      <RotateCcw className="w-3 h-3" />
                      Rollback Snapshot
                    </span>
                  ) : isRegeneration ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 dark:text-sky-400 font-medium">
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </span>
                  ) : ver.versionNumber === 1 ? (
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Draft Awal</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-brand-dark dark:text-brand font-medium">
                      <Sparkles className="w-3 h-3" />
                      Revisi AI
                    </span>
                  )}
                </div>

                {ver.revisionPrompt && !isRegeneration && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 italic mb-1">
                    "{ver.revisionPrompt}"
                  </p>
                )}

                <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {new Date(ver.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3" /> Aktif
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevert(ver.versionNumber);
                    }}
                    disabled={isReverting === ver.versionNumber}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-50 bg-neutral-100 dark:bg-neutral-800 hover:bg-brand/20 hover:border-brand/40 border border-neutral-200 dark:border-neutral-800 rounded transition"
                  >
                    <RotateCcw className={`w-3 h-3 ${isReverting === ver.versionNumber ? "animate-spin" : ""}`} />
                    <span>Rollback</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
