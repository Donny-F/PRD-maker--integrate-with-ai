"use client";

import { useState } from "react";

/**
 * The three steps, each with the artefact it produces.
 *
 * `sample` is what the left-hand panel shows while that step is selected: a
 * prompt, a clarification question, a PRD opening. All copy lives in one array
 * so the list and the sample panel can never describe different steps.
 */
const STEPS = [
  {
    title: "Tulis idenya",
    body: "Jelaskan produk, pengguna, dan masalah yang ingin diselesaikan. Satu paragraf sudah cukup.",
    note: "Gemini dan DeepSeek dapat dipilih saat membuat proyek.",
    sample: {
      label: "Contoh prompt",
      text: "Bangun marketplace B2B yang mempertemukan petani dan koperasi dengan pembeli grosir. Pembeli dapat membandingkan harga, memesan dengan minimum order, dan memantau pengiriman.",
    },
  },
  {
    title: "Jawab klarifikasi",
    body: "AI mengajukan 3–5 pertanyaan tentang pengguna, batasan, dan metrik keberhasilan. Lewati jika sudah yakin.",
    note: "Jawaban menjadi konteks tambahan saat PRD ditulis.",
    sample: {
      label: "Contoh pertanyaan klarifikasi",
      text: "Siapa pengguna utama, dan metrik apa yang menandakan produk ini berhasil?",
    },
  },
  {
    title: "Review PRD & diagram",
    body: "Dokumen markdown ditulis bertahap dan diagram alur tersusun otomatis dari Epic, fitur, dan sub-fitur.",
    note: "Setiap revisi tersimpan sebagai versi baru; rollback tidak menghapus riwayat.",
    sample: {
      label: "Contoh hasil",
      text: "1. Ringkasan Eksekutif — platform yang memperpendek rantai distribusi dan menampilkan harga grosir secara transparan.",
    },
  },
] as const;

/**
 * "Cara kerja": the three steps between the prompt and the document.
 *
 * The step list is the control: selecting a step (click, or Enter/Space on its
 * title) swaps the sample panel on the left and reveals that step's note. The
 * first step is selected on mount so the panel is never empty and the section
 * still reads as static content before any interaction.
 *
 * `<ol>` with list markers removed keeps the sequence meaningful to assistive
 * tech; the numbers are rendered as content for the same reason. The button
 * wraps only the title, so the body text stays ordinary page text rather than
 * becoming a giant button label.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const sample = STEPS[active].sample;

  return (
    <section className="landing-how" id="cara-kerja" aria-labelledby="cara-kerja-title">
      <div className="landing-how__inner">
        <div className="landing-how__head">
          <p className="landing-how__eyebrow">Cara kerja</p>
          <h2 id="cara-kerja-title" className="landing-how__title">
            Dari satu paragraf ke dokumen kerja.
          </h2>
          <p className="landing-how__intro">
            PRD Maker memakai satu prompt sebagai titik awal. AI menggali konteks,
            menulis dokumen, lalu menyusun diagram alurnya.
          </p>

          <div className="landing-how__sample" aria-live="polite">
            <p className="landing-how__sample-label">{sample.label}</p>
            <p className="landing-how__sample-text" key={active}>
              {sample.text}
            </p>
          </div>
        </div>

        <ol className="landing-steps">
          {STEPS.map((step, index) => {
            const isActive = index === active;

            return (
              <li key={step.title} className="landing-step" data-active={isActive}>
                <span className="landing-step__index" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="landing-step__main">
                  <h3 className="landing-step__title">
                    <button
                      type="button"
                      className="landing-step__trigger"
                      aria-pressed={isActive}
                      onClick={() => setActive(index)}
                    >
                      {step.title}
                    </button>
                  </h3>
                  <p className="landing-step__body">{step.body}</p>
                  {isActive && <p className="landing-step__note">{step.note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
