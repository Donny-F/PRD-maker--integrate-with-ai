"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, AdminLlmConfig } from "@/lib/api";
import {
  ShieldAlert,
  Plus,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Lock,
} from "lucide-react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [configs, setConfigs] = useState<AdminLlmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AdminLlmConfig | null>(null);
  const [formData, setFormData] = useState({
    provider: "google",
    displayName: "",
    modelIdentifier: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: "",
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadConfigs = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminConfigs(session.accessToken);
      setConfigs(res.configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat konfigurasi LLM");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session.user.role !== "ADMIN") {
        router.push("/projects");
      } else {
        loadConfigs();
      }
    }
  }, [status, session, router, loadConfigs]);

  const handleOpenCreateModal = () => {
    setEditingConfig(null);
    setFormData({
      provider: "google",
      displayName: "",
      modelIdentifier: "",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cfg: AdminLlmConfig) => {
    setEditingConfig(cfg);
    setFormData({
      provider: cfg.provider,
      displayName: cfg.displayName,
      modelIdentifier: cfg.modelIdentifier,
      baseUrl: cfg.baseUrl,
      apiKey: "", // Leave blank unless replacing
      isActive: cfg.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken) return;

    try {
      setIsSaving(true);
      setError(null);

      const payload: Record<string, unknown> = {
        provider: formData.provider,
        displayName: formData.displayName,
        modelIdentifier: formData.modelIdentifier,
        baseUrl: formData.baseUrl,
        isActive: formData.isActive,
      };

      if (formData.apiKey.trim()) {
        payload.apiKey = formData.apiKey.trim();
      }

      if (editingConfig) {
        await api.updateAdminConfig(session.accessToken, editingConfig.id, payload);
      } else {
        await api.createAdminConfig(session.accessToken, payload);
      }

      setIsModalOpen(false);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan konfigurasi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(`Hapus konfigurasi LLM "${name}"?`);
    if (!confirmed) return;

    try {
      await api.deleteAdminConfig(session.accessToken, id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Gagal menghapus: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleActive = async (cfg: AdminLlmConfig) => {
    if (!session?.accessToken) return;
    try {
      await api.updateAdminConfig(session.accessToken, cfg.id, {
        isActive: !cfg.isActive,
      });
      setConfigs((prev) =>
        prev.map((c) => (c.id === cfg.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err) {
      alert("Gagal memperbarui status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-dark" />
        <span className="text-xs text-neutral-500">Memuat Panel Admin...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand text-neutral-950">
              <ShieldAlert className="w-3 h-3" />
              Role: Super Admin
            </span>
            <span className="text-xs text-neutral-400">Keamanan Enkripsi AES-256-GCM Aktif</span>
          </div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Panel Manajemen LLM & Kunci API
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Admin dapat menambah, mengedit string model, mengelola status aktif, serta menginput API Key terenkripsi.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Model LLM</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Table of LLM Configurations */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Nama Model</th>
                <th className="py-3.5 px-4">Provider & ID Model</th>
                <th className="py-3.5 px-4">OpenAI Base URL</th>
                <th className="py-3.5 px-4">Status Kunci API</th>
                <th className="py-3.5 px-4">Status Pengguna</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {configs.map((cfg) => (
                <tr key={cfg.id} className="hover:bg-neutral-50/60 transition">
                  {/* Display Name */}
                  <td className="py-3.5 px-4 font-semibold text-neutral-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-dark shrink-0" />
                      <span>{cfg.displayName}</span>
                    </div>
                  </td>

                  {/* Provider & Model String */}
                  <td className="py-3.5 px-4 text-neutral-700">
                    <span className="inline-block uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 mr-1.5">
                      {cfg.provider}
                    </span>
                    <span className="font-mono text-neutral-900">{cfg.modelIdentifier}</span>
                  </td>

                  {/* Base URL */}
                  <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px] max-w-[200px] truncate" title={cfg.baseUrl}>
                    {cfg.baseUrl}
                  </td>

                  {/* Masked API Key */}
                  <td className="py-3.5 px-4">
                    {cfg.hasApiKey ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        {cfg.maskedApiKey || "Tersimpan Aman"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <KeyRound className="w-3 h-3 text-amber-600" />
                        Belum Dikonfigurasi
                      </span>
                    )}
                  </td>

                  {/* Active Toggle Status */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleActive(cfg)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                        cfg.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                      }`}
                    >
                      {cfg.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Aktif (Dapat Dipilih)</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-neutral-400" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(cfg)}
                        title="Edit Model / API Key"
                        className="p-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cfg.id, cfg.displayName)}
                        title="Hapus Model"
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog for Add/Edit LLM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-neutral-900">
                {editingConfig ? `Edit LLM: ${editingConfig.displayName}` : "Tambah Model LLM Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      const prov = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        provider: prov,
                        baseUrl:
                          prov === "google"
                            ? "https://generativelanguage.googleapis.com/v1beta/openai/"
                            : "https://api.deepseek.com/v1",
                      }));
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  >
                    <option value="google">Google AI (Antigravity/Gemini)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI Compatible</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Nama Tampilan UI</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Antigravity Flash 3.8"
                    required
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Model Identifier (String Model)
                </label>
                <input
                  type="text"
                  value={formData.modelIdentifier}
                  onChange={(e) => setFormData({ ...formData, modelIdentifier: e.target.value })}
                  placeholder="gemini-2.5-flash atau deepseek-chat"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  OpenAI Compatible Base URL
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://..."
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  API Key LLM {editingConfig ? "(Biarkan kosong jika tidak ingin mengubah)" : ""}
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={editingConfig?.hasApiKey ? "Kunci saat ini tersimpan terenkripsi" : "Masukkan API key"}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Kunci akan dienkripsi dengan standar AES-256-GCM di server sebelum disimpan ke database.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand rounded border-neutral-300 focus:ring-brand"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-neutral-800">
                  Aktifkan model ini untuk dipilih oleh pengguna
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-brand hover:bg-brand-hover text-neutral-950 font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
