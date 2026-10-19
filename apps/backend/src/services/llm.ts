import OpenAI from "openai";
import { prisma } from "../db";
import { decryptApiKey } from "../utils/crypto";
import {
  DiagramData,
  DiagramDataSchema,
  ClarificationQuestions,
  ClarificationQuestionsSchema,
} from "../schemas/diagram";

const DEFAULT_QUOTA_COOLDOWN_MS = 15 * 60 * 1000;

type ProviderErrorShape = {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
  error?: { code?: string; type?: string; message?: string };
  headers?: { get?: (name: string) => string | null } | Record<string, string>;
};

// OpenAI-compatible providers signal exhausted quota through several shapes:
// HTTP 402 with "Insufficient Balance" (DeepSeek), a dedicated error code, or
// HTTP 429. All of them mean the account cannot pay for more requests, so the
// model must be hidden from the picker until the cooldown expires.
function isQuotaExhaustedError(error: unknown): boolean {
  const e = (error ?? {}) as ProviderErrorShape;
  const code = e.code ?? e.error?.code;
  const type = e.type ?? e.error?.type;
  const message = `${e.message ?? ""} ${e.error?.message ?? ""}`;

  if (code === "insufficient_quota" || type === "insufficient_quota") return true;
  // Payment Required is unambiguous: the provider rejected the request for
  // billing reasons regardless of the wording of the message.
  if (e.status === 402) return true;
  if (e.status === 429) return true;
  if (e.status === 403) {
    return /quota|billing|credit|balance|payment/i.test(message);
  }
  return /insufficient[_\s-]?(quota|balance|credit|funds)|exceeded your current quota|resource[_\s-]?exhausted|quota exceeded|billing|payment required|no credit/i.test(
    message
  );
}

export class LlmQuotaExhaustedError extends Error {
  constructor(displayName: string, until: Date) {
    super(
      `Kuota model ${displayName} habis. Model dinonaktifkan sementara sampai ${until.toLocaleString(
        "id-ID"
      )}. Silakan pilih model lain.`
    );
    this.name = "LlmQuotaExhaustedError";
  }
}

function getRetryAfterMs(error: unknown): number | null {
  const headers = (error as ProviderErrorShape | undefined)?.headers;
  if (!headers) return null;

  const headerBag = headers as Record<string, string | undefined>;
  const raw =
    typeof headers.get === "function"
      ? headers.get("retry-after")
      : headerBag["retry-after"] ?? headerBag["Retry-After"];
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(5_000, Math.min(seconds * 1000, 60 * 60 * 1000));
  }

  const date = Date.parse(raw);
  if (!Number.isNaN(date)) {
    return Math.max(5_000, Math.min(date - Date.now(), 60 * 60 * 1000));
  }
  return null;
}

async function markQuotaExhausted(configId: string, error: unknown): Promise<Date | null> {
  if (!isQuotaExhaustedError(error)) return null;

  const cooldownMs = getRetryAfterMs(error) ?? DEFAULT_QUOTA_COOLDOWN_MS;
  const unavailableUntil = new Date(Date.now() + cooldownMs);
  try {
    await prisma.llmConfig.update({
      where: { id: configId },
      data: {
        unavailableUntil,
        unavailableReason: "Kuota/limit provider habis",
      },
    });
  } catch (updateError) {
    console.warn("Failed to persist LLM quota cooldown:", updateError);
  }
  return unavailableUntil;
}

async function withQuotaTracking<T>(
  config: { id: string; displayName: string },
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const unavailableUntil = await markQuotaExhausted(config.id, error);
    if (unavailableUntil) {
      throw new LlmQuotaExhaustedError(config.displayName, unavailableUntil);
    }
    throw error;
  }
}

async function getLlmClient(llmConfigId?: string) {
  const now = new Date();
  let config = llmConfigId
    ? await prisma.llmConfig.findUnique({ where: { id: llmConfigId } })
    : await prisma.llmConfig.findFirst({
        where: {
          isActive: true,
          OR: [{ unavailableUntil: null }, { unavailableUntil: { lte: now } }],
        },
      });

  if (!config) {
    config = await prisma.llmConfig.findFirst({ where: { isActive: true } });
  }

  if (!config) {
    config = await prisma.llmConfig.findFirst();
  }

  if (!config) {
    throw new Error("No LLM configuration found in database");
  }

  if (config.unavailableUntil && config.unavailableUntil > now) {
    throw new LlmQuotaExhaustedError(config.displayName, config.unavailableUntil);
  }

  let apiKey = "";
  if (config.encryptedApiKey) {
    try {
      apiKey = decryptApiKey(config.encryptedApiKey);
    } catch {
      console.warn("Failed to decrypt API key from database for config:", config.id);
    }
  }

  if (!apiKey) {
    if (config.provider.toLowerCase().includes("google")) {
      apiKey = process.env.GEMINI_API_KEY || "";
    } else if (config.provider.toLowerCase().includes("deepseek")) {
      apiKey = process.env.DEEPSEEK_API_KEY || "";
    }
  }

  return {
    config,
    apiKey,
    client: apiKey
      ? new OpenAI({
          baseURL: config.baseUrl,
          apiKey,
        })
      : null,
  };
}

export async function generateClarifications(
  initialPrompt: string,
  llmConfigId?: string
): Promise<ClarificationQuestions> {
  const { config, apiKey, client } = await getLlmClient(llmConfigId);

  if (!client || !apiKey) {
    // Realistic fallback mock when API key is not configured yet in local dev
    return {
      questions: [
        {
          id: "q1",
          question: "Siapa target pengguna utama aplikasi ini (B2B, B2C, atau tim internal)?",
          context: "Menentukan pendekatan UI/UX dan alur onboarding",
        },
        {
          id: "q2",
          question: "Apakah sistem memerlukan integrasi pihak ketiga spesifik (misal Payment Gateway atau Email Service)?",
          context: "Menentukan arsitektur backend dan skema database",
        },
        {
          id: "q3",
          question: "Fitur apa yang wajib ada di rilis MVP pertama kali vs fitur yang bisa ditunda ke Fase 2?",
          context: "Memetakan batas ruang lingkup rilis pertama",
        },
      ],
    };
  }

  const prompt = `Pengguna ingin membuat produk dengan ide awal berikut:
"${initialPrompt}"

Buat 3 sampai 5 pertanyaan klarifikasi terstruktur dalam Bahasa Indonesia untuk melengkapi detail kebutuhan fungsional dan teknis.
Balas HANYA dengan JSON valid dengan format:
{
  "questions": [
    {
      "id": "q1",
      "question": "pertanyaan",
      "context": "konteks penjelasan singkat mengapa ini penting"
    }
  ]
}`;

  const response = await withQuotaTracking(config, () =>
    client.chat.completions.create({
      model: config.modelIdentifier,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah Senior Product Manager profesional. Kembalikan HANYA format JSON valid tanpa tanda markdown ```json.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    })
  );

  const content = response.choices[0]?.message?.content || "";
  const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return ClarificationQuestionsSchema.parse(parsed);
  } catch {
    return {
      questions: [
        {
          id: "q1",
          question: "Siapa target pengguna utama aplikasi ini?",
          context: "Menentukan alur navigasi dan kebutuhan fungsional",
        },
        {
          id: "q2",
          question: "Apakah ada batasan arsitektur atau teknologi khusus?",
          context: "Menentukan kebutuhan non-fungsional",
        },
        {
          id: "q3",
          question: "Apa 3 fitur paling kritis untuk peluncuran MVP?",
          context: "Fokus prioritas Fase 1",
        },
      ],
    };
  }
}

export async function streamPRDDocument(
  params: {
    initialPrompt: string;
    clarifications?: Array<{ question: string; answer: string }> | null;
    llmConfigId?: string;
  },
  onChunk: (chunk: string) => void
): Promise<string> {
  const { initialPrompt, clarifications, llmConfigId } = params;
  const { config, apiKey, client } = await getLlmClient(llmConfigId);

  const clarificationText =
    clarifications && clarifications.length > 0
      ? clarifications
          .map((c, i) => `Pertanyaan ${i + 1}: ${c.question}\nJawaban: ${c.answer}`)
          .join("\n\n")
      : "Tidak ada klarifikasi tambahan (dilewati oleh pengguna).";

  const userPrompt = `Ide Proyek:\n${initialPrompt}\n\nKlarifikasi Tambahan:\n${clarificationText}\n\nBuat dokumen PRD lengkap, formal, dan komprehensif dalam Bahasa Indonesia menggunakan Markdown.`;

  if (!client || !apiKey) {
    const mockPRD = `# Product Requirements Document (PRD)

## 1. Ringkasan Eksekutif & Tujuan
Aplikasi ini dirancang untuk menyelesaikan kebutuhan: ${initialPrompt.slice(0, 100)}...
Tujuan utamanya adalah menyediakan solusi digital yang efisien, handal, dan mudah digunakan oleh pengguna sasaran.

## 2. Target Pengguna & Persona
- **Admin**: Mengelola konfigurasi sistem, data master, dan pemantauan aktivitas.
- **Pengguna Utama**: Melakukan operasional harian, input data, dan meninjau hasil dokumen/laporan.

## 3. Ruang Lingkup & Kebutuhan Fungsional

### Fase 1: MVP (Prioritas Utama)
- **Autentikasi & Pengelolaan Akun**: Sistem login berbasis token JWT dan Role-Based Access Control (Admin & User).
- **Manajemen Proyek**: Membuat, mengedit, melihat riwayat versi, dan menghapus proyek.
- **Pembuatan Dokumen**: Pembuatan otomatis dokumen PRD dengan streaming Server-Sent Events (SSE).
- **Visualisasi Bagan**: Bagan arsitektur otomatis dengan layout kiri-ke-kanan (LR).

### Fase 2: Peningkatan & Integrasi
- Sistem notifikasi dan pelacakan audit trail mendalam.
- Integrasi ke task management tool pihak ketiga.

## 4. Kebutuhan Non-Fungsional
- **Performa**: Waktu muat awal halaman di bawah 2 detik.
- **Keamanan**: Data sensitif seperti API key dienkripsi menggunakan standar AES-256-GCM.
- **Ketersediaan**: Target uptime 99.9%.

## 5. Arsitektur Teknis
- **Frontend**: Next.js, Tailwind CSS, shadcn-ui, React Flow.
- **Backend**: Express.js, TypeScript, PostgreSQL dengan Prisma ORM.
- **Infrastruktur**: Kontainer Docker dan pipeline monorepo Turborepo.

## 6. Metrik Keberhasilan (KPI)
- Adopsi pengguna aktif mingguan meningkat 30%.
- Kecepatan penyelesaian dokumen PRD meningkat hingga 70% dibanding proses manual.
`;

    // Stream mock chunk by chunk with small delays for natural feel
    const words = mockPRD.split(" ");
    let fullText = "";
    for (let i = 0; i < words.length; i += 6) {
      const slice = words.slice(i, i + 6).join(" ") + " ";
      fullText += slice;
      onChunk(slice);
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 10);
      await promise;
    }
    return fullText;
  }

  const stream = await withQuotaTracking(config, () =>
    client.chat.completions.create({
      model: config.modelIdentifier,
      messages: [
        {
          role: "system",
          content: `Anda adalah Senior Product Manager profesional dan enterprise technical architect.
Tugas Anda adalah membuat dokumen PRD (Product Requirements Document) yang sangat detail, terstruktur, dan siap pakai dalam format Markdown standar.
Gunakan Bahasa Indonesia formal (corporate style).
Sertakan struktur berikut secara lengkap:
# [Nama Proyek] - Product Requirements Document (PRD)
## 1. Ringkasan Eksekutif & Tujuan
## 2. Target Pengguna & Persona
## 3. Ruang Lingkup & Kebutuhan Fungsional (Fase 1: MVP, Fase 2: Lanjutan)
## 4. Kebutuhan Non-Fungsional (Keamanan, Performa, Skalabilitas)
## 5. Arsitektur Teknis & Tech Stack
## 6. Alur Pengguna (User Flow)
## 7. Metrik Keberhasilan (KPI)`,
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      stream: true,
    })
  );

  let fullResponse = "";
  await withQuotaTracking(config, async () => {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        fullResponse += text;
        onChunk(text);
      }
    }
  });

  return fullResponse;
}

export async function generateDiagramData(
  prdContent: string,
  llmConfigId?: string
): Promise<DiagramData> {
  const { config, apiKey, client } = await getLlmClient(llmConfigId);

  const systemPrompt = `Anda adalah Software Architect & Visual System Designer.
Tugas Anda: Ekstrak struktur hierarki fitur dari isi dokumen PRD berikut menjadi Nodes & Edges terstruktur untuk kanvas alur kiri-ke-kanan (LR).

Aturan Hirarki Wajib:
1. "epic" (Root): 1 node nama proyek paling kiri (id: "epic-root", type: "epic").
2. "feature" (Cabang): Node modul atau fitur utama yang terhubung langsung dari epic. Wajib menyertakan properti 'phase' (contoh: "Fase 1" atau "Fase 2", type: "feature").
3. "subfeature" (Daun): Detail atau checklist spesifik di dalam fitur tersebut, terhubung dari feature (type: "subfeature").

Format balasan WAJIB murni JSON tanpa tanda kutip markdown \`\`\`json:
{
  "nodes": [
    { "id": "epic-root", "label": "Nama Sistem PRD", "type": "epic" },
    { "id": "feat-auth", "label": "Sistem Autentikasi", "phase": "Fase 1", "type": "feature" },
    { "id": "sub-jwt", "label": "JWT & Dev Credentials", "type": "subfeature" }
  ],
  "edges": [
    { "source": "epic-root", "target": "feat-auth" },
    { "source": "feat-auth", "target": "sub-jwt" }
  ]
}`;

  if (!client || !apiKey) {
    // High-quality deterministic fallback graph matching the PRD hierarchy
    return {
      nodes: [
        { id: "epic-root", label: "Sistem Aplikasi PRD", type: "epic" },
        { id: "feat-auth", label: "Autentikasi & Akun", phase: "Fase 1", type: "feature" },
        { id: "feat-prd", label: "Generator PRD & SSE", phase: "Fase 1", type: "feature" },
        { id: "feat-diagram", label: "Visualisasi Diagram", phase: "Fase 1", type: "feature" },
        { id: "feat-admin", label: "Panel Manajemen Admin", phase: "Fase 2", type: "feature" },
        { id: "sub-login", label: "OAuth & Dev Mock Login", type: "subfeature" },
        { id: "sub-rbac", label: "Role-Based Access Control", type: "subfeature" },
        { id: "sub-sse", label: "Realtime Streaming Output", type: "subfeature" },
        { id: "sub-export-md", label: "Ekspor Dokumen .md", type: "subfeature" },
        { id: "sub-dagre", label: "Kalkulasi Layout Otomatis Dagre", type: "subfeature" },
        { id: "sub-export-png", label: "Ekspor Bagan PNG 2x", type: "subfeature" },
        { id: "sub-llm-cfg", label: "Manajemen Kunci API & Model", type: "subfeature" },
      ],
      edges: [
        { source: "epic-root", target: "feat-auth" },
        { source: "epic-root", target: "feat-prd" },
        { source: "epic-root", target: "feat-diagram" },
        { source: "epic-root", target: "feat-admin" },
        { source: "feat-auth", target: "sub-login" },
        { source: "feat-auth", target: "sub-rbac" },
        { source: "feat-prd", target: "sub-sse" },
        { source: "feat-prd", target: "sub-export-md" },
        { source: "feat-diagram", target: "sub-dagre" },
        { source: "feat-diagram", target: "sub-export-png" },
        { source: "feat-admin", target: "sub-llm-cfg" },
      ],
    };
  }

  const response = await withQuotaTracking(config, () =>
    client.chat.completions.create({
      model: config.modelIdentifier,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Berikut isi dokumen PRD:\n\n${prdContent}` },
      ],
      temperature: 0.2,
    })
  );

  const content = response.choices[0]?.message?.content || "";
  const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return DiagramDataSchema.parse(parsed);
  } catch (err) {
    console.warn("Failed to parse LLM diagram JSON output, using structured fallback:", err);
    return {
      nodes: [
        { id: "epic-root", label: "Project Core", type: "epic" },
        { id: "feat-core", label: "Fitur Utama", phase: "Fase 1", type: "feature" },
        { id: "sub-core", label: "Implementasi Layanan", type: "subfeature" },
      ],
      edges: [
        { source: "epic-root", target: "feat-core" },
        { source: "feat-core", target: "sub-core" },
      ],
    };
  }
}

export async function streamPRDRevision(
  params: {
    currentPrd: string;
    revisionPrompt: string;
    llmConfigId?: string;
  },
  onChunk: (chunk: string) => void
): Promise<string> {
  const { currentPrd, revisionPrompt, llmConfigId } = params;
  const { config, apiKey, client } = await getLlmClient(llmConfigId);

  const prompt = `Berikut adalah dokumen PRD saat ini:\n\n${currentPrd}\n\nInstruksi Revisi dari Pengguna:\n"${revisionPrompt}"\n\nTerapkan perubahan yang diminta secara konsisten dan hasilkan dokumen PRD revisi yang utuh dalam format Markdown Bahasa Indonesia.`;

  if (!client || !apiKey) {
    const revised = `${currentPrd}\n\n### Catatan Revisi Terbaru\n- Disesuaikan berdasarkan instruksi: "${revisionPrompt}"\n- Detail modul dan persyaratan fungsional diperbarui.`;
    const words = revised.split(" ");
    let full = "";
    for (let i = 0; i < words.length; i += 6) {
      const slice = words.slice(i, i + 6).join(" ") + " ";
      full += slice;
      onChunk(slice);
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 20);
      await promise;
    }
    return full;
  }

  const stream = await withQuotaTracking(config, () =>
    client.chat.completions.create({
      model: config.modelIdentifier,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah Senior Product Manager profesional yang memperbarui dokumen PRD berdasarkan instruksi revisi pengguna. Pertahankan struktur PRD yang rapi dalam Markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      stream: true,
    })
  );

  let full = "";
  await withQuotaTracking(config, async () => {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        full += text;
        onChunk(text);
      }
    }
  });

  return full;
}
