"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Project } from "@/lib/api";
import {
  Plus,
  FileText,
  ArrowRight,
  Trash2,
  Calendar,
  GitBranch,
  Loader2,
} from "lucide-react";

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
      <div className="app-loading">
        <Loader2 className="animate-spin" />
        <span>Memuat proyek...</span>
      </div>
    );
  }

  const totalVersions = projects.reduce(
    (sum, project) => sum + (project.versions?.length || 1),
    0
  );
  const latestProject = projects.reduce<Project | null>((latest, project) => {
    if (!latest) return project;
    return new Date(project.updatedAt) > new Date(latest.updatedAt) ? project : latest;
  }, null);

  return (
    <div>
      <div className="app-page-head">
        <div className="app-page-head__copy">
          <h1 className="app-page-title">Proyek PRD</h1>
          <p className="app-page-sub">
            Satu tempat untuk membuka kembali dokumen, diagram, dan riwayat versi
            yang pernah dibuat.
          </p>
        </div>

        <div className="app-page-actions">
          <Link href="/projects/new" className="btn btn--primary">
            <Plus />
            <span>Buat PRD</span>
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <section className="empty-panel" aria-labelledby="empty-projects-title">
          <p className="app-meta">
            <FileText />
            <span>Ruang kerja</span>
          </p>
          <h2 id="empty-projects-title" className="empty-panel__title">
            Belum ada dokumen PRD di sini.
          </h2>
          <p className="empty-panel__text">
            Mulai dengan satu prompt. AI akan menanyakan detail yang kurang,
            menyusun PRD lengkap, lalu membangun diagram alurnya.
          </p>
          <Link href="/projects/new" className="btn btn--primary">
            <Plus />
            <span>Mulai dari prompt</span>
          </Link>
        </section>
      ) : (
        <div className="stack stack--lg">
          <section className="metric-strip" aria-label="Ringkasan proyek">
            <div className="metric">
              <div className="metric__label">Proyek</div>
              <div className="metric__value">{projects.length}</div>
              <div className="metric__note">Dokumen dalam ruang kerja</div>
            </div>
            <div className="metric">
              <div className="metric__label">Versi tersimpan</div>
              <div className="metric__value">{totalVersions}</div>
              <div className="metric__note">Termasuk draf dan rollback</div>
            </div>
            <div className="metric">
              <div className="metric__label">Terakhir diperbarui</div>
              <div className="metric__value" style={{ fontSize: "1.05rem", lineHeight: 1.5 }}>
                {latestProject
                  ? new Date(latestProject.updatedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </div>
              <div className="metric__note">
                {latestProject ? latestProject.title : "Belum ada proyek"}
              </div>
            </div>
          </section>

          <section aria-labelledby="project-list-title">
            <div className="app-page-head" style={{ marginBottom: 12 }}>
              <div>
                <h2 id="project-list-title" className="app-section-title">
                  Semua proyek
                </h2>
                <p className="app-section-sub">
                  {projects.length} proyek · {totalVersions} versi
                </p>
              </div>
            </div>

            <div className="project-list">
              {projects.map((project) => {
                const versionCount = project.versions?.length || 1;

                return (
                  <article key={project.id} className="project-row">
                    <div className="project-row__main">
                      <div className="project-row__top">
                        <h3 className="project-row__title">
                          <Link href={`/projects/${project.id}`}>{project.title}</Link>
                        </h3>
                        <span className="chip chip--neutral">
                          <GitBranch />
                          {versionCount} versi
                        </span>
                      </div>

                      <p className="project-row__prompt">{project.initialPrompt}</p>

                      <div className="project-row__meta">
                        <span>
                          <Calendar />
                          {new Date(project.updatedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span>
                          <FileText />
                          {project.versions?.[0]?.prdContent
                            ? "PRD tersedia"
                            : "Draf awal"}
                        </span>
                      </div>
                    </div>

                    <div className="project-row__actions">
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id, project.title)}
                        disabled={deletingId === project.id}
                        title="Hapus proyek"
                        aria-label={`Hapus proyek ${project.title}`}
                        className="project-row__delete"
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </button>

                      <Link href={`/projects/${project.id}`} className="project-row__open">
                        <span>Buka</span>
                        <ArrowRight />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
