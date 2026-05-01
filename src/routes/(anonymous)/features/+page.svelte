<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import {
        Eyebrow,
        ChapterNum,
        Rule,
        DropCap,
        Plate,
        MoneyDisplay,
    } from "$lib/components/almanac";

    type FeatureRow = {
        name: string;
        what: string;
        idea: 1 | 2 | 0;
    };

    const friction: FeatureRow[] = [
        {
            name: "Vaults & roles",
            what: "Each household keeps its own ledger, with members invited at owner / admin / member roles. Permissions are explicit, never assumed.",
            idea: 1,
        },
        {
            name: "Unidentified-expense workflow",
            what: "Log a placeholder when the bank notification beats the spender home. The other person claims and fills in the details — never auto-merged.",
            idea: 1,
        },
        {
            name: "±1-day duplicate prompt",
            what: "If two members log the same dinner within a day, we ask before saving — magical when right, painful when wrong, so we never auto-merge.",
            idea: 1,
        },
        {
            name: "Member breakdowns",
            what: "Who paid what, this period — at a glance. The “let me dig through receipts” tax disappears.",
            idea: 1,
        },
        {
            name: "Vault-wide notifications",
            what: "Best-effort, fan-out only when the household actually needs to see something. A delivery failure never rolls back the underlying action.",
            idea: 1,
        },
        {
            name: "Quick-log & templates",
            what: "Two taps for the recurring small charges. Templates capture the common shapes so logging stops feeling like data entry.",
            idea: 1,
        },
        {
            name: "Shared categories, tags & payment types",
            what: "Everyone in the vault sees the same vocabulary, so one person can't quietly invent a category the rest of the family won't recognise.",
            idea: 1,
        },
    ];

    const gaps: FeatureRow[] = [
        {
            name: "Trend, category, member & payment-type breakdowns",
            what: "Server-side aggregations only — every chart survives a vault with thousands of rows and a multi-year history.",
            idea: 2,
        },
        {
            name: "AI period insights, grounded in your data",
            what: "Anomalies, drifts, and forgotten subscriptions, written as bullets that are checked against your actual numbers. Bullets we can't back up are dropped.",
            idea: 2,
        },
        {
            name: "Calendar view",
            what: "A whole month of the household's spending laid out by day. The Tuesday-night drift, the weekend inflation — the patterns surface visually.",
            idea: 2,
        },
        {
            name: "Period comparison",
            what: "This month vs. last. This quarter vs. last. Same window, side by side — no spreadsheets required.",
            idea: 2,
        },
        {
            name: "Recurring rule listing",
            what: "Every active commitment in one place — the streaming services, the installments, the auto-pays — so the creeping monthly total stops being invisible.",
            idea: 2,
        },
        {
            name: "Statistics export",
            what: "Charts as PNG, breakdowns as CSV — for the family budget meeting or the sit-down with your accountant.",
            idea: 2,
        },
    ];

    const enablers: FeatureRow[] = [
        {
            name: "Funds — descriptive wallets",
            what: "Real wallets, not envelopes. Top-up on a schedule or manually, optionally roll over to another fund at cycle close, immutable transaction ledger.",
            idea: 0,
        },
        {
            name: "Recurring expenses",
            what: "Queue mode (you approve) or auto-generation mode (it just posts). Daily, weekly, monthly, yearly — or custom intervals on Pro.",
            idea: 0,
        },
        {
            name: "AI receipt scan",
            what: "Photos and PDFs go in, structured expenses come out — amount, merchant, date, category. Always confirm before saving; we never auto-create.",
            idea: 0,
        },
        {
            name: "CSV import & export",
            what: "Bring history in, take everything out. Export is free on every plan, with no row limit, no time gate — data lock-in is adversarial.",
            idea: 0,
        },
        {
            name: "Receipt attachments",
            what: "Up to five files per expense on Free, twenty on Pro. Photos, PDFs, the printed-out invoice — keep them with the entry, not on your camera roll.",
            idea: 0,
        },
        {
            name: "Multi-currency by vault",
            what: "Each vault is one currency; pick from 30+ at creation. Travelers and cross-currency households use a vault per currency — honest about scope.",
            idea: 0,
        },
        {
            name: "Locale-aware formatting",
            what: "Dates, decimals, and currency symbols match the vault's locale — the chronicle reads natural to whoever opens it.",
            idea: 0,
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
    <title>Features — DuitGee</title>
    <meta
        name="description"
        content="Every feature in DuitGee serves one of two ideas: reduce friction with the people you share money with, or spot the gaps in your spending. Here's the catalog."
    />
</svelte:head>

<div class="dg-landing dg-feats" use:reveal>
    <!-- ============ HERO ============ -->
    <section class="dg-hero dg-hero--narrow">
        <div class="dg-hero__copy">
            <div class="dg-hero__masthead" data-reveal>
                <Eyebrow tone="muted">— The household&rsquo;s table of contents —</Eyebrow>
                <ChapterNum class="dg-hero__chap">Plate § Features</ChapterNum>
            </div>
            <h1 class="dg-display" data-reveal style="--rd: 80ms">
                Two ideas.<br />
                <em>Every</em> feature.
            </h1>
            <Rule />
            <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                DuitGee&rsquo;s features all serve one of two ideas. Either
                they <em>reduce friction</em> between the people sharing money
                in a household, or they help you <em>spot the gaps</em> you
                can&rsquo;t see when you&rsquo;re inside them. A few features
                are enablers &mdash; funds, recurring rules, attachments
                &mdash; that quietly support both. Below: the catalog.
            </DropCap>
        </div>
    </section>

    <!-- ============ IDEA 1 — FRICTION ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Idea I &middot; The relational —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Reduce the friction with the <em>people</em> you share money with.
            </h2>
            <p class="dg-body dg-feats__sub" data-reveal style="--rd: 80ms">
                The friction in shared spending is interpersonal, not technical.
                These features remove the small recurring loops:
                <em>&ldquo;did you log it?&rdquo;</em>, <em>&ldquo;wait, what
                was that charge?&rdquo;</em>, <em>&ldquo;I think you double-entered
                that.&rdquo;</em>
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-feats__list">
            {#each friction as feat, i (feat.name)}
                <li data-reveal style="--rd: {i * 50}ms">
                    <Plate variant="default" class="dg-feats__plate">
                        <div class="dg-feats__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <h3 class="dg-feats__name"><em>{feat.name}</em></h3>
                        </div>
                        <Rule />
                        <p class="dg-feats__what">{feat.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ THE STORY (mid-feature break) ============ -->
    <section class="dg-section">
        <div class="dg-feats__story">
            <Plate variant="default" as="figure" class="dg-feats__story-plate" data-reveal>
                <div class="dg-feats__story-head">
                    <Eyebrow tone="ink">Plate II &middot; A typical Tuesday</Eyebrow>
                </div>
                <Rule variant="double" />
                <div class="dg-feats__story-body">
                    <p>
                        <em>8:42 pm.</em> Sara&rsquo;s phone buzzes &mdash;
                        <strong>$24.50 at the local cafe</strong>. Alex paid.
                        Alex isn&rsquo;t home yet.
                    </p>
                    <p>
                        She opens DuitGee, taps <strong>Quick log &middot;
                        unidentified</strong>, picks the placeholder amount,
                        and walks away. No guessing. No waiting.
                    </p>
                    <p>
                        When Alex gets home, the app already noticed the
                        placeholder and asks <em>&ldquo;Looks like the cafe
                        last night. Claim &amp; add the details?&rdquo;</em>
                        Two taps. The mystery charge is gone.
                    </p>
                </div>
                <Rule />
                <p class="dg-feats__story-foot">
                    <em>Magical when right, painful when wrong.</em>
                    That&rsquo;s why nothing auto-merges &mdash; we ask, you
                    decide.
                </p>
            </Plate>
        </div>
    </section>

    <!-- ============ IDEA 2 — GAPS ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Idea II &middot; The analytical —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Spot the <em>gaps</em> you&rsquo;d otherwise miss.
            </h2>
            <p class="dg-body dg-feats__sub" data-reveal style="--rd: 80ms">
                The patterns you can&rsquo;t see while you&rsquo;re inside them &mdash;
                the dining-out drift, the installment that crept in, the
                streaming service nobody watches anymore.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-feats__list">
            {#each gaps as feat, i (feat.name)}
                <li data-reveal style="--rd: {i * 50}ms">
                    <Plate variant="default" class="dg-feats__plate">
                        <div class="dg-feats__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <h3 class="dg-feats__name"><em>{feat.name}</em></h3>
                        </div>
                        <Rule />
                        <p class="dg-feats__what">{feat.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>

        <Plate variant="inset" class="dg-feats__quote" data-reveal>
            <Eyebrow tone="muted">— A grounded AI bullet —</Eyebrow>
            <p class="dg-feats__quote-q">
                <em>&ldquo;You have 8 active installments &mdash; up from 3
                last quarter. Dining out is up 38% versus the same period
                last year.&rdquo;</em>
            </p>
            <p class="dg-feats__quote-attr">
                Backed by your numbers. If we can&rsquo;t back a bullet up,
                it doesn&rsquo;t ship.
            </p>
        </Plate>
    </section>

    <!-- ============ ENABLERS ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— The enablers —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                The pieces that quietly <em>support both</em>.
            </h2>
            <p class="dg-body dg-feats__sub" data-reveal style="--rd: 80ms">
                Funds, recurring rules, scans, attachments &mdash; not the
                story, but the structure. They make the rest possible.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-feats__list">
            {#each enablers as feat, i (feat.name)}
                <li data-reveal style="--rd: {i * 50}ms">
                    <Plate variant="default" class="dg-feats__plate">
                        <div class="dg-feats__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <h3 class="dg-feats__name"><em>{feat.name}</em></h3>
                        </div>
                        <Rule />
                        <p class="dg-feats__what">{feat.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ FUNDS LEDGER MOCK ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Plate III &middot; The household ledger —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                A <em>fund</em> is a wallet, not a budget.
            </h2>
            <p class="dg-body dg-feats__sub" data-reveal style="--rd: 80ms">
                No <em>&ldquo;assign every dollar&rdquo;</em> ritual. No
                overspending blocks. Just a clear running picture of what
                each pot has left.
            </p>
        </header>
        <Rule />

        <div class="dg-mock-wrap" data-reveal>
            <Plate variant="default" as="figure" class="dg-feats__mock">
                <div class="dg-feats__mock-head">
                    <Eyebrow tone="ink">A typical week, October</Eyebrow>
                </div>
                <Rule variant="double" />
                <table class="dg-feats__table">
                    <thead>
                        <tr>
                            <th>Fund</th>
                            <th class="dg-feats__num">Allocated</th>
                            <th class="dg-feats__num">Remaining</th>
                            <th class="dg-feats__num dg-feats__progress">Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each [
                            { fund: "Groceries",  alloc: 400, rem: 240, pct: 60, color: "var(--almanac-oxblood)" },
                            { fund: "Petrol",     alloc: 280, rem: 106, pct: 38, color: "var(--almanac-forest)" },
                            { fund: "Children",   alloc: 200, rem: 168, pct: 84, color: "var(--almanac-gold)" },
                            { fund: "Date night", alloc: 240, rem: 120, pct: 50, color: "var(--almanac-oxblood)" },
                        ] as row, i (row.fund)}
                            <tr class={i < 3 ? "dg-feats__row dg-feats__row--dashed" : "dg-feats__row"}>
                                <td>{row.fund}</td>
                                <td class="dg-feats__num">${row.alloc}</td>
                                <td class="dg-feats__num">${row.rem}</td>
                                <td class="dg-feats__num">
                                    <span class="dg-feats__bar">
                                        <span style="width:{row.pct}%; background:{row.color}"></span>
                                    </span>
                                </td>
                            </tr>
                        {/each}
                        <tr class="dg-feats__total">
                            <td>Total</td>
                            <td class="dg-feats__num">$1,120</td>
                            <td class="dg-feats__num">$634</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                <p class="dg-feats__caption">
                    Fig. 1 &mdash;
                    <MoneyDisplay amount={634.00} size={14} color="var(--almanac-ink-2)" />
                    remaining across four funds, mid-month.
                </p>
            </Plate>
        </div>
    </section>

    <!-- ============ FINAL CTA ============ -->
    <section class="dg-final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-final__eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-final__h">
                See it in your<br />
                <em>own</em> chronicle.
            </h2>
            <p class="dg-final__lead">
                <em>Free, forever.</em> No credit card. Take the catalog for a
                spin in your own vault.
            </p>
            <a href="/register">
                <Button variant="almanac-ghost" size="lg" class="dg-final__cta">
                    Begin a vault &rarr;
                </Button>
            </a>
        </div>
    </section>
</div>

<style>
    .dg-feats {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-feats.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-feats.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-feats.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

    .dg-display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.6rem, 6vw, 4.8rem);
        line-height: 1;
        letter-spacing: -0.025em;
        color: var(--almanac-ink);
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
        color: var(--almanac-ink);
    }
    .dg-h2 em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--almanac-oxblood);
    }
    .dg-body {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        margin: 0 0 0.6rem;
    }
    .dg-body em { font-style: italic; color: var(--almanac-ink); }

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
        padding: clamp(2.5rem, 5vw, 4rem) clamp(1.25rem, 4vw, 3rem);
    }
    .dg-section--paper-2 {
        max-width: none;
        background: var(--almanac-paper-2);
        padding-left: clamp(1.25rem, 4vw, 3rem);
        padding-right: clamp(1.25rem, 4vw, 3rem);
    }
    .dg-section--paper-2 > * {
        max-width: 86rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-chap { margin-bottom: 0.6rem; }
    .dg-feats__sub { max-width: 50rem; margin-top: 1rem; }

    /* ---------- Feature list ---------- */
    .dg-feats__list {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 720px) {
        .dg-feats__list { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 1100px) {
        .dg-feats__list { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-feats__plate) {
        padding: clamp(1.2rem, 2.4vw, 1.6rem) !important;
        height: 100%;
    }
    .dg-feats__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.4rem;
    }
    .dg-feats__name {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        font-size: 1.15rem;
        line-height: 1.2;
        margin: 0;
        color: var(--almanac-ink);
    }
    .dg-feats__name em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-feats__what {
        font-family: 'Newsreader', serif;
        font-size: 0.96rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0.5rem 0 0;
    }

    /* ---------- Story plate ---------- */
    .dg-feats__story { max-width: 50rem; margin: 0 auto; }
    :global(.dg-feats__story-plate) {
        padding: 0 !important;
        overflow: hidden;
    }
    .dg-feats__story-head {
        padding: clamp(1rem, 2vw, 1.4rem) clamp(1.2rem, 2.5vw, 1.8rem) 0.5rem;
    }
    .dg-feats__story-body {
        padding: 1rem clamp(1.2rem, 2.5vw, 1.8rem);
        font-family: 'Newsreader', serif;
        font-size: 1.02rem;
        line-height: 1.7;
        color: var(--almanac-ink-2);
    }
    .dg-feats__story-body p { margin: 0.4rem 0; }
    .dg-feats__story-body em { font-style: italic; color: var(--almanac-ink); }
    .dg-feats__story-body strong {
        font-weight: 600;
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-feats__story-foot {
        padding: 0.8rem clamp(1.2rem, 2.5vw, 1.8rem) 1.1rem;
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
        font-style: italic;
        color: var(--almanac-ink-3);
        text-align: center;
    }
    .dg-feats__story-foot em { color: var(--almanac-oxblood); }

    /* ---------- Quote (grounded AI) ---------- */
    :global(.dg-feats__quote) {
        max-width: 46rem;
        margin: 1.8rem auto 0;
        padding: 1.4rem 1.6rem !important;
        text-align: center;
    }
    .dg-feats__quote-q {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.25rem;
        line-height: 1.4;
        color: var(--almanac-ink);
        margin: 0.6rem 0 0.4rem;
    }
    .dg-feats__quote-q em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-feats__quote-attr {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--almanac-ink-3);
        margin: 0;
    }

    /* ---------- Funds mock table ---------- */
    .dg-mock-wrap { max-width: 56rem; margin: 1.5rem auto 0; }
    :global(.dg-feats__mock) {
        padding: 0 !important;
        overflow: hidden;
    }
    .dg-feats__mock-head {
        padding: clamp(1rem, 2vw, 1.4rem) clamp(1.2rem, 2.5vw, 1.8rem) 0.5rem;
    }
    .dg-feats__table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Newsreader', serif;
        font-size: 0.98rem;
    }
    .dg-feats__table thead th {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 500;
        color: var(--almanac-ink-3);
        padding: 0.8rem clamp(1.1rem, 2.5vw, 1.6rem);
        border-bottom: 1px solid var(--almanac-ink);
        text-align: left;
    }
    .dg-feats__num { text-align: right; }
    .dg-feats__progress { width: 28%; min-width: 8rem; }
    .dg-feats__row td {
        padding: 0.8rem clamp(1.1rem, 2.5vw, 1.6rem);
        color: var(--almanac-ink-2);
    }
    .dg-feats__row--dashed td { border-bottom: 1px dashed var(--almanac-rule-soft); }
    .dg-feats__total td {
        padding: 0.9rem clamp(1.1rem, 2.5vw, 1.6rem);
        border-top: 1px solid var(--almanac-ink);
        color: var(--almanac-ink);
        font-style: italic;
        font-weight: 500;
    }
    .dg-feats__bar {
        display: inline-block;
        width: 100%;
        height: 6px;
        background: var(--almanac-rule-soft);
        position: relative;
        vertical-align: middle;
    }
    .dg-feats__bar > span {
        position: absolute;
        inset: 0 auto 0 0;
        display: block;
    }
    .dg-feats__caption {
        padding: 0.7rem clamp(1.2rem, 2.5vw, 1.8rem) 1.1rem;
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.92rem;
        color: var(--almanac-ink-3);
        margin: 0;
        display: flex;
        align-items: baseline;
        gap: 0.3rem;
        flex-wrap: wrap;
    }

    /* ---------- Final CTA ---------- */
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
    :global(.dg-final__cta) {
        background: transparent !important;
        color: var(--spotlight-fg) !important;
        border-color: var(--almanac-gold) !important;
    }
    :global(.dg-final__cta:hover) {
        background: var(--almanac-gold) !important;
        color: var(--spotlight) !important;
    }
</style>
