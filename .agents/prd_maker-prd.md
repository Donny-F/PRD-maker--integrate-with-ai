# Product Requirements Document (PRD) - PRD Maker (MVP)

## 1. Ringkasan Proyek

PRD Maker adalah aplikasi internal berbasis web yang dirancang untuk mempercepat proses pembuatan Product Requirements Document (PRD) beserta bagan visualnya (diagram). Aplikasi ini memanfaatkan kekuatan LLM (seperti Antigravity dan DeepSeek) untuk berinteraksi dengan pengguna, menggali detail proyek, dan secara otomatis menghasilkan dokumen PRD serta visualisasi diagram proyek yang terstruktur.

## 2. Tech Stack (Teknologi yang Digunakan)

*   **Monorepo & Build Tool:** Turborepo didukung **pnpm workspaces** (orkestrasi pipeline `dev`, `build`, dan `lint` terpadu antara backend dan frontend).
*   **Frontend:** Next.js (React), Tailwind CSS
*   **UI Component Library:** shadcn-ui
*   **Diagram Library:** reactflow.dev didukung **`@dagrejs/dagre`** untuk kalkulasi layout hirarki otomatis (kiri-ke-kanan), serta `html-to-image` untuk ekspor gambar.
*   **Backend:** Express.js (REST API dan Server-Sent Events / SSE untuk streaming output LLM)
*   **Database & ORM:** PostgreSQL dengan **Prisma ORM** (termasuk migrasi skema dan automated seeding script).
*   **Autentikasi & Autorisasi:** NextAuth.js di frontend (OAuth Google/GitHub serta **Dev Mode Credentials Login** untuk kemudahan development lokal). Frontend meneruskan signed JWT (Bearer Token) ke backend Express.js. Express memverifikasi JWT via shared secret (`AUTH_SECRET`). Role-Based Access Control (Admin vs User).
*   **LLM Integration:** Antigravity (Google AI / Gemini Flash) dan DeepSeek v4.1 (1017 model) melalui protokol standar **OpenAI-Compatible** (`https://generativelanguage.googleapis.com/v1beta/openai/` dan `https://api.deepseek.com/v1`), dioperasikan via SDK universal di backend.
## 3. Desain dan Panduan UI/UX

*   **Tema Utama:** Minimalis, profesional ("corporate style").
*   **Warna Utama (Primary):** Oranye kekuningan (`#ffc200`) untuk tombol aksi utama, highlight, dan elemen penting.
*   **Warna Netral:** Hitam dan Putih murni untuk latar belakang, teks, dan struktur UI umum.
*   **Kanvas Diagram:** Menggunakan konsep *infinite canvas* mirip **Draw.io**, lengkap dengan latar belakang grid/titik (dots), serta dukungan *panning* (geser) dan *zooming*.

## 4. Alur Kerja Utama (Core Logic)

Pembuatan proyek akan melewati tahap berurutan berikut, dilengkapi dengan sistem iterasi revisi:

### Step 1: Prompting Awal

*   Pengguna **memilih model LLM** (contoh: Antigravity Flash 3.8 atau DeepSeek v4.1) yang ingin digunakan melalui opsi *dropdown* di area *prompt*.
*   Pengguna memasukkan prompt berupa ide/deskripsi proyek yang ingin dibuat sedetail mungkin melalui form *textarea*.

### Step 2: Klarifikasi AI

*   LLM menganalisis prompt awal dari Step 1.
*   LLM menghasilkan 1 putaran daftar pertanyaan spesifik (3–5 pertanyaan terstruktur dalam format JSON) untuk melengkapi kebutuhan fungsional/teknis yang belum jelas.
*   Pengguna mengisi jawaban pada form klarifikasi yang disediakan.
*   **Opsi Lewati:** Tersedia tombol *"Lewati Klarifikasi & Langsung Buat PRD"* jika pengguna merasa prompt awal sudah cukup jelas atau ingin langsung melihat draft pertama.

### Step 3: Pembuatan Dokumen PRD

*   Berdasarkan prompt awal dan jawaban klarifikasi (jika ada), LLM menyusun dokumen PRD lengkap.
*   Teks PRD di-stream secara real-time ke UI menggunakan **Server-Sent Events (SSE)** agar pengguna tidak menunggu request HTTP statis yang lama.
*   Dokumen ditampilkan dalam markdown viewer.
*   **Aksi:** Tombol unduh file `project-prd.md`.
*   Dokumen otomatis disimpan ke PostgreSQL via Prisma sebagai "Versi 1".

### Step 4: Visualisasi Diagram (React Flow + Dagre)

*   Backend memicu LLM untuk menghasilkan struktur data relasi (Nodes & Edges) dalam format JSON valid (diverifikasi dengan schema Zod).
*   Data JSON diterima frontend, lalu engine **`@dagrejs/dagre`** menghitung koordinat spasial `(x, y)` secara otomatis dengan orientasi kiri-ke-kanan (`rankdir: 'LR'`).
*   Bagan visual di-render pada kanvas `reactflow.dev` (view-only: `nodesDraggable={false}`, `nodesConnectable={false}`, panning & zoom aktif).
*   **Aksi:** Tombol unduh gambar `project-prd.png` (menggunakan `html-to-image` dengan kalkulasi bounding-box dan scaling factor $2\times$).
*   Data JSON diagram otomatis disimpan ke PostgreSQL terikat pada versi aktif.

### Step 5: Revisi & Versioning (Iterasi)

*   Pengguna memasukkan prompt instruksi revisi pada kolom revisi (misal: "Tambahkan sistem notifikasi email di Fase 2").
*   LLM memperbarui teks PRD markdown terlebih dahulu, kemudian meregenerasi data JSON diagram agar tetap sinkron dengan isi dokumen.
*   Hasil revisi disimpan ke PostgreSQL sebagai versi baru (contoh: Versi 2).
*   **Audit Trail Revert:** Saat pengguna memilih kembali (*rollback*) ke versi sebelumnya (misal kembali ke v1), sistem membuat snapshot versi baru (misal v3) dengan payload identik v1 bertanda `Reverted from v1`, menjaga riwayat revisi tetap linear tanpa menghapus histori.
## 5. Fitur Utama MVP

### 5.1. Sistem Akun dan Autentikasi

*   Pengguna harus login sebelum bisa menggunakan aplikasi (diamankan menggunakan NextAuth).
*   **Mode Autentikasi Ganda:**
    *   **Production:** OAuth provider (Google & GitHub).
    *   **Development:** Dev Mock / Credentials Login untuk mempermudah testing instan di local environment tanpa kewajiban konfigurasi Google Cloud Console terlebih dahulu.
*   Data proyek dan riwayat tersambung langsung dengan ID pengguna.

### 5.2. Panel Admin (Admin Dashboard)

*   **Akses Khusus:** Halaman yang hanya bisa diakses oleh akun dengan *role* Admin.
*   **Seeding Data Awal:** Tersedia skrip database seed (`npx prisma db seed`) yang otomatis mendaftarkan model LLM default dan akun/email admin pertama (`4kungm4il.15243@gmail.com` / `ADMIN_SEED_EMAIL`).
*   **Manajemen LLM:** Admin dapat melihat daftar LLM, menambah, mengedit nama/model string, dan menonaktifkan (*disable*) model yang dapat dipilih oleh pengguna.
*   **Manajemen API Key:** Admin dapat menginput dan mengedit API Key untuk provider LLM langsung dari UI Admin. Backend mengenkripsi API Key menggunakan algoritma **AES-256-GCM** sebelum disimpan ke database, dan hanya di-dekripsi saat backend memanggil API provider.
### 5.3. Manajemen Riwayat Proyek (History)

*   Dashboard pengguna akan menampilkan daftar PRD yang pernah dibuat.
*   Pengguna dapat membuka kembali proyek lama, melihat dokumen PRD, dan melihat kanvas diagram karena semua data teks dan JSON tersimpan aman di PostgreSQL.

### 5.4. Standarisasi Hirarki Diagram

Untuk memastikan diagram mudah dibaca, LLM di Step 4 harus diprompt untuk selalu mengembalikan JSON dengan hirarki baku berikut:

1.  **Epic (Root):** Nama Proyek (Node paling kiri).
2.  **Fitur (Cabang):** Memiliki metadata indikator fase pengerjaan (misal: Fase 1, Fase 2).
3.  **Sub-fitur (Daun):** Detail atau *checklist* apa saja yang ada di dalam fitur tersebut (Node paling kanan).

### 5.5. Sistem Revisi dan Versioning (Version Control)

*   Menyimpan setiap iterasi PRD dan diagram JSON yang dihasilkan LLM dalam satu proyek.
*   Antarmuka bagi pengguna untuk berpindah antar-versi, melihat perubahan, dan menetapkan versi lama sebagai versi yang aktif (revert).


## 6. Skema Database (Prisma Schema Reference)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

model User {
  id            String    @id @default(uuid())
  name          String?
  email         String    @unique
  image         String?
  role          Role      @default(USER)
  projects      Project[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model LlmConfig {
  id                String    @id @default(uuid())
  provider          String    // e.g. "google", "deepseek"
  displayName       String    // e.g. "Antigravity Flash 3.8", "DeepSeek v4.1"
  modelIdentifier   String    // e.g. "gemini-1.5-flash", "deepseek-chat"
  baseUrl           String    // OpenAI-compatible base URL
  encryptedApiKey   String?   // AES-256-GCM encrypted
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Project {
  id                String           @id @default(uuid())
  userId            String
  user              User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  title             String
  initialPrompt     String           @db.Text
  clarifications    Json?            // Array [{ question: string, answer: string }]
  currentVersionId  String?
  versions          ProjectVersion[]
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}

model ProjectVersion {
  id             String   @id @default(uuid())
  projectId      String
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  versionNumber  Int
  revisionPrompt String?  @db.Text
  prdContent     String   @db.Text
  diagramData    Json     // { nodes: [...], edges: [...] }
  createdAt      DateTime @default(now())

  @@unique([projectId, versionNumber])
}
```

## 7. Arsitektur Komunikasi Backend & Autentikasi

1. **Auth Bridge:**
   - NextAuth menangani login OAuth Google/GitHub di Next.js (`frontend`).
   - Pada callback `jwt`, NextAuth menyisipkan payload `userId` dan `role` ke dalam JSON Web Token yang ditandatangani dengan `AUTH_SECRET`.
   - Setiap request dari frontend ke Express backend menyertakan header `Authorization: Bearer <token>`.
   - Middleware Express memverifikasi token dengan secret yang sama dan menyuntikkan `req.user = { id, role }`.

2. **Keamanan Kunci API LLM:**
   - Backend menyimpan API Key terenkripsi AES-256-GCM menggunakan `ENCRYPTION_MASTER_KEY` dari `.env` backend.
   - API Key tidak pernah dikirimkan ke client/frontend.

3. **Alur Streaming Dokumen:**
   - Pembuatan PRD (Step 3) menggunakan endpoint `GET /api/v1/projects/:id/stream-prd` berbasis Server-Sent Events (SSE).
   - Potongan teks markdown dikirim bertahap ke UI sehingga pengguna melihat dokumen diketik secara interaktif.

4. **Automated Graph Layout:**
   - Backend mengembalikan data graph murni: `{ nodes: [{ id, label, phase }], edges: [{ source, target }] }`.
   - Frontend memproses data tersebut melalui fungsi helper `@dagrejs/dagre` untuk menghitung posisi `x` dan `y` tiap node sebelum diberikan ke `<ReactFlow nodes={positionedNodes} edges={edges} />`.

5. **Struktur Turborepo Monorepo:**
   ```
   v0.1/
   ├── apps/
   │   ├── frontend/        # Next.js (port 3000)
   │   └── backend/         # Express.js + Prisma (port 5000)
   ├── packages/
   │   └── typescript-config/ # Shared tsconfig
   ├── turbo.json           # Konfigurasi pipeline Turborepo
   ├── pnpm-workspace.yaml  # Konfigurasi workspace pnpm
   ├── package.json         # Root scripts (pnpm dev, pnpm build)
   └── docker-compose.yml   # PostgreSQL container
   ```
## 8. Batasan (Out of Scope untuk MVP)

Untuk memastikan proyek MVP dapat diluncurkan dengan cepat dan tepat sasaran, fitur-fitur berikut **tidak akan dikembangkan** pada fase MVP:

*   **Bring Your Own Key (BYOK) untuk Pengguna:** Pengguna biasa tidak dapat memasukkan API Key LLM mereka sendiri. Mereka hanya menggunakan API Key yang telah diatur oleh Admin secara terpusat.
*   **Pengeditan Diagram Manual:** Pengguna tidak dapat menggeser node, mengubah teks node, atau menambah garis secara manual di dalam canvas. Diagram sepenuhnya *view-only* (hanya bisa dilihat dan diunduh).
*   **Kolaborasi Real-time:** Tidak ada fitur mengedit satu dokumen secara bersama-sama seperti Google Docs atau Figma.
*   **Integrasi Pihak Ketiga (Selain Auth & LLM):** Tidak ada koneksi API langsung untuk mengirim tiket ke Jira, Trello, Asana, atau ekspor langsung ke Notion.
*   **Sistem Pembayaran / Subscription:** Karena ini adalah alat internal, tidak ada *payment gateway*.

## 9. Pengembangan Masa Depan (Post-MVP)
*(Disimpan untuk referensi setelah MVP selesai)*

*   Pengeditan diagram interaktif menggunakan kontrol bawaan React Flow.
*   Integrasi langsung ke task manager (Jira/Trello).
*   Opsi ekspor tambahan (misalnya PDF).