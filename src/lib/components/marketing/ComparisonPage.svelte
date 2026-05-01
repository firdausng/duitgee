<script lang="ts">
    import { Eyebrow, ChapterNum, Rule, DropCap, Plate } from "$lib/components/almanac";

    type WinPoint = { title: string; what: string };
    type TableRow = { dim: string; them: string; us: string; takeaway?: "us" | "them" | "split" };

    type Props = {
        rivalName: string;
        rivalSlug: string;
        tagline: string;
        intro: string;
        whenTheyWin: WinPoint[];
        whereWeWin: WinPoint[];
        tableRows: TableRow[];
        bottomLine: string;
    };

    let {
        rivalName,
        rivalSlug: _rivalSlug,
        tagline,
        intro,
        whenTheyWin,
        whereWeWin,
        tableRows,
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

<div class="dg-landing dg-cmp" use:reveal>
    <section class="dg-cmp__hero">
        <div class="dg-cmp__hero-copy">
            <div class="dg-cmp__masthead" data-reveal>
                <Eyebrow tone="muted">— DuitGee vs. {rivalName} —</Eyebrow>
                <ChapterNum class="dg-cmp__chap">Plate § Comparison</ChapterNum>
            </div>
            <h1 class="dg-cmp__display" data-reveal style="--rd: 80ms">
                <em>{tagline}</em>
            </h1>
            <Rule />
            <DropCap class="dg-cmp__lead" data-reveal style="--rd: 160ms">
                {intro}
            </DropCap>
        </div>
    </section>

    <section class="dg-cmp__section dg-cmp__section--paper-2">
        <header class="dg-cmp__chap">
            <Eyebrow tone="muted">— When {rivalName} is still the better choice —</Eyebrow>
            <h2 class="dg-cmp__h2" data-reveal>
                Where <em>{rivalName}</em> wins.
            </h2>
            <p class="dg-cmp__sub" data-reveal style="--rd: 80ms">
                We&rsquo;d rather you bounce <em>now</em> than later. If
                these matter, please use {rivalName} &mdash; we&rsquo;re not a
                replacement for it.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-cmp__list">
            {#each whenTheyWin as item, i (item.title)}
                <li data-reveal style="--rd: {i * 60}ms">
                    <Plate variant="default" class="dg-cmp__item">
                        <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                        <h3 class="dg-cmp__item-name"><em>{item.title}</em></h3>
                        <Rule />
                        <p class="dg-cmp__item-what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <section class="dg-cmp__section">
        <header class="dg-cmp__chap">
            <Eyebrow tone="muted">— Where the household almanac fits better —</Eyebrow>
            <h2 class="dg-cmp__h2" data-reveal>
                Where <em>DuitGee</em> wins.
            </h2>
            <p class="dg-cmp__sub" data-reveal style="--rd: 80ms">
                The two ideas behind DuitGee are <em>reduce friction</em>
                with the people you share money with, and <em>spot the
                gaps</em> you&rsquo;d otherwise miss. {rivalName} doesn&rsquo;t
                serve those the way we do.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-cmp__list">
            {#each whereWeWin as item, i (item.title)}
                <li data-reveal style="--rd: {i * 60}ms">
                    <Plate variant="default" class="dg-cmp__item">
                        <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                        <h3 class="dg-cmp__item-name"><em>{item.title}</em></h3>
                        <Rule />
                        <p class="dg-cmp__item-what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <section class="dg-cmp__section dg-cmp__section--paper-2">
        <header class="dg-cmp__chap">
            <Eyebrow tone="muted">— Side by side —</Eyebrow>
            <h2 class="dg-cmp__h2" data-reveal>
                The <em>same dimensions</em>, two readings.
            </h2>
        </header>
        <Rule variant="double" />

        <Plate variant="default" as="figure" class="dg-cmp__table-wrap" data-reveal>
            <div class="dg-cmp__table-head">
                <Eyebrow tone="ink">Plate § Compare</Eyebrow>
            </div>
            <Rule variant="double" />
            <div class="dg-cmp__table-scroll">
                <table class="dg-cmp__table">
                    <thead>
                        <tr>
                            <th class="dg-cmp__col-dim">Dimension</th>
                            <th class="dg-cmp__col-them">{rivalName}</th>
                            <th class="dg-cmp__col-us">DuitGee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each tableRows as row, i (row.dim)}
                            <tr class={i < tableRows.length - 1 ? "dg-cmp__row dg-cmp__row--dashed" : "dg-cmp__row"}>
                                <td class="dg-cmp__cell-dim">{row.dim}</td>
                                <td class="dg-cmp__cell-them" class:dg-cmp__cell--win={row.takeaway === "them"}>
                                    {row.them}
                                </td>
                                <td class="dg-cmp__cell-us" class:dg-cmp__cell--win={row.takeaway === "us"}>
                                    {row.us}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </Plate>

        <Plate variant="inset" class="dg-cmp__bottom" data-reveal>
            <Eyebrow tone="muted">— The bottom line —</Eyebrow>
            <p class="dg-cmp__bottom-text"><em>{bottomLine}</em></p>
        </Plate>
    </section>

    <section class="dg-cmp__final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-cmp__final-eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-cmp__final-h">
                Decide for<br />
                <em>yourself</em>.
            </h2>
            <p class="dg-cmp__final-lead">
                <em>Free, forever.</em> No credit card. If DuitGee
                isn&rsquo;t right, we&rsquo;d rather you find out without
                ceremony.
            </p>
            <a href="/register">
                <span class="dg-cmp__final-btn">Begin a vault &rarr;</span>
            </a>
            <p class="dg-cmp__final-back">
                <a href="/alternative-to">&larr; Back to all comparisons</a>
            </p>
        </div>
    </section>
</div>

<style>
    .dg-cmp {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-cmp.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-cmp.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-cmp.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

    .dg-cmp__hero {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 4vw, 3.5rem);
    }
    .dg-cmp__hero-copy { max-width: 50rem; }
    .dg-cmp__masthead {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
    }
    :global(.dg-cmp__chap) { font-size: 1.05rem; }
    .dg-cmp__display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.2rem, 5.5vw, 4.2rem);
        line-height: 1.05;
        letter-spacing: -0.025em;
        margin: 14px 0 0;
        color: var(--almanac-ink);
    }
    .dg-cmp__display em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
        color: var(--almanac-oxblood);
    }
    :global(.dg-cmp__lead) {
        font-family: 'Newsreader', serif;
        font-size: 1.15rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 1.4rem 0 0;
    }

    .dg-cmp__section {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2rem, 4vw, 3.5rem) clamp(1.25rem, 4vw, 3rem);
    }
    .dg-cmp__section--paper-2 {
        max-width: none;
        background: var(--almanac-paper-2);
    }
    .dg-cmp__section--paper-2 > * {
        max-width: 86rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-cmp__chap { margin-bottom: 0.6rem; }
    .dg-cmp__h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 380;
        font-size: clamp(1.8rem, 3.4vw, 2.6rem);
        line-height: 1.05;
        letter-spacing: -0.018em;
        margin: 6px 0 0;
    }
    .dg-cmp__h2 em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--almanac-oxblood);
    }
    .dg-cmp__sub {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        max-width: 50rem;
        margin: 1rem 0 0.6rem;
    }
    .dg-cmp__sub em { font-style: italic; color: var(--almanac-ink); }

    .dg-cmp__list {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 760px) {
        .dg-cmp__list { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 1100px) {
        .dg-cmp__list { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-cmp__item) {
        padding: clamp(1.2rem, 2.4vw, 1.6rem) !important;
        height: 100%;
    }
    .dg-cmp__item-name {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        font-size: 1.15rem;
        line-height: 1.2;
        margin: 0.4rem 0 0;
        color: var(--almanac-ink);
    }
    .dg-cmp__item-name em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-cmp__item-what {
        font-family: 'Newsreader', serif;
        font-size: 0.96rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0.5rem 0 0;
    }

    /* Table */
    :global(.dg-cmp__table-wrap) {
        padding: 0 !important;
        margin: 1.5rem auto 0;
        max-width: 64rem;
    }
    .dg-cmp__table-head {
        padding: clamp(1rem, 2vw, 1.4rem) clamp(1.2rem, 2.5vw, 1.8rem) 0.5rem;
    }
    .dg-cmp__table-scroll { overflow-x: auto; }
    .dg-cmp__table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
        min-width: 38rem;
    }
    .dg-cmp__table thead th {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 500;
        color: var(--almanac-ink-3);
        padding: 0.8rem clamp(1.1rem, 2.5vw, 1.6rem);
        border-bottom: 1px solid var(--almanac-ink);
        text-align: left;
    }
    .dg-cmp__col-them, .dg-cmp__col-us {
        text-align: left;
    }
    .dg-cmp__col-us { color: var(--almanac-oxblood); }
    .dg-cmp__row td {
        padding: 0.8rem clamp(1.1rem, 2.5vw, 1.6rem);
        color: var(--almanac-ink-2);
        vertical-align: top;
    }
    .dg-cmp__row--dashed td { border-bottom: 1px dashed var(--almanac-rule-soft); }
    .dg-cmp__cell-dim {
        font-family: 'Fraunces', Georgia, serif;
        font-style: italic;
        color: var(--almanac-ink) !important;
        width: 24%;
    }
    .dg-cmp__cell-them, .dg-cmp__cell-us {
        width: 38%;
    }
    .dg-cmp__cell-us { color: var(--almanac-ink); font-style: italic; }
    .dg-cmp__cell--win {
        position: relative;
    }
    .dg-cmp__cell--win::before {
        content: "✓ ";
        color: var(--almanac-forest);
        font-style: normal;
        font-weight: 600;
    }

    :global(.dg-cmp__bottom) {
        padding: 1.4rem 1.6rem !important;
        margin-top: 1.5rem;
        text-align: center;
        max-width: 50rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-cmp__bottom-text {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.2rem;
        line-height: 1.4;
        color: var(--almanac-ink);
        margin: 0.5rem 0 0;
    }
    .dg-cmp__bottom-text em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }

    .dg-cmp__final {
        background: var(--spotlight);
        color: var(--spotlight-fg);
        padding: clamp(3rem, 8vw, 6rem) clamp(1.25rem, 4vw, 3rem);
        text-align: center;
    }
    .dg-cmp__final > div { max-width: 50rem; margin: 0 auto; }
    :global(.dg-cmp__final-eyebrow) { color: var(--almanac-gold); }
    .dg-cmp__final-h {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 360;
        font-size: clamp(2.4rem, 6vw, 4rem);
        line-height: 1;
        margin: 0.6rem 0 0.8rem;
        letter-spacing: -0.02em;
    }
    .dg-cmp__final-h em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 360;
        color: var(--almanac-gold);
    }
    .dg-cmp__final-lead {
        font-family: 'Newsreader', serif;
        font-size: 1.05rem;
        line-height: 1.55;
        color: var(--spotlight-meta);
        margin: 0 auto 1.4rem;
        max-width: 38rem;
    }
    .dg-cmp__final-lead em { color: var(--spotlight-fg); font-style: italic; }
    .dg-cmp__final-btn {
        display: inline-block;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 600;
        font-size: 0.95rem;
        padding: 0.85rem 1.6rem;
        background: transparent;
        color: var(--spotlight-fg);
        border: 1px solid var(--almanac-gold);
        transition: background 160ms ease, color 160ms ease;
        cursor: pointer;
    }
    .dg-cmp__final-btn:hover {
        background: var(--almanac-gold);
        color: var(--spotlight);
    }
    .dg-cmp__final-back {
        margin: 1.5rem 0 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
    }
    .dg-cmp__final-back a {
        color: var(--spotlight-meta);
        text-decoration: none;
    }
    .dg-cmp__final-back a:hover {
        color: var(--almanac-gold);
    }
</style>
