<script lang="ts">
    import { Eyebrow, ChapterNum, Rule, DropCap, Plate } from "$lib/components/almanac";

    type Scenario = { when: string; what: string; tool: string };
    type FeatureMap = { title: string; what: string };

    type Props = {
        audience: string;
        eyebrow: string;
        tagline: string;
        intro: string;
        scenarios: Scenario[];
        features: FeatureMap[];
        bottomLine: string;
    };

    let {
        audience,
        eyebrow,
        tagline,
        intro,
        scenarios,
        features,
        bottomLine,
    }: Props = $props();

    function reveal(node: HTMLElement) {
        node.classList.add("js-reveal");
        const targets = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]"));
        for (const el of targets) {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9) el.classList.add("is-in");
        }
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("is-in");
                        io.unobserve(e.target);
                    }
                }
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
        );
        for (const el of targets) {
            if (!el.classList.contains("is-in")) io.observe(el);
        }
        return { destroy: () => io.disconnect() };
    }
</script>

<div class="dg-landing dg-uc" use:reveal>
    <section class="dg-uc__hero">
        <div class="dg-uc__hero-copy">
            <div class="dg-uc__masthead" data-reveal>
                <Eyebrow tone="muted">{eyebrow}</Eyebrow>
                <ChapterNum class="dg-uc__chap">Plate § {audience}</ChapterNum>
            </div>
            <h1 class="dg-uc__display" data-reveal style="--rd: 80ms">
                <em>{tagline}</em>
            </h1>
            <Rule />
            <DropCap class="dg-uc__lead" data-reveal style="--rd: 160ms">
                {intro}
            </DropCap>
        </div>
    </section>

    <section class="dg-uc__section dg-uc__section--paper-2">
        <header class="dg-uc__chap">
            <Eyebrow tone="muted">— Chapter I &middot; Three scenes —</Eyebrow>
            <h2 class="dg-uc__h2" data-reveal>
                Three small <em>scenes</em> from a typical week.
            </h2>
            <p class="dg-uc__sub" data-reveal style="--rd: 80ms">
                Specific, mundane, recurring. The friction is in the
                small loops, not the grand ones.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-uc__scenarios">
            {#each scenarios as sc, i (sc.when)}
                <li data-reveal style="--rd: {i * 100}ms">
                    <Plate variant="default" class="dg-uc__scene">
                        <div class="dg-uc__scene-when">
                            <Eyebrow tone="oxblood">Scene {String(i + 1).padStart(2, "0")} &middot; {sc.when}</Eyebrow>
                        </div>
                        <Rule />
                        <p class="dg-uc__scene-what">{sc.what}</p>
                        <Rule variant="ornament">⁂</Rule>
                        <p class="dg-uc__scene-tool">
                            <em>What DuitGee does:</em> {sc.tool}
                        </p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <section class="dg-uc__section">
        <header class="dg-uc__chap">
            <Eyebrow tone="muted">— Chapter II &middot; The features that matter most —</Eyebrow>
            <h2 class="dg-uc__h2" data-reveal>
                Built for <em>this</em> particular household.
            </h2>
            <p class="dg-uc__sub" data-reveal style="--rd: 80ms">
                Not a feature dump &mdash; only the pieces that earn their
                keep for {audience.toLowerCase()}.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-uc__features">
            {#each features as feat, i (feat.title)}
                <li data-reveal style="--rd: {i * 50}ms">
                    <Plate variant="default" class="dg-uc__feat">
                        <div class="dg-uc__feat-head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <h3 class="dg-uc__feat-name"><em>{feat.title}</em></h3>
                        </div>
                        <Rule />
                        <p class="dg-uc__feat-what">{feat.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <section class="dg-uc__section dg-uc__section--paper-2">
        <Plate variant="inset" class="dg-uc__bottom">
            <Eyebrow tone="muted">— The bottom line —</Eyebrow>
            <p class="dg-uc__bottom-text"><em>{bottomLine}</em></p>
        </Plate>
    </section>

    <section class="dg-uc__final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-uc__final-eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-uc__final-h">
                Begin a vault for<br />
                <em>your</em> household.
            </h2>
            <p class="dg-uc__final-lead">
                <em>Free, forever.</em> No credit card. Set up in under a
                minute.
            </p>
            <a href="/register">
                <span class="dg-uc__final-btn">Begin a vault &rarr;</span>
            </a>
            <p class="dg-uc__final-back">
                <a href="/use-cases">&larr; Back to all use cases</a>
            </p>
        </div>
    </section>
</div>

<style>
    .dg-uc {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-uc.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-uc.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-uc.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

    .dg-uc__hero {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 4vw, 3.5rem);
    }
    .dg-uc__hero-copy { max-width: 50rem; }
    .dg-uc__masthead {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
    }
    :global(.dg-uc__chap) { font-size: 1.05rem; }
    .dg-uc__display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.2rem, 5.5vw, 4.2rem);
        line-height: 1.05;
        letter-spacing: -0.025em;
        margin: 14px 0 0;
        color: var(--almanac-ink);
    }
    .dg-uc__display em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
        color: var(--almanac-oxblood);
    }
    :global(.dg-uc__lead) {
        font-family: 'Newsreader', serif;
        font-size: 1.15rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 1.4rem 0 0;
    }

    .dg-uc__section {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2rem, 4vw, 3.5rem) clamp(1.25rem, 4vw, 3rem);
    }
    .dg-uc__section--paper-2 {
        max-width: none;
        background: var(--almanac-paper-2);
    }
    .dg-uc__section--paper-2 > * {
        max-width: 86rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-uc__chap { margin-bottom: 0.6rem; }
    .dg-uc__h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 380;
        font-size: clamp(1.8rem, 3.4vw, 2.6rem);
        line-height: 1.05;
        letter-spacing: -0.018em;
        margin: 6px 0 0;
    }
    .dg-uc__h2 em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--almanac-oxblood);
    }
    .dg-uc__sub {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        max-width: 50rem;
        margin: 1rem 0 0.6rem;
    }

    /* Scenes */
    .dg-uc__scenarios {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 880px) {
        .dg-uc__scenarios { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-uc__scene) {
        padding: clamp(1.3rem, 2.4vw, 1.7rem) !important;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .dg-uc__scene-what {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.6;
        color: var(--almanac-ink-2);
        margin: 0.6rem 0;
        flex: 1;
    }
    .dg-uc__scene-tool {
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
        line-height: 1.55;
        color: var(--almanac-ink);
        margin: 0;
    }
    .dg-uc__scene-tool em {
        font-style: italic;
        color: var(--almanac-oxblood);
        margin-right: 0.3rem;
    }

    /* Features */
    .dg-uc__features {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 760px) {
        .dg-uc__features { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 1100px) {
        .dg-uc__features { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-uc__feat) {
        padding: clamp(1.2rem, 2.4vw, 1.6rem) !important;
        height: 100%;
    }
    .dg-uc__feat-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.8rem;
    }
    .dg-uc__feat-name {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        font-size: 1.15rem;
        line-height: 1.2;
        margin: 0;
    }
    .dg-uc__feat-name em { font-style: italic; color: var(--almanac-oxblood); }
    .dg-uc__feat-what {
        font-family: 'Newsreader', serif;
        font-size: 0.96rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0.5rem 0 0;
    }

    /* Bottom line */
    :global(.dg-uc__bottom) {
        padding: 1.4rem 1.6rem !important;
        margin-top: 0;
        text-align: center;
        max-width: 50rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-uc__bottom-text {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.2rem;
        line-height: 1.4;
        color: var(--almanac-ink);
        margin: 0.5rem 0 0;
    }
    .dg-uc__bottom-text em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }

    /* Final */
    .dg-uc__final {
        background: var(--spotlight);
        color: var(--spotlight-fg);
        padding: clamp(3rem, 8vw, 6rem) clamp(1.25rem, 4vw, 3rem);
        text-align: center;
    }
    .dg-uc__final > div { max-width: 50rem; margin: 0 auto; }
    :global(.dg-uc__final-eyebrow) { color: var(--almanac-gold); }
    .dg-uc__final-h {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 360;
        font-size: clamp(2.4rem, 6vw, 4rem);
        line-height: 1;
        margin: 0.6rem 0 0.8rem;
        letter-spacing: -0.02em;
    }
    .dg-uc__final-h em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 360;
        color: var(--almanac-gold);
    }
    .dg-uc__final-lead {
        font-family: 'Newsreader', serif;
        font-size: 1.05rem;
        line-height: 1.55;
        color: var(--spotlight-meta);
        margin: 0 auto 1.4rem;
        max-width: 38rem;
    }
    .dg-uc__final-lead em { color: var(--spotlight-fg); font-style: italic; }
    .dg-uc__final-btn {
        display: inline-block;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 600;
        font-size: 0.95rem;
        padding: 0.85rem 1.6rem;
        background: transparent;
        color: var(--spotlight-fg);
        border: 1px solid var(--almanac-gold);
        transition: background 160ms ease, color 160ms ease;
    }
    .dg-uc__final-btn:hover {
        background: var(--almanac-gold);
        color: var(--spotlight);
    }
    .dg-uc__final-back {
        margin: 1.5rem 0 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
    }
    .dg-uc__final-back a {
        color: var(--spotlight-meta);
        text-decoration: none;
    }
    .dg-uc__final-back a:hover {
        color: var(--almanac-gold);
    }
</style>
