"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, LlmModel } from "@/lib/api";
import { LlmModelSelect } from "@/components/ui/LlmModelSelect";
import {
  AlertCircle,
  ArrowRight,
  HelpCircle,
  Loader2,
  SkipForward,
} from "lucide-react";

interface QuestionItem {
  id: string;
  question: string;
  context?: string;
  answer?: string;
}

const FLOW_STEPS = [
  { label: "Ide & prompt awal" },
  { label: "Klarifikasi AI" },
  { label: "Dokumen PRD" },
  { label: "Diagram alur" },
] as const;

export default function NewProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Step state: 1 (Prompting) -> 2 (Clarification)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form states
  const [models, setModels] = useState<LlmModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");

  // Clarification states
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Loading states
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isSubmittingStep1, setIsSubmittingStep1] = useState(false);
  const [isSubmittingStep2, setIsSubmittingStep2] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      const res = await api.getModels();
      setModels(res.models);
      setSelectedModelId((current) => {
        const currentModel = res.models.find((m) => m.id === current);
        if (currentModel && currentModel.isAvailable !== false) {
          return current;
        }
        return res.models.find((m) => m.isAvailable !== false)?.id ?? "";
      });
    } catch (err) {
      console.error("Failed to load models:", err);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Step 1: Submit initial prompt and fetch clarifications
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !initialPrompt.trim() || !selectedModelId || !session?.accessToken) return;

    try {
      setIsSubmittingStep1(true);
      setError(null);

      // Generate questions first: no project is persisted if the provider fails.
      const clarifyRes = await api.generateClarifications(
        session.accessToken,
        initialPrompt.trim(),
        selectedModelId
      );

      setQuestions(clarifyRes.questions);
      setCurrentStep(2);
    } catch (err) {
      // A provider quota error also marks the model unavailable server-side.
      // Refresh so the dropdown reflects the cooldown immediately.
      await fetchModels();
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses Step 1");
    } finally {
      setIsSubmittingStep1(false);
    }
  };

  // Step 2: Skip Clarification directly to PRD generation
  const handleSkipClarifications = async () => {
    if (!session?.accessToken) return;

    try {
      setIsSubmittingStep2(true);
      setError(null);
      const created = await api.createProject(session.accessToken, {
        title: title.trim(),
        initialPrompt: initialPrompt.trim(),
        clarifications: [],
      });
      router.push(`/projects/${created.project.id}?generate=true&model=${selectedModelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melewati klarifikasi");
      setIsSubmittingStep2(false);
    }
  };

  // Step 2: Submit Clarification Answers and start PRD generation
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.accessToken) return;

    try {
      setIsSubmittingStep2(true);
      setError(null);

      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id]?.trim() || "Tidak dijawab spesifik",
      }));

      const created = await api.createProject(session.accessToken, {
        title: title.trim(),
        initialPrompt: initialPrompt.trim(),
        clarifications: formattedAnswers,
      });

      router.push(`/projects/${created.project.id}?generate=true&model=${selectedModelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan jawaban klarifikasi");
      setIsSubmittingStep2(false);
    }
  };

  return (
    <div className="create-layout">
      <aside className="create-aside">
        <h1 className="create-aside__title">Mulai PRD baru.</h1>
        <p className="create-aside__text">
          Tulis idenya sekali. AI akan membaca konteks, menanyakan hal yang belum
          jelas, lalu menyusun dokumen dan diagram dalam satu alur.
        </p>

        <ol className="step-rail" aria-label="Tahapan pembuatan PRD">
          {FLOW_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const state =
              currentStep > stepNumber
                ? "done"
                : currentStep === stepNumber
                  ? "active"
                  : "pending";

            return (
              <li
                key={step.label}
                className="step-rail__item"
                data-state={state}
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className="step-rail__mark" aria-hidden />
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div
          className="progress"
          role="progressbar"
          aria-label="Progres pembuatan PRD"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentStep === 1 ? 25 : 50}
        >
          <div
            className="progress__fill"
            style={{ width: currentStep === 1 ? "25%" : "50%" }}
          />
        </div>
        <p className="field-help">
          Dokumen dan diagram dibuat otomatis setelah klarifikasi selesai.
        </p>
      </aside>

      <section className="panel form-panel">
        <div className="panel__head" style={{ padding: 0, border: 0, marginBottom: 20 }}>
          <div>
            <h2 className="app-section-title">
              {currentStep === 1 ? "Ide & prompt awal" : "Klarifikasi AI"}
            </h2>
            <p className="app-section-sub">
              {currentStep === 1
                ? "Pilih model dan jelaskan produk yang ingin dibangun."
                : "Jawab yang relevan, atau lewati dan biarkan AI memakai asumsi default."}
            </p>
          </div>
          {currentStep === 2 && (
            <button
              type="button"
              onClick={handleSkipClarifications}
              disabled={isSubmittingStep2}
              className="btn btn--secondary btn--sm"
            >
              <SkipForward />
              <span>Lewati klarifikasi</span>
            </button>
          )}
        </div>

        {error && (
          <div className="notice notice--danger" style={{ marginBottom: 18 }}>
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {currentStep === 1 ? (
          <form onSubmit={handleStep1Submit}>
            <div className="form-grid">
              <LlmModelSelect
                models={models}
                value={selectedModelId}
                onChange={setSelectedModelId}
                isLoading={isLoadingModels}
              />
              {!isLoadingModels && models.some((m) => m.isAvailable === false) && (
                <p className="notice notice--warning">
                  <AlertCircle />
                  <span>
                    Model yang limitnya habis dinonaktifkan sementara sampai masa
                    cooldown berakhir.
                  </span>
                </p>
              )}
              {!isLoadingModels && models.length > 0 && !models.some((m) => m.isAvailable !== false) && (
                <p className="notice notice--danger">
                  <AlertCircle />
                  <span>
                    Semua model sedang mencapai limit. Tunggu masa cooldown atau
                    hubungi admin.
                  </span>
                </p>
              )}

              <div>
                <label htmlFor="project-title" className="field-label">
                  Nama proyek
                </label>
                <input
                  id="project-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Marketplace B2B Hasil Tani Nusantara"
                  required
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="project-prompt" className="field-label">
                  Ide & kebutuhan produk
                </label>
                <textarea
                  id="project-prompt"
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  rows={8}
                  placeholder="Jelaskan apa yang ingin dibangun, masalah yang diselesaikan, target pengguna, dan fitur utama yang dibayangkan..."
                  required
                  className="field"
                />
                <p className="field-help">
                  Semakin spesifik konteksnya, semakin sedikit pertanyaan lanjutan
                  yang perlu dijawab.
                </p>
              </div>
            </div>

            <div className="form-actions">
              <span className="field-help">
                Langkah berikutnya: klarifikasi singkat dari model terpilih.
              </span>
              <button
                type="submit"
                disabled={
                  isSubmittingStep1 ||
                  !title.trim() ||
                  !initialPrompt.trim() ||
                  !selectedModelId
                }
                className="btn btn--primary"
              >
                {isSubmittingStep1 ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>Menyiapkan pertanyaan...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjut ke klarifikasi</span>
                    <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit}>
            <div className="notice notice--info" style={{ marginBottom: 18 }}>
              <HelpCircle />
              <span>
                Model yang dipilih di bawah dipakai untuk menyusun PRD setelah
                jawaban dikirim.
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <LlmModelSelect
                models={models}
                value={selectedModelId}
                onChange={setSelectedModelId}
                isLoading={isLoadingModels}
                label="Model LLM untuk membuat PRD"
              />
            </div>

            <div className="stack">
              {questions.map((q, idx) => (
                <div key={q.id} className="question-card">
                  <div className="question-card__head">
                    <span className="question-card__number" aria-hidden>
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="question-card__question">{q.question}</h3>
                      {q.context && (
                        <p className="question-card__context">
                          <HelpCircle />
                          <span>{q.context}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <label htmlFor={`answer-${q.id}`} className="field-label" style={{ marginTop: 10 }}>
                    Jawaban
                  </label>
                  <textarea
                    id={`answer-${q.id}`}
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Ketik jawaban atau preferensi Anda..."
                    className="field"
                  />
                </div>
              ))}
            </div>

            <div className="form-actions" style={{ marginTop: 22 }}>
              <button
                type="button"
                onClick={handleSkipClarifications}
                disabled={isSubmittingStep2}
                className="btn btn--quiet"
              >
                Gunakan asumsi default AI
              </button>

              <button
                type="submit"
                disabled={isSubmittingStep2}
                className="btn btn--primary"
              >
                {isSubmittingStep2 ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>Menyiapkan PRD...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim jawaban & buat PRD</span>
                    <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
