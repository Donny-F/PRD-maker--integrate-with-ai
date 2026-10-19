"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, AdminLlmConfig, AdminUser } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ConfirmTone } from "@/components/ui/ConfirmDialog";
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
  Users,
  ShieldCheck,
  Search,
  X,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

const USERS_PAGE_SIZE = 10;

type UserRoleFilter = "ALL" | "ADMIN" | "USER";

const USER_ROLE_FILTERS: Array<{ value: UserRoleFilter; label: string }> = [
  { value: "ALL", label: "Semua Role" },
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [configs, setConfigs] = useState<AdminLlmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>("ALL");
  const [userPage, setUserPage] = useState(1);

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone: ConfirmTone;
    action: () => Promise<void>;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

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

  // Manual availability override state
  const [availabilityConfig, setAvailabilityConfig] = useState<AdminLlmConfig | null>(null);
  const [availabilityForm, setAvailabilityForm] = useState({
    unavailableUntil: "",
    unavailableReason: "",
  });
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

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

  const loadUsers = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      setUsersLoading(true);
      setUsersError(null);
      const res = await api.getUsers(session.accessToken);
      setUsers(res.users);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Gagal memuat daftar pengguna");
    } finally {
      setUsersLoading(false);
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
        loadUsers();
      }
    }
  }, [status, session, router, loadConfigs, loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== "ALL" && u.role !== userRoleFilter) return false;
      if (!q) return true;
      return (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, userSearch, userRoleFilter]);

  const userEmptyMessage = useMemo(() => {
    if (users.length === 0) return "Belum ada pengguna terdaftar.";
    const q = userSearch.trim();
    const roleLabel = userRoleFilter === "ADMIN" ? "Admin" : "User";
    if (q) {
      return userRoleFilter === "ALL"
        ? `Tidak ada pengguna yang cocok dengan pencarian "${q}".`
        : `Tidak ada pengguna role ${roleLabel} yang cocok dengan pencarian "${q}".`;
    }
    return `Tidak ada pengguna dengan role ${roleLabel}.`;
  }, [users.length, userSearch, userRoleFilter]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const currentUserPage = Math.min(userPage, totalUserPages);
  const pagedUsers = filteredUsers.slice(
    (currentUserPage - 1) * USERS_PAGE_SIZE,
    currentUserPage * USERS_PAGE_SIZE
  );
  const userRangeStart = filteredUsers.length === 0 ? 0 : (currentUserPage - 1) * USERS_PAGE_SIZE + 1;
  const userRangeEnd = Math.min(currentUserPage * USERS_PAGE_SIZE, filteredUsers.length);

  const userPageItems = useMemo<Array<number | "ellipsis">>(() => {
    if (totalUserPages <= 7) {
      return Array.from({ length: totalUserPages }, (_, i) => i + 1);
    }
    const items: Array<number | "ellipsis"> = [1];
    const start = Math.max(2, currentUserPage - 1);
    const end = Math.min(totalUserPages - 1, currentUserPage + 1);
    if (start > 2) items.push("ellipsis");
    for (let p = start; p <= end; p++) items.push(p);
    if (end < totalUserPages - 1) items.push("ellipsis");
    items.push(totalUserPages);
    return items;
  }, [currentUserPage, totalUserPages]);

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

  const handleOpenAvailabilityModal = (cfg: AdminLlmConfig) => {
    const until = cfg.unavailableUntil ? new Date(cfg.unavailableUntil) : null;
    setAvailabilityConfig(cfg);
    setAvailabilityForm({
      unavailableUntil:
        until && !Number.isNaN(until.getTime())
          ? new Date(until.getTime() - until.getTimezoneOffset() * 60_000)
              .toISOString()
              .slice(0, 16)
          : "",
      unavailableReason: cfg.unavailableReason ?? "",
    });
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken || !availabilityConfig) return;

    const until = availabilityForm.unavailableUntil.trim();
    try {
      setIsSavingAvailability(true);
      setError(null);
      await api.updateAdminConfig(session.accessToken, availabilityConfig.id, {
        unavailableUntil: until ? new Date(until).toISOString() : null,
        unavailableReason: until ? availabilityForm.unavailableReason.trim() || null : null,
      });
      setAvailabilityConfig(null);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan ketersediaan model");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!session?.accessToken) return;
    const token = session.accessToken;

    setPendingConfirm({
      title: "Hapus Konfigurasi LLM",
      description: `Konfigurasi "${name}" akan dihapus permanen dan tidak dapat dikembalikan.`,
      confirmLabel: "Hapus Konfigurasi",
      tone: "danger",
      action: async () => {
        try {
          await api.deleteAdminConfig(token, id);
          setConfigs((prev) => prev.filter((c) => c.id !== id));
          setError(null);
        } catch (err) {
          setError("Gagal menghapus: " + (err instanceof Error ? err.message : String(err)));
        }
      },
    });
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
      setError("Gagal memperbarui status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleUserRole = (user: AdminUser) => {
    if (!session?.accessToken) return;
    const token = session.accessToken;

    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const label = user.name ? `${user.name} (${user.email})` : user.email;
    const promoting = nextRole === "ADMIN";

    setPendingConfirm({
      title: promoting ? "Promosikan ke Admin" : "Turunkan ke User",
      description: promoting
        ? `${label} akan mendapat akses penuh ke panel admin, termasuk mengelola LLM dan mengubah role pengguna lain.`
        : `${label} akan kehilangan akses ke panel admin dan kembali menjadi pengguna biasa.`,
      confirmLabel: promoting ? "Jadikan Admin" : "Turunkan ke User",
      tone: promoting ? "brand" : "danger",
      action: async () => {
        try {
          setUpdatingUserId(user.id);
          setUsersError(null);
          const res = await api.updateUserRole(token, user.id, nextRole);
          setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
        } catch (err) {
          setUsersError(err instanceof Error ? err.message : "Gagal mengubah role pengguna");
        } finally {
          setUpdatingUserId(null);
        }
      },
    });
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;
    setIsConfirming(true);
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } finally {
      setIsConfirming(false);
    }
  };

  if (status === "loading" || loading || usersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-dark dark:text-brand" />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Memuat Panel Admin...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand text-neutral-950">
              <ShieldAlert className="w-3 h-3" />
              Role: Super Admin
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">Keamanan Enkripsi AES-256-GCM Aktif</span>
          </div>
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Panel Manajemen LLM, Kunci API & Role Pengguna
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Admin dapat mengelola model LLM, kunci API terenkripsi, serta mempromosikan pengguna menjadi admin atau menurunkannya kembali.
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
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Table of LLM Configurations */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Nama Model</th>
                <th className="py-3.5 px-4">Provider & ID Model</th>
                <th className="py-3.5 px-4">OpenAI Base URL</th>
                <th className="py-3.5 px-4">Status Kunci API</th>
                <th className="py-3.5 px-4">Status Pengguna</th>
                <th className="py-3.5 px-4">Ketersediaan</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {configs.map((cfg) => {
                const isUnavailable = cfg.isAvailable === false;
                return (
                <tr key={cfg.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition">
                  {/* Display Name */}
                  <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-dark dark:text-brand shrink-0" />
                      <span>{cfg.displayName}</span>
                    </div>
                  </td>

                  {/* Provider & Model String */}
                  <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300">
                    <span className="inline-block uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 mr-1.5">
                      {cfg.provider}
                    </span>
                    <span className="font-mono text-neutral-900 dark:text-neutral-100">{cfg.modelIdentifier}</span>
                  </td>

                  {/* Base URL */}
                  <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 font-mono text-[11px] max-w-[200px] truncate" title={cfg.baseUrl}>
                    {cfg.baseUrl}
                  </td>

                  {/* Masked API Key */}
                  <td className="py-3.5 px-4">
                    {cfg.hasApiKey ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {cfg.maskedApiKey || "Tersimpan Aman"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        <KeyRound className="w-3 h-3 text-amber-600 dark:text-amber-400" />
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
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {cfg.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Aktif (Dapat Dipilih)</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Availability (manual cooldown override) */}
                  <td className="py-3.5 px-4">
                    {isUnavailable ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                          <XCircle className="w-3 h-3" />
                          Tidak Tersedia
                        </span>
                        {cfg.unavailableUntil && (
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            s.d.{" "}
                            {new Date(cfg.unavailableUntil).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                        {cfg.unavailableReason && (
                          <div
                            className="text-[10px] text-neutral-500 dark:text-neutral-400 max-w-[180px] truncate"
                            title={cfg.unavailableReason}
                          >
                            {cfg.unavailableReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        Tersedia
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenAvailabilityModal(cfg)}
                        title="Atur Ketersediaan Manual"
                        className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(cfg)}
                        title="Edit Model / API Key"
                        className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cfg.id, cfg.displayName)}
                        title="Hapus Model"
                        className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Role Management */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-dark dark:text-brand" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Manajemen Role Pengguna</h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {users.length} akun · {users.filter((u) => u.role === "ADMIN").length} admin
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Perubahan role langsung berlaku pada sesi pengguna terkait.
          </p>
        </div>

        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative max-w-xs w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserPage(1);
              }}
              placeholder="Cari nama atau email..."
              aria-label="Cari pengguna berdasarkan nama atau email"
              className="w-full pl-9 pr-8 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => {
                  setUserSearch("");
                  setUserPage(1);
                }}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter role pengguna"
            className="inline-flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 self-start sm:self-auto"
          >
            <ListFilter className="w-3.5 h-3.5 ml-1.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
            {USER_ROLE_FILTERS.map((option) => {
              const isActive = userRoleFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setUserRoleFilter(option.value);
                    setUserPage(1);
                  }}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {usersError && (
          <div className="m-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-lg">
            {usersError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Role Saat Ini</th>
                <th className="py-3.5 px-4">Proyek</th>
                <th className="py-3.5 px-4">Bergabung</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pagedUsers.map((u) => {
                const isSelf = session?.user?.id === u.id;
                const isUpdating = updatingUserId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[11px] font-bold text-neutral-600 dark:text-neutral-300 shrink-0">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {u.name || u.email.split("@")[0]}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand/20 text-brand-dark dark:text-brand">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                          USER
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400">{u.projectCount}</td>
                    <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserRole(u)}
                        disabled={isSelf || isUpdating}
                        title={isSelf ? "Tidak dapat mengubah role akun sendiri" : undefined}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                          u.role === "ADMIN"
                            ? "text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            : "bg-brand hover:bg-brand-hover text-neutral-950 shadow-sm"
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : u.role === "ADMIN" ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        {u.role === "ADMIN" ? "Turunkan ke User" : "Jadikan Admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-neutral-500 dark:text-neutral-400">
                    {userEmptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Menampilkan {userRangeStart}–{userRangeEnd} dari {filteredUsers.length} pengguna
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setUserPage(Math.max(1, currentUserPage - 1))}
              disabled={currentUserPage <= 1}
              aria-label="Halaman sebelumnya"
              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {userPageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="w-6 text-center text-[11px] text-neutral-400 dark:text-neutral-500"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setUserPage(item)}
                  aria-current={item === currentUserPage ? "page" : undefined}
                  className={`min-w-[28px] h-7 px-2 rounded-lg text-[11px] font-semibold transition ${
                    item === currentUserPage
                      ? "bg-brand text-neutral-950"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setUserPage(Math.min(totalUserPages, currentUserPage + 1))}
              disabled={currentUserPage >= totalUserPages}
              aria-label="Halaman berikutnya"
              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog for Add/Edit LLM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                {editingConfig ? `Edit LLM: ${editingConfig.displayName}` : "Tambah Model LLM Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Provider</label>
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
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  >
                    <option value="google">Google AI (Antigravity/Gemini)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI Compatible</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Nama Tampilan UI</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Antigravity Flash 3.8"
                    required
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Model Identifier (String Model)
                </label>
                <input
                  type="text"
                  value={formData.modelIdentifier}
                  onChange={(e) => setFormData({ ...formData, modelIdentifier: e.target.value })}
                  placeholder="gemini-2.5-flash atau deepseek-chat"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  OpenAI Compatible Base URL
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://..."
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  API Key LLM {editingConfig ? "(Biarkan kosong jika tidak ingin mengubah)" : ""}
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={editingConfig?.hasApiKey ? "Kunci saat ini tersimpan terenkripsi" : "Masukkan API key"}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1">
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
                  className="w-4 h-4 text-brand rounded border-neutral-300 dark:border-neutral-700 focus:ring-brand"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Aktifkan model ini untuk dipilih oleh pengguna
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
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

      {/* Modal Dialog for Manual Availability Override */}
      {availabilityConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-dark dark:text-brand" />
                  Atur Ketersediaan Manual
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {availabilityConfig.displayName}
                </p>
              </div>
              <button
                onClick={() => setAvailabilityConfig(null)}
                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Tidak Tersedia Sampai
                </label>
                <input
                  type="datetime-local"
                  value={availabilityForm.unavailableUntil}
                  onChange={(e) =>
                    setAvailabilityForm((prev) => ({ ...prev, unavailableUntil: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  Kosongkan tanggal lalu simpan untuk menandai model tersedia kembali.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Alasan Tidak Tersedia
                </label>
                <input
                  type="text"
                  value={availabilityForm.unavailableReason}
                  onChange={(e) =>
                    setAvailabilityForm((prev) => ({ ...prev, unavailableReason: e.target.value }))
                  }
                  placeholder="Contoh: Kuota provider habis"
                  disabled={!availabilityForm.unavailableUntil}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setAvailabilityConfig(null)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAvailability}
                  className="px-5 py-2 bg-brand hover:bg-brand-hover text-neutral-950 font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSavingAvailability ? "Menyimpan..." : "Simpan Ketersediaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.confirmLabel}
        tone={pendingConfirm?.tone}
        loading={isConfirming}
        onConfirm={handleConfirmAction}
        onClose={() => {
          if (!isConfirming) setPendingConfirm(null);
        }}
      />
    </div>
  );
}
