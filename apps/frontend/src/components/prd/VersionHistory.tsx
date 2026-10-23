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
    <section className="work-panel" aria-label="Riwayat versi">
      <div className="work-panel__head">
        <div className="work-panel__title">
          <History />
          <span>Riwayat versi</span>
        </div>
        <span className="app-meta">{versions.length} tersimpan</span>
      </div>

      <div className="version-list">
        {versions.map((ver) => {
          const isActive = ver.id === currentVersionId;
          const isRollback = ver.revisionPrompt?.startsWith("Reverted from");
          const isRegeneration = ver.revisionPrompt?.startsWith("Regenerated from");

          return (
            <div
              key={ver.id}
              onClick={() => onSelectVersion(ver)}
              className="version-row"
              data-active={isActive ? "true" : "false"}
            >
              <div className="version-row__main">
                <div className="version-row__top">
                  <span className="version-row__number">v{ver.versionNumber}</span>

                  {isActive ? (
                    <span className="chip chip--success">
                      <Check />
                      Aktif
                    </span>
                  ) : isRollback ? (
                    <span className="chip chip--warning">
                      <RotateCcw />
                      Rollback
                    </span>
                  ) : isRegeneration ? (
                    <span className="chip chip--info">
                      <RefreshCw />
                      Regenerate
                    </span>
                  ) : ver.versionNumber === 1 ? (
                    <span className="chip chip--neutral">Draf awal</span>
                  ) : (
                    <span className="chip chip--accent">
                      <Sparkles />
                      Revisi AI
                    </span>
                  )}
                </div>

                {ver.revisionPrompt && !isRegeneration && (
                  <p className="version-row__note">“{ver.revisionPrompt}”</p>
                )}

                <div className="version-row__date">
                  {new Date(ver.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {!isActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevert(ver.versionNumber);
                  }}
                  disabled={isReverting === ver.versionNumber}
                  className="btn btn--secondary btn--sm"
                >
                  <RotateCcw className={isReverting === ver.versionNumber ? "animate-spin" : ""} />
                  <span>Rollback</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
