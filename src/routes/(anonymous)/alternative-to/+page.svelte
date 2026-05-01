<script lang="ts">
    import { Eyebrow, ChapterNum, Rule, DropCap, Plate } from "$lib/components/almanac";

    type Comparison = {
        slug: string;
        name: string;
        tagline: string;
        verdict: string;
    };

    const comparisons: Comparison[] = [
        {
            slug: "splitwise",
            name: "Splitwise",
            tagline: "If you need who-owes-whom maths.",
            verdict: "Splitwise is excellent at IOUs and uneven splits. DuitGee is the household pool, not the receipt-by-receipt ledger.",
        },
        {
            slug: "ynab",
            name: "YNAB",
            tagline: "If you want “assign every dollar” budgeting.",
            verdict: "YNAB enforces a plan; DuitGee describes reality. Funds are wallets, not envelopes.",
        },
        {
            slug: "money-lover",
            name: "Money Lover",
            tagline: "If you want a polished solo tracker with bank sync.",
            verdict: "Money Lover is a strong solo app. DuitGee's collaboration features (vaults, member breakdowns, the unidentified workflow) are designed-in, not bolted on.",
        },
        {
            slug: "spreadsheets",
            name: "spreadsheets",
            tagline: "If your current setup is a Google Sheet.",
            verdict: "Spreadsheets are infinitely flexible. DuitGee gives the household structure spreadsheets can't — RBAC, the unidentified workflow, AI scan, grounded insights.",
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
    <title>DuitGee vs. the alternatives — DuitGee</title>
    <meta
        name="description"
        content="Honest comparisons between DuitGee and the apps people consider alongside it: Splitwise, YNAB, Money Lover, and spreadsheets."
    />
</svelte:head>

<div class="dg-landing dg-altindex" use:reveal>
    <section class="dg-hero dg-hero--narrow">
        <div class="dg-hero__copy">
            <div class="dg-hero__masthead" data-reveal>
                <Eyebrow tone="muted">— Footnotes &amp; comparisons —</Eyebrow>
                <ChapterNum class="dg-hero__chap">Plate § Alternatives</ChapterNum>
            </div>
            <h1 class="dg-display" data-reveal style="--rd: 80ms">
                Considering an <em>alternative?</em>
            </h1>
            <Rule />
            <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                We&rsquo;d rather you bounce <em>now</em> than later. Here are
                honest readings of how DuitGee compares to the apps people
                consider alongside it &mdash; including when those apps are
                still the better choice for you. The household almanac
                isn&rsquo;t for everyone, and we&rsquo;d rather say so.
            </DropCap>
        </div>
    </section>

    <section class="dg-section">
        <ul class="dg-altindex__list">
            {#each comparisons as comp, i (comp.slug)}
                <li data-reveal style="--rd: {i * 80}ms">
                    <a href="/alternative-to/{comp.slug}" class="dg-altindex__link">
                        <Plate variant="default" class="dg-altindex__plate">
                            <Eyebrow tone="oxblood">DuitGee vs. {comp.name}</Eyebrow>
                            <h2 class="dg-altindex__h">
                                <em>{comp.tagline}</em>
                            </h2>
                            <Rule />
                            <p class="dg-altindex__verdict">{comp.verdict}</p>
                            <p class="dg-altindex__cta">
                                Read the comparison &rarr;
                            </p>
                        </Plate>
                    </a>
                </li>
            {/each}
        </ul>
    </section>

    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— What we&rsquo;re comparing on —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                The <em>two ideas</em>, as the yardstick.
            </h2>
            <p class="dg-body dg-altindex__sub" data-reveal style="--rd: 80ms">
                Every comparison we draw maps back to the same two ideas.
                Either an alternative serves them better than DuitGee in
                your situation &mdash; in which case, please use it &mdash;
                or it doesn&rsquo;t.
            </p>
        </header>
        <Rule variant="double" />

        <div class="dg-altindex__yardstick">
            <Plate variant="default" class="dg-altindex__y-plate" data-reveal>
                <ChapterNum>§ 01</ChapterNum>
                <h3 class="dg-h3"><em>Reduce friction</em> with the people you share money with.</h3>
                <p class="dg-body">
                    Vaults with proper roles. Member breakdowns. The
                    mystery-charge workflow. The ±1-day duplicate prompt.
                    Vault-wide notifications. Quick-log.
                </p>
            </Plate>

            <Plate variant="default" class="dg-altindex__y-plate" data-reveal style="--rd: 100ms">
                <ChapterNum>§ 02</ChapterNum>
                <h3 class="dg-h3"><em>Spot the gaps</em> you&rsquo;d otherwise miss.</h3>
                <p class="dg-body">
                    Server-side breakdowns. AI period insights, grounded in
                    your numbers. Calendar view. Period comparison. Recurring
                    rule listing.
                </p>
            </Plate>
        </div>
    </section>

    <section class="dg-final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-final__eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-final__h">
                Try it in your<br />
                <em>own</em> chronicle.
            </h2>
            <p class="dg-final__lead">
                <em>Free, forever.</em> No credit card. Decide for yourself.
            </p>
            <a href="/register">
                <span class="dg-final__cta-btn">Begin a vault &rarr;</span>
            </a>
        </div>
    </section>
</div>

<style>
    .dg-altindex {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-altindex.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-altindex.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-altindex.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
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
    .dg-h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 380;
        font-size: clamp(1.8rem, 3.4vw, 2.6rem);
        line-height: 1.05;
        letter-spacing: -0.018em;
        margin: 6px 0 0;
    }
    .dg-h2 em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--almanac-oxblood);
    }
    .dg-h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 460;
        font-size: 1.25rem;
        line-height: 1.2;
        margin: 10px 0 8px;
    }
    .dg-h3 em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-body {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        margin: 0 0 0.6rem;
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
    .dg-section--paper-2 {
        max-width: none;
        background: var(--almanac-paper-2);
    }
    .dg-section--paper-2 > * {
        max-width: 86rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-chap { margin-bottom: 0.6rem; }
    .dg-altindex__sub { max-width: 50rem; margin-top: 1rem; }

    .dg-altindex__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 720px) {
        .dg-altindex__list { grid-template-columns: 1fr 1fr; }
    }
    .dg-altindex__link {
        text-decoration: none;
        color: inherit;
        display: block;
        height: 100%;
    }
    :global(.dg-altindex__plate) {
        padding: clamp(1.4rem, 2.6vw, 1.8rem) !important;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: transform 200ms ease, box-shadow 200ms ease;
    }
    .dg-altindex__link:hover :global(.dg-altindex__plate) {
        transform: translateY(-2px);
    }
    .dg-altindex__h {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 60, 'wght' 380;
        font-size: 1.45rem;
        line-height: 1.2;
        margin: 0.35rem 0 0;
        color: var(--almanac-ink);
    }
    .dg-altindex__h em {
        font-style: italic;
        color: var(--almanac-oxblood);
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
    }
    .dg-altindex__verdict {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.6;
        color: var(--almanac-ink-2);
        margin: 0.4rem 0 0;
    }
    .dg-altindex__cta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--almanac-oxblood);
        margin: 0.6rem 0 0;
    }

    .dg-altindex__yardstick {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
        margin-top: 1.5rem;
    }
    @media (min-width: 760px) {
        .dg-altindex__yardstick { grid-template-columns: 1fr 1fr; }
    }
    :global(.dg-altindex__y-plate) {
        padding: clamp(1.4rem, 2.5vw, 1.8rem) !important;
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
