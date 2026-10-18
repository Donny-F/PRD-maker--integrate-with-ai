"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, LlmModel } from "@/lib/api";
import { Sparkles, Bot, HelpCircle, ArrowRight, SkipForward, Loader2 } from "lucide-react";

interface QuestionItem {
  id: string;
  question: string;
  context?: string;
  answer?: string;
}

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
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        const res = await api.getModels();
        setModels(res.models);
        if (res.models.length > 0) {
          setSelectedModelId(res.models[0].id);
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  // Step 1: Submit initial prompt and fetch clarifications
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !initialPrompt.trim() || !session?.accessToken) return;

    try {
      setIsSubmittingStep1(true);
      setError(null);

      // 1. Create project
      const created = await api.createProject(session.accessToken, {
        title: title.trim(),
        initialPrompt: initialPrompt.trim(),
      });
      const projectId = created.project.id;
      setCreatedProjectId(projectId);

      // 2. Fetch Clarification Questions
      const clarifyRes = await api.generateClarifications(
        session.accessToken,
        projectId,
        selectedModelId
      );

      setQuestions(clarifyRes.questions);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses Step 1");
    } finally {
      setIsSubmittingStep1(false);
    }
  };

  // Step 2: Skip Clarification directly to PRD generation
  const handleSkipClarifications = async () => {
    if (!createdProjectId || !session?.accessToken) return;

    try {
      setIsSubmittingStep2(true);
      // Save empty clarifications
      await api.saveClarifications(session.accessToken, createdProjectId, []);
      // Navigate to project detail with auto-generation trigger
      router.push(`/projects/${createdProjectId}?generate=true&model=${selectedModelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melewati klarifikasi");
      setIsSubmittingStep2(false);
    }
  };

  // Step 2: Submit Clarification Answers and start PRD generation
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdProjectId || !session?.accessToken) return;

    try {
      setIsSubmittingStep2(true);
      setError(null);

      const formattedAnswers = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id]?.trim() || "Tidak dijawab spesifik",
      }));

      await api.saveClarifications(session.accessToken, createdProjectId, formattedAnswers);

      router.push(`/projects/${createdProjectId}?generate=true&model=${selectedModelId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan jawaban klarifikasi");
      setIsSubmittingStep2(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Step Indicator Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-2">
          <span className={currentStep === 1 ? "text-neutral-900 font-bold" : "text-neutral-400"}>
            Step 1: Ide & Prompt Awal
          </span>
          <span className={currentStep === 2 ? "text-neutral-900 font-bold" : "text-neutral-400"}>
            Step 2: Klarifikasi AI
          </span>
          <span className="text-neutral-400">Step 3-4: Pembuatan PRD & Diagram</span>
        </div>
        <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-brand h-full transition-all duration-300"
            style={{ width: currentStep === 1 ? "33%" : "66%" }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {currentStep === 1 ? (
        /* STEP 1: PROMPTING AWAL */
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Mulai Proyek PRD Baru</h2>
              <p className="text-xs text-neutral-500">
                Pilih model kecerdasan buatan dan jelaskan ide produk Anda sedetail mungkin.
              </p>
            </div>
          </div>

          <form onSubmit={handleStep1Submit} className="space-y-5">
            {/* Model Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Model LLM yang Digunakan
              </label>
              {isLoadingModels ? (
                <div className="h-10 bg-neutral-100 rounded-lg animate-pulse" />
              ) : (
                <div className="relative">
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-neutral-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.provider.toUpperCase()} - {m.modelIdentifier})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Project Title */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Nama / Judul Proyek
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Marketplace B2B Hasil Tani Nusantara"
                required
                className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>

            {/* Initial Prompt */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Deskripsi Ide & Kebutuhan Proyek
              </label>
              <textarea
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                rows={7}
                placeholder="Jelaskan apa yang ingin Anda bangun, masalah yang diselesaikan, target pengguna, dan fitur-fitur utama yang dibayangkan..."
                required
                className="w-full px-3.5 py-3 text-xs leading-relaxed border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-y"
              />
            </div>

            {/* Submit Step 1 */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingStep1 || !title.trim() || !initialPrompt.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isSubmittingStep1 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menganalisis Ide & Menyiapkan Pertanyaan...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjut ke Klarifikasi AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* STEP 2: KLARIFIKASI AI */
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Step 2: Pertanyaan Klarifikasi AI</h2>
                <p className="text-xs text-neutral-500">
                  AI telah menganalisis ide Anda dan memerlukan detail berikut untuk menyusun PRD yang optimal.
                </p>
              </div>
            </div>

            {/* Skip Button (Per PRD specification) */}
            <button
              type="button"
              onClick={handleSkipClarifications}
              disabled={isSubmittingStep2}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Lewati Klarifikasi & Langsung Buat PRD</span>
            </button>
          </div>

          <form onSubmit={handleStep2Submit} className="space-y-5">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-brand text-neutral-950 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 leading-snug">{q.question}</h4>
                    {q.context && (
                      <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-neutral-400 shrink-0" />
                        {q.context}
                      </p>
                    )}
                  </div>
                </div>

                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  rows={2}
                  placeholder="Ketik jawaban atau preferensi Anda..."
                  className="w-full mt-2 px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>
            ))}

            <div className="pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkipClarifications}
                disabled={isSubmittingStep2}
                className="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
              >
                Lewati pertanyaan dan gunakan asumsi default AI
              </button>

              <button
                type="submit"
                disabled={isSubmittingStep2}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isSubmittingStep2 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyiapkan Dokumen PRD...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Jawaban & Buat PRD</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
