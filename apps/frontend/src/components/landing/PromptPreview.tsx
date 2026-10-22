import { LandingCta } from "./LandingCta";

/**
 * The left-hand artefact: the composer, filled in.
 *
 * It is a still picture of the product's prompt box, not a control: there is no
 * textarea, no state and no handoff to `/projects/new` from the text itself. The
 * `data-ui` attribute marks it as a cropped interface fragment so it keeps its
 * own type scale and shadows instead of being judged as page furniture.
 */
export function PromptPreview() {
  return (
    <article className="landing-card landing-card--prompt" data-ui aria-label="Contoh prompt">
      <header className="landing-card__head">
        <span className="landing-card__file">Prompt awal</span>
        <span className="landing-chip">Contoh</span>
      </header>

      <p className="prompt-card__field">
        Bangun marketplace B2B yang mempertemukan petani dan koperasi dengan pembeli
        grosir. Pembeli dapat membandingkan harga, memesan dengan minimum order, dan
        memantau pengiriman.
      </p>

      <p className="prompt-card__meta">
        <span className="prompt-card__dot" aria-hidden />
        <span>DeepSeek V4.1 Flash</span>
      </p>
    </article>
  );
}
