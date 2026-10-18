"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Project, ProjectVersion, DiagramData } from "@/lib/api";
import { PrdViewer } from "@/components/prd/PrdViewer";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { VersionHistory } from "@/components/prd/VersionHistory";
import {
  FileText,
  Network,
  Columns2,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  GitBranch,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const autoGenerate = searchParams.get("generate") === "true";
  const llmModelId = searchParams.get("model") || undefined;

  const [project, setProject] = useState<Project | null>(null);
  const [activeVersion, setActiveVersion] = useState<ProjectVersion | null>(null);
  const [viewMode, setViewMode] = useState<"both" | "prd" | "diagram">("both");

  // Streaming & Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isStreamingPrd, setIsStreamingPrd] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!session?.accessToken || !projectId) return;
    try {
      setIsLoading(true);
      const res = await api.getProject(session.accessToken, projectId);
      setProject(res.project);
      setActiveVersion(res.project.currentVersion || res.project.versions[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat proyek");
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, projectId]);

  // Step 3: Stream PRD via SSE
  const startPrdStream = useCallback(() => {
    if (!session?.accessToken || !projectId) return;

    setIsStreamingPrd(true);
    setStreamedText("");
    setStatusMessage("Menghubungkan ke AI untuk streaming PRD...");
    setError(null);

    const sseUrl = `${API_URL}/projects/${projectId}/stream-prd?token=${session.accessToken}${
      llmModelId ? `&llmConfigId=${llmModelId}` : ""
    }`;

    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener("chunk", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.text) {
          setStreamedText((prev) => prev + payload.text);
        }
      } catch {
        // ignore parse error
      }
    });

    eventSource.addEventListener("done", async () => {
      eventSource.close();
      setIsStreamingPrd(false);
      setStatusMessage("Dokumen PRD selesai. Menggenerate bagan diagram alur...");

      // Automatically trigger Step 4: Diagram Generation
      try {
        setIsGeneratingDiagram(true);
        await api.generateDiagram(session.accessToken!, projectId, llmModelId);
      } catch (err) {
        console.warn("Auto diagram generation error:", err);
      } finally {
        setIsGeneratingDiagram(false);
        setStatusMessage(null);
        await loadProject();
      }
    });

    eventSource.addEventListener("error", (e: MessageEvent) => {
      eventSource.close();
      setIsStreamingPrd(false);
      setStatusMessage(null);
      try {
        const errPayload = JSON.parse(e.data);
        setError(errPayload.error || "Terjadi kesalahan saat streaming PRD");
      } catch {
        setError("Koneksi streaming terputus");
      }
    });
  }, [session?.accessToken, projectId, llmModelId, loadProject]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadProject().then(() => {
        if (autoGenerate) {
          // Remove query param from URL cleanly
          window.history.replaceState({}, "", `/projects/${projectId}`);
          startPrdStream();
        }
      });
    }
  }, [status, router, projectId, loadProject, autoGenerate, startPrdStream]);

  // Step 4: Manual or re-trigger diagram generation
  const handleRegenerateDiagram = async () => {
    if (!session?.accessToken || !projectId) return;
    try {
      setIsGeneratingDiagram(true);
      setError(null);
      const res = await api.generateDiagram(session.accessToken, projectId, llmModelId);
      if (activeVersion) {
        setActiveVersion({ ...activeVersion, diagramData: res.diagramData });
      }
      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menggenerate diagram");
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  // Step 5: Submit Revision Prompt (Streamed update + diagram re-sync)
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim() || !session?.accessToken || !projectId) return;

    try {
      setIsRevising(true);
      setStatusMessage("Menganalisis revisi dan memperbarui dokumen PRD...");
      setError(null);

      const sseUrl = `${API_URL}/projects/${projectId}/stream-revision?token=${
        session.accessToken
      }&revisionPrompt=${encodeURIComponent(revisionPrompt.trim())}${
        llmModelId ? `&llmConfigId=${llmModelId}` : ""
      }`;

      const eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("chunk", () => {
        // Revision streaming progress
      });

      eventSource.addEventListener("status", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setStatusMessage(payload.message || "Memproses...");
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener("done", async () => {
        eventSource.close();
        setIsRevising(false);
        setStatusMessage(null);
        setRevisionPrompt("");
        await loadProject();
      });

      eventSource.addEventListener("error", (e: MessageEvent) => {
        eventSource.close();
        setIsRevising(false);
        setStatusMessage(null);
        try {
          const payload = JSON.parse(e.data);
          setError(payload.error || "Gagal memproses revisi");
        } catch {
          setError("Koneksi streaming revisi terputus");
        }
      });
    } catch (err) {
      setIsRevising(false);
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat revisi");
    }
  };

  // Step 5: Rollback to past version (Creates linear snapshot)
  const handleRevertVersion = async (targetVersionNumber: number) => {
    if (!session?.accessToken || !projectId) return;
    try {
      setStatusMessage(`Melakukan rollback ke versi ${targetVersionNumber}...`);
      await api.revertVersion(session.accessToken, projectId, targetVersionNumber);
      await loadProject();
    } catch (err) {
      alert("Gagal melakukan rollback: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setStatusMessage(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-dark dark:text-brand" />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Memuat data proyek...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Proyek Tidak Ditemukan</h3>
      </div>
    );
  }

  const currentContent = isStreamingPrd ? streamedText : activeVersion?.prdContent || "";
  const currentDiagram = (activeVersion?.diagramData as DiagramData) || { nodes: [], edges: [] };

  return (
    <div className="space-y-6">
      {/* Project Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-brand">
              <GitBranch className="w-3 h-3 text-brand" />
              v{activeVersion?.versionNumber || 1} Aktif
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              Dibuat: {new Date(project.createdAt).toLocaleDateString("id-ID")}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {project.title}
          </h1>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setViewMode("both")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              viewMode === "both"
                ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bersisian</span>
          </button>
          <button
            onClick={() => setViewMode("prd")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              viewMode === "prd"
                ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Dokumen PRD</span>
          </button>
          <button
            onClick={() => setViewMode("diagram")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              viewMode === "diagram"
                ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Bagan Diagram</span>
          </button>
        </div>
      </div>

      {/* Real-time Status / Error banners */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 bg-brand/10 border border-brand/30 text-brand-dark dark:text-brand text-xs rounded-xl font-medium animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-brand-dark dark:text-brand" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Workspace (Split or Tabbed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: PRD Document Viewer */}
        {(viewMode === "both" || viewMode === "prd") && (
          <div className={viewMode === "both" ? "lg:col-span-6" : "lg:col-span-12"}>
            <PrdViewer
              content={currentContent}
              projectTitle={project.title}
              isStreaming={isStreamingPrd}
            />
          </div>
        )}

        {/* Right Column: React Flow + Dagre Infinite Canvas */}
        {(viewMode === "both" || viewMode === "diagram") && (
          <div className={viewMode === "both" ? "lg:col-span-6" : "lg:col-span-12"}>
            <DiagramCanvas
              data={currentDiagram}
              projectTitle={project.title}
              onRefresh={handleRegenerateDiagram}
              isRefreshing={isGeneratingDiagram}
            />
          </div>
        )}
      </div>

      {/* Bottom Section: Step 5 Revisi & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        {/* Step 5: Revision Prompt Input */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand-dark dark:text-brand flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Step 5: Revisi & Iterasi PRD
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Masukkan instruksi perubahan. AI akan memperbarui PRD markdown dan menyinkronkan bagan diagram.
              </p>
            </div>
          </div>

          <form onSubmit={handleRevisionSubmit} className="space-y-3">
            <textarea
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              disabled={isRevising || isStreamingPrd}
              rows={3}
              placeholder="Contoh: Tambahkan modul sistem notifikasi email pada Fase 2 dan perinci arsitektur autentikasi..."
              className="w-full px-3.5 py-2.5 text-xs leading-relaxed border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:bg-neutral-100 dark:disabled:bg-neutral-800"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Setiap revisi akan disimpan sebagai versi baru (v2, v3, dst).
              </span>

              <button
                type="submit"
                disabled={isRevising || isStreamingPrd || !revisionPrompt.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isRevising ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Revisi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Instruksi Revisi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Version History & Revert Audit Trail */}
        <div className="lg:col-span-5">
          <VersionHistory
            versions={project.versions || []}
            currentVersionId={activeVersion?.id}
            onSelectVersion={(v) => setActiveVersion(v)}
            onRevertVersion={handleRevertVersion}
          />
        </div>
      </div>
    </div>
  );
}
