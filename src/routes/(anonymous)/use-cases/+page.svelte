<script lang="ts">
    import { Eyebrow, ChapterNum, Rule, DropCap, Plate } from "$lib/components/almanac";

    type UseCase = {
        slug: string;
        name: string;
        tagline: string;
        verdict: string;
    };

    const cases: UseCase[] = [
        {
            slug: "couples",
            name: "Couples",
            tagline: "For two people sharing money.",
            verdict: "The relationship that drove DuitGee's design — shared cards, the “did you log it?” loop, the monthly check-in.",
        },
        {
            slug: "families",
            name: "Families",
            tagline: "For couples with kids and multi-generational households.",
            verdict: "Allowances, school invoices, recurring tuitions, the multi-generational pool — modelled with member roles and funds.",
        },
        {
            slug: "housemates",
            name: "Housemates",
            tagline: "For flatmates with a shared communal pool.",
            verdict: "Communal groceries, shared utilities, the “whose turn is it” loop — without becoming an IOU ledger.",
        },
        {
            slug: "solo",
            name: "Solo",
            tagline: "For one person, present and future.",
            verdict: "Every collaboration feature works in degenerate single-user mode — your “partner” becomes future-you.",
        },
    ];

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

<svelte:head>
    <title>Use cases — DuitGee</title>
    <meta
        name="description"
        content="DuitGee was designed for households first — couples, families, housemates — and works gracefully solo too. Pick the shape that matches yours."
    />
</svelte:head>

<div class="dg-landing dg-ucindex" use:reveal>
    <section class="dg-hero dg-hero--narrow">
        <div class="dg-hero__copy">
            <div class="dg-hero__masthead" data-reveal>
                <Eyebrow tone="muted">— Plate § Use cases —</Eyebrow>
                <ChapterNum class="dg-hero__chap">Pick a shape</ChapterNum>
            </div>
            <h1 class="dg-display" data-reveal style="--rd: 80ms">
                Whose <em>almanac</em> is it?
            </h1>
            <Rule />
            <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                DuitGee was designed for households first &mdash; couples,
                families, housemates &mdash; and degrades gracefully to a
                single user. The collaboration features (vaults, member
                breakdowns, the unidentified workflow) are the design
                centre, not a marketing add-on. <em>Pick the shape that
                matches yours.</em>
            </DropCap>
        </div>
    </section>

    <section class="dg-section">
        <ul class="dg-ucindex__list">
            {#each cases as c, i (c.slug)}
                <li data-reveal style="--rd: {i * 80}ms">
                    <a href="/use-cases/{c.slug}" class="dg-ucindex__link">
                        <Plate variant="default" class="dg-ucindex__plate">
                            <Eyebrow tone="oxblood">{c.name}</Eyebrow>
                            <h2 class="dg-ucindex__h"><em>{c.tagline}</em></h2>
                            <Rule />
                            <p class="dg-ucindex__verdict">{c.verdict}</p>
                            <p class="dg-ucindex__cta">Read this use case &rarr;</p>
                        </Plate>
                    </a>
                </li>
            {/each}
        </ul>
    </section>

    <section class="dg-final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-final__eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-final__h">
                Or just start a vault and<br />
                <em>see for yourself</em>.
            </h2>
            <p class="dg-final__lead">
                <em>Free, forever.</em> No credit card.
            </p>
            <a href="/register">
                <span class="dg-final__cta-btn">Begin a vault &rarr;</span>
            </a>
        </div>
    </section>
</div>

<style>
    .dg-ucindex {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-ucindex.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-ucindex.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-ucindex.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

    .dg-display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.4rem, 6vw, 4.6rem);
        line-height: 1;
        letter-spacing: -0.025em;
        margin: 14px 0 0;
    }
    .dg-display em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--almanac-oxblood);
    }

    .dg-hero {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 4vw, 3.5rem);
    }
    .dg-hero--narrow .dg-hero__copy { max-width: 50rem; }
    .dg-hero__masthead {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
    }
    :global(.dg-hero__chap) { font-size: 1.05rem; }
    :global(.dg-lead) {
        font-family: 'Newsreader', serif;
        font-size: 1.15rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 1.4rem 0 0;
    }

    .dg-section {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2rem, 4vw, 3.5rem) clamp(1.25rem, 4vw, 3rem);
    }

    .dg-ucindex__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 720px) {
        .dg-ucindex__list { grid-template-columns: 1fr 1fr; }
    }
    .dg-ucindex__link {
        text-decoration: none;
        color: inherit;
        display: block;
        height: 100%;
    }
    :global(.dg-ucindex__plate) {
        padding: clamp(1.4rem, 2.6vw, 1.8rem) !important;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: transform 200ms ease;
    }
    .dg-ucindex__link:hover :global(.dg-ucindex__plate) {
        transform: translateY(-2px);
    }
    .dg-ucindex__h {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 60, 'wght' 380;
        font-size: 1.45rem;
        line-height: 1.2;
        margin: 0.35rem 0 0;
    }
    .dg-ucindex__h em {
        font-style: italic;
        color: var(--almanac-oxblood);
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
    }
    .dg-ucindex__verdict {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.6;
        color: var(--almanac-ink-2);
        margin: 0.4rem 0 0;
    }
    .dg-ucindex__cta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--almanac-oxblood);
        margin: 0.6rem 0 0;
    }

    .dg-final {
        background: var(--spotlight);
        color: var(--spotlight-fg);
        padding: clamp(3rem, 8vw, 6rem) clamp(1.25rem, 4vw, 3rem);
        text-align: center;
    }
    .dg-final > div { max-width: 50rem; margin: 0 auto; }
    :global(.dg-final__eyebrow) { color: var(--almanac-gold); }
    .dg-final__h {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 360;
        font-size: clamp(2.4rem, 6vw, 4rem);
        line-height: 1;
        margin: 0.6rem 0 0.8rem;
        letter-spacing: -0.02em;
    }
    .dg-final__h em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 360;
        color: var(--almanac-gold);
    }
    .dg-final__lead {
        font-family: 'Newsreader', serif;
        font-size: 1.05rem;
        line-height: 1.55;
        color: var(--spotlight-meta);
        margin: 0 auto 1.4rem;
        max-width: 38rem;
    }
    .dg-final__lead em { color: var(--spotlight-fg); font-style: italic; }
    .dg-final__cta-btn {
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
    .dg-final__cta-btn:hover {
        background: var(--almanac-gold);
        color: var(--spotlight);
    }
</style>
