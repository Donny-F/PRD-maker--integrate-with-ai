"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Project } from "@/lib/api";
import { Plus, FileText, ArrowRight, Trash2, Calendar, GitBranch, Loader2 } from "lucide-react";

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      const res = await api.getProjects(session.accessToken);
      setProjects(res.projects);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadProjects();
    }
  }, [status, router, loadProjects]);

  const handleDelete = async (id: string, title: string) => {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(`Hapus proyek "${title}" secara permanen?`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.deleteProject(session.accessToken, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Gagal menghapus proyek: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-dark" />
        <span className="text-xs text-neutral-500">Memuat daftar proyek...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Daftar Proyek PRD
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Kelola dan buka kembali dokumen PRD beserta visualisasi diagram alur yang pernah Anda buat.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buat PRD Baru</span>
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 rounded-2xl text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark flex items-center justify-center mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 mb-1">Belum Ada Dokumen PRD</h3>
          <p className="text-xs text-neutral-500 max-w-sm mb-6">
            Mulai ide produk Anda sekarang. AI akan membantu mengajukan klarifikasi, merancang PRD lengkap, dan menghasilkan bagan diagram alur.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Buat PRD Pertama</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const versionCount = project.versions?.length || 1;
            const latestVersion = project.versions?.[0];

            return (
              <div
                key={project.id}
                className="flex flex-col justify-between p-5 bg-white border border-neutral-200 hover:border-brand/60 rounded-2xl shadow-sm hover:shadow transition group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-[10px] font-semibold">
                      <GitBranch className="w-3 h-3 text-neutral-500" />
                      {versionCount} Versi
                    </span>

                    <button
                      onClick={() => handleDelete(project.id, project.title)}
                      disabled={deletingId === project.id}
                      title="Hapus Proyek"
                      className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-brand-dark transition line-clamp-1 mb-1.5">
                    {project.title}
                  </h3>

                  <p className="text-xs text-neutral-500 line-clamp-3 mb-4 leading-relaxed">
                    {project.initialPrompt}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(project.updatedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-brand-dark transition"
                  >
                    <span>Buka Proyek</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
