import { FileText } from "lucide-react";

/**
 * The right-hand artefact: the generated PRD document.
 *
 * Inner headings are `<p>`s on purpose. This is a clipped screenshot of a
 * document, not a second outline of the page, so it must not add heading nodes
 * to the document tree. The bottom fade is a CSS mask, which is why the card
 * body simply overflows.
 */
export function PrdPreview() {
  return (
    <article className="landing-card landing-card--doc" data-ui aria-label="Contoh dokumen PRD">
      <header className="landing-card__head">
        <FileText className="landing-card__icon" aria-hidden />
        <span className="landing-card__file">prd-marketplace.md</span>
        <span className="landing-chip">Contoh</span>
      </header>

      <div className="doc-body">
        <p className="doc-body__title">Marketplace B2B Hasil Tani</p>

        <p className="doc-body__h">1. Ringkasan Eksekutif</p>
        <p className="doc-body__p">
          Marketplace B2B yang menghubungkan petani, koperasi, dan UMKM produsen dengan
          pembeli grosir. Platform memperpendek rantai distribusi dan menampilkan harga
          grosir yang transparan.
        </p>

        <p className="doc-body__h">2. Masalah</p>
        <ul className="doc-body__list">
          <li>Harga di tingkat petani tidak transparan.</li>
          <li>Pembeli grosir sulit memverifikasi kualitas dan pasokan.</li>
          <li>Rantai distribusi berlapis menekan margin petani.</li>
        </ul>

        <p className="doc-body__h">3. Tujuan Produk</p>
        <ul className="doc-body__list">
          <li>Memperpendek rantai distribusi hasil tani.</li>
          <li>Menyediakan katalog terkurasi dengan kualitas yang jelas.</li>
          <li>Memberi pembeli grosir satu tempat untuk memesan ulang.</li>
        </ul>
      </div>
    </article>
  );
}
