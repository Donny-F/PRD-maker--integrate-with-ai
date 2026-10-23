"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, AdminLlmConfig, AdminUser } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ConfirmTone } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  ShieldCheck,
  AlertCircle,
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
      <div className="app-loading" style={{ minHeight: "50vh" }}>
        <Loader2 className="animate-spin" />
        <span>Memuat panel admin...</span>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <div className="app-page-head" style={{ marginBottom: 0 }}>
        <div className="app-page-head__copy">
          <h1 className="app-page-title">Panel admin</h1>
          <p className="app-page-sub">
            Kelola model LLM, kunci API terenkripsi, dan role pengguna dari satu
            tempat.
          </p>
        </div>

        <div className="app-page-actions">
          <button type="button" onClick={handleOpenCreateModal} className="btn btn--primary">
            <Plus />
            <span>Tambah model</span>
          </button>
        </div>
      </div>

      <section className="admin-summary" aria-label="Ringkasan admin">
        <div className="admin-summary__item">
          <div className="admin-summary__label">Model terdaftar</div>
          <div className="admin-summary__value">{configs.length}</div>
        </div>
        <div className="admin-summary__item">
          <div className="admin-summary__label">Model aktif</div>
          <div className="admin-summary__value">
            {configs.filter((config) => config.isActive).length}
          </div>
        </div>
        <div className="admin-summary__item">
          <div className="admin-summary__label">Pengguna</div>
          <div className="admin-summary__value">{users.length}</div>
        </div>
        <div className="admin-summary__item">
          <div className="admin-summary__label">Admin</div>
          <div className="admin-summary__value">
            {users.filter((user) => user.role === "ADMIN").length}
          </div>
        </div>
      </section>

      {error && (
        <div className="notice notice--danger">
          <XCircle />
          <span>{error}</span>
        </div>
      )}

      {/* Table of LLM Configurations */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="app-section-title">Model LLM</h2>
            <p className="app-section-sub">
              Model aktif dapat dipilih pengguna saat membuat atau merevisi PRD.
            </p>
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>Nama model</th>
                <th>Provider & ID</th>
                <th>Base URL</th>
                <th>Kunci API</th>
                <th>Status</th>
                <th>Ketersediaan</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg) => {
                const isUnavailable = cfg.isAvailable === false;
                return (
                  <tr key={cfg.id}>
                    <td>
                      <div className="cell-strong">{cfg.displayName}</div>
                    </td>

                    <td data-label="Provider">
                      <span className="chip chip--neutral" style={{ marginRight: 6 }}>
                        {cfg.provider}
                      </span>
                      <span className="field-mono">{cfg.modelIdentifier}</span>
                    </td>

                    <td
                      className="field-mono"
                      data-label="Base URL"
                      style={{ maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis" }}
                      title={cfg.baseUrl}
                    >
                      {cfg.baseUrl}
                    </td>

                    <td data-label="Kunci API">
                      {cfg.hasApiKey ? (
                        <span className="chip chip--success">
                          <Lock />
                          {cfg.maskedApiKey || "Tersimpan"}
                        </span>
                      ) : (
                        <span className="chip chip--warning">
                          <KeyRound />
                          Belum diatur
                        </span>
                      )}
                    </td>

                    <td data-label="Status">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cfg)}
                        className={`chip ${cfg.isActive ? "chip--success" : "chip--neutral"}`}
                        title="Ubah status model"
                      >
                        {cfg.isActive ? <CheckCircle /> : <XCircle />}
                        <span>{cfg.isActive ? "Aktif" : "Nonaktif"}</span>
                      </button>
                    </td>

                    <td data-label="Ketersediaan">
                      {isUnavailable ? (
                        <div>
                          <span className="chip chip--danger">
                            <XCircle />
                            Tidak tersedia
                          </span>
                          {cfg.unavailableUntil && (
                            <div className="app-meta" style={{ marginTop: 4, fontSize: 10.5 }}>
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
                              className="app-meta"
                              style={{ marginTop: 3, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              title={cfg.unavailableReason}
                            >
                              {cfg.unavailableReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="chip chip--success">
                          <CheckCircle />
                          Tersedia
                        </span>
                      )}
                    </td>

                    <td className="cell-actions" data-label="Aksi">
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => handleOpenAvailabilityModal(cfg)}
                          title="Atur ketersediaan manual"
                          className="row-action"
                        >
                          <Clock />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cfg)}
                          title="Edit model atau API key"
                          className="row-action"
                        >
                          <Edit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cfg.id, cfg.displayName)}
                          title="Hapus model"
                          className="row-action row-action--danger"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* User Role Management */}
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="app-section-title">Role pengguna</h2>
            <p className="app-section-sub">
              {users.length} akun · {users.filter((u) => u.role === "ADMIN").length} admin.
              Perubahan role berlaku pada sesi pengguna terkait.
            </p>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-field">
            <Search />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserPage(1);
              }}
              placeholder="Cari nama atau email..."
              aria-label="Cari pengguna berdasarkan nama atau email"
              className="field"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => {
                  setUserSearch("");
                  setUserPage(1);
                }}
                aria-label="Hapus pencarian"
                className="search-field__clear"
              >
                <X />
              </button>
            )}
          </div>

          <div className="toolbar__group">
            <ListFilter
              aria-hidden
              style={{ width: 14, height: 14, color: "var(--app-muted)" }}
            />
            <div className="segmented" role="group" aria-label="Filter role pengguna">
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
                    className="segmented__item"
                    data-active={isActive ? "true" : "false"}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {usersError && (
          <div style={{ padding: "14px 18px" }}>
            <div className="notice notice--danger">
              <AlertCircle />
              <span>{usersError}</span>
            </div>
          </div>
        )}

        <div className="data-table-wrap">
          <table className="data-table data-table--stack">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Role</th>
                <th className="num">Proyek</th>
                <th>Bergabung</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((u) => {
                const isSelf = session?.user?.id === u.id;
                const isUpdating = updatingUserId === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-cell__avatar" aria-hidden>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="user-cell__name">
                            <span>{u.name || u.email.split("@")[0]}</span>
                            {isSelf && <span className="chip chip--accent">Anda</span>}
                          </div>
                          <div className="user-cell__email">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td data-label="Role">
                      {u.role === "ADMIN" ? (
                        <span className="chip chip--success">
                          <ShieldCheck />
                          Admin
                        </span>
                      ) : (
                        <span className="chip chip--neutral">User</span>
                      )}
                    </td>

                    <td className="num" data-label="Proyek">{u.projectCount}</td>
                    <td data-label="Bergabung">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="cell-actions" data-label="Aksi">
                      <button
                        type="button"
                        onClick={() => handleToggleUserRole(u)}
                        disabled={isSelf || isUpdating}
                        title={isSelf ? "Tidak dapat mengubah role akun sendiri" : undefined}
                        className="btn btn--secondary btn--sm"
                      >
                        {isUpdating ? (
                          <Loader2 className="animate-spin" />
                        ) : u.role === "ADMIN" ? (
                          <XCircle />
                        ) : (
                          <ShieldCheck />
                        )}
                        <span>
                          {u.role === "ADMIN" ? "Turunkan ke user" : "Jadikan admin"}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-empty">
                    {userEmptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel__foot">
          <p className="app-meta">
            Menampilkan {userRangeStart}–{userRangeEnd} dari {filteredUsers.length} pengguna
          </p>

          <div className="pagination">
            <button
              type="button"
              onClick={() => setUserPage(Math.max(1, currentUserPage - 1))}
              disabled={currentUserPage <= 1}
              aria-label="Halaman sebelumnya"
              className="pagination__arrow"
            >
              <ChevronLeft />
            </button>

            {userPageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  style={{ width: 24, textAlign: "center", color: "var(--app-faint)", fontSize: 11 }}
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setUserPage(item)}
                  aria-current={item === currentUserPage ? "page" : undefined}
                  className="pagination__page"
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
              className="pagination__arrow"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Dialog for Add/Edit LLM */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="llm-modal-title"
          >
            <div className="modal__head">
              <div>
                <h2 id="llm-modal-title" className="modal__title">
                  {editingConfig
                    ? `Edit model: ${editingConfig.displayName}`
                    : "Tambah model LLM"}
                </h2>
                <p className="modal__sub">
                  Konfigurasi ini dipakai seluruh workspace saat memanggil provider.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup dialog"
                className="modal__close"
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-grid form-grid--split">
                  <div>
                    <label htmlFor="llm-provider" className="field-label">
                      Provider
                    </label>
                    <select
                      id="llm-provider"
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
                      className="select"
                    >
                      <option value="google">Google AI (Antigravity/Gemini)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openai">OpenAI Compatible</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="llm-name" className="field-label">
                      Nama tampilan
                    </label>
                    <input
                      id="llm-name"
                      type="text"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      placeholder="Antigravity Flash 3.8"
                      required
                      className="field"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="llm-model" className="field-label">
                    Model identifier
                  </label>
                  <input
                    id="llm-model"
                    type="text"
                    value={formData.modelIdentifier}
                    onChange={(e) =>
                      setFormData({ ...formData, modelIdentifier: e.target.value })
                    }
                    placeholder="gemini-2.5-flash atau deepseek-chat"
                    required
                    className="field field-mono"
                  />
                </div>

                <div>
                  <label htmlFor="llm-base-url" className="field-label">
                    OpenAI compatible base URL
                  </label>
                  <input
                    id="llm-base-url"
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="https://..."
                    required
                    className="field field-mono"
                  />
                </div>

                <div>
                  <label htmlFor="llm-api-key" className="field-label">
                    API key{" "}
                    {editingConfig ? "(kosongkan jika tidak diubah)" : ""}
                  </label>
                  <input
                    id="llm-api-key"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder={
                      editingConfig?.hasApiKey
                        ? "Kunci saat ini tersimpan terenkripsi"
                        : "Masukkan API key"
                    }
                    className="field"
                  />
                  <p className="field-help">
                    <Lock
                      style={{ display: "inline", width: 11, height: 11, marginRight: 4 }}
                    />
                    Kunci dienkripsi AES-256-GCM di server sebelum disimpan.
                  </p>
                </div>

                <div className="toolbar__group">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    style={{ width: 16, height: 16, accentColor: "var(--app-accent)" }}
                  />
                  <label htmlFor="isActiveToggle" className="field-label" style={{ margin: 0 }}>
                    Aktif dan dapat dipilih pengguna
                  </label>
                </div>
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn--secondary"
                >
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className="btn btn--primary">
                  {isSaving ? "Menyimpan..." : "Simpan konfigurasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog for Manual Availability Override */}
      {availabilityConfig && (
        <div className="modal-backdrop">
          <div
            className="modal modal--sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-modal-title"
          >
            <div className="modal__head">
              <div>
                <h2 id="availability-modal-title" className="modal__title">
                  Atur ketersediaan
                </h2>
                <p className="modal__sub">{availabilityConfig.displayName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAvailabilityConfig(null)}
                aria-label="Tutup dialog"
                className="modal__close"
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleSaveAvailability}>
              <div className="form-grid">
                <div>
                  <label htmlFor="unavailable-until" className="field-label">
                    Tidak tersedia sampai
                  </label>
                  <input
                    id="unavailable-until"
                    type="datetime-local"
                    value={availabilityForm.unavailableUntil}
                    onChange={(e) =>
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        unavailableUntil: e.target.value,
                      }))
                    }
                    className="field"
                  />
                  <p className="field-help">
                    Kosongkan tanggal lalu simpan untuk menandai model tersedia
                    kembali.
                  </p>
                </div>

                <div>
                  <label htmlFor="unavailable-reason" className="field-label">
                    Alasan
                  </label>
                  <input
                    id="unavailable-reason"
                    type="text"
                    value={availabilityForm.unavailableReason}
                    onChange={(e) =>
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        unavailableReason: e.target.value,
                      }))
                    }
                    placeholder="Contoh: Kuota provider habis"
                    disabled={!availabilityForm.unavailableUntil}
                    className="field"
                  />
                </div>
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  onClick={() => setAvailabilityConfig(null)}
                  className="btn btn--secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAvailability}
                  className="btn btn--primary"
                >
                  {isSavingAvailability ? "Menyimpan..." : "Simpan ketersediaan"}
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
