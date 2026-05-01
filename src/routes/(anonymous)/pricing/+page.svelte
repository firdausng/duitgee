<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import {
        Accordion,
        AccordionItem,
        AccordionTrigger,
        AccordionContent,
    } from "$lib/components/ui/accordion";
    import {
        Eyebrow,
        ChapterNum,
        Rule,
        DropCap,
        Plate,
    } from "$lib/components/almanac";

    type Row = {
        label: string;
        free: string;
        pro: string;
        emphasis?: boolean;
    };

    const groups: { title: string; eyebrow: string; rows: Row[] }[] = [
        {
            eyebrow: "Plate § I",
            title: "The everyday",
            rows: [
                { label: "Vault members", free: "Unlimited", pro: "Unlimited" },
                { label: "Expenses logged", free: "Unlimited", pro: "Unlimited" },
                { label: "Categories, tags, payment types", free: "Unlimited", pro: "Unlimited" },
                { label: "Unidentified-expense workflow", free: "Full", pro: "Full" },
                { label: "Receipt attachments per expense", free: "Up to 5", pro: "Up to 20" },
                { label: "CSV export", free: "Always", pro: "Always", emphasis: true },
            ],
        },
        {
            eyebrow: "Plate § II",
            title: "Funds & recurring",
            rows: [
                { label: "Active funds per vault", free: "1", pro: "Unlimited" },
                { label: "Recurring rules per vault", free: "Up to 5", pro: "Unlimited" },
                { label: "Recurring intervals", free: "Daily / weekly / monthly / yearly", pro: "Custom intervals" },
                { label: "Auto-generation of recurring expenses", free: "—", pro: "Included" },
                { label: "Fund auto-replenishment (fixed / top-to-ceiling)", free: "—", pro: "Included" },
                { label: "Cycle history beyond the active cycle", free: "—", pro: "Included" },
                { label: "Fund transfers between funds", free: "—", pro: "Included" },
                { label: "Cross-fund reimbursements", free: "—", pro: "Included" },
            ],
        },
        {
            eyebrow: "Plate § III",
            title: "Statistics & AI",
            rows: [
                { label: "Trend, category, member, payment-type breakdowns", free: "Last 12 months", pro: "Custom range" },
                { label: "Advanced breakdowns (YoY, tag-level, day/hour heatmap)", free: "—", pro: "Included" },
                { label: "Chart export (PNG + CSV)", free: "—", pro: "Included" },
                { label: "AI receipt scan (PDFs & photos)", free: "—", pro: "Included" },
                { label: "AI period insights, grounded in your numbers", free: "—", pro: "Included" },
            ],
        },
        {
            eyebrow: "Plate § IV",
            title: "Bringing data in",
            rows: [
                { label: "Manual entry & quick-log", free: "Always", pro: "Always" },
                { label: "Bulk CSV import", free: "—", pro: "Included" },
            ],
        },
    ];

    const proGated: { name: string; what: string }[] = [
        { name: "Multiple funds", what: "Run more than one wallet alongside the household pool." },
        { name: "Auto-replenishment", what: "Top up to a ceiling, or by a fixed amount, on schedule." },
        { name: "Unlimited recurring + auto-generation", what: "More than five rules, custom intervals, and auto-posting when you trust them." },
        { name: "AI receipt scan", what: "Photo or PDF in, structured expense out — amount, merchant, date, category." },
        { name: "AI period insights", what: "Anomalies, drifts, and forgotten subscriptions, grounded against your real numbers." },
        { name: "Custom date range & advanced breakdowns", what: "YoY, tag-level, day/hour heatmaps, member net-position." },
        { name: "Chart export", what: "PNG charts and CSV breakdowns for spreadsheets and reports." },
        { name: "Cross-fund moves", what: "Transfers between funds and cross-fund reimbursements in one place." },
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
    <title>Pricing — DuitGee</title>
    <meta
        name="description"
        content="Free is fully usable. Pro enhances scale, automation, depth, and AI. CSV export is free, forever — your data is never held hostage."
    />
</svelte:head>

<div class="dg-landing dg-pricing" use:reveal>
    <!-- ============ HERO ============ -->
    <section class="dg-hero dg-hero--narrow">
        <div class="dg-hero__copy">
            <div class="dg-hero__masthead" data-reveal>
                <Eyebrow tone="muted">— On gathering subscriptions —</Eyebrow>
                <ChapterNum class="dg-hero__chap">Plate § Pricing</ChapterNum>
            </div>
            <h1 class="dg-display" data-reveal style="--rd: 80ms">
                <em>Free</em> is fully usable.<br />
                <em>Pro</em> enhances.
            </h1>
            <Rule />
            <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                We don&rsquo;t cripple the free tier to push you toward a
                subscription. Free covers a real household&rsquo;s daily life
                &mdash; vaults, members, the unidentified workflow, statistics
                for the last twelve months. Pro is for <em>scale, automation,
                depth, and AI</em>. And CSV export is free, forever, with no
                row limit.
            </DropCap>
        </div>
    </section>

    <!-- ============ TIERS ============ -->
    <section class="dg-section dg-section--paper-2">
        <div class="dg-tiers">
            <Plate variant="default" as="article" class="dg-tier" data-reveal>
                <header class="dg-tier__head">
                    <h2 class="dg-tier__name"><em>Free</em></h2>
                    <p class="dg-tier__price">$0<span>/forever</span></p>
                </header>
                <Rule />
                <p class="dg-tier__lead"><em>Everything a household needs to track shared spending.</em></p>
                <ul class="dg-tier__list">
                    <li>Unlimited expenses, unlimited members</li>
                    <li>1 active fund per vault</li>
                    <li>5 active recurring rules</li>
                    <li>Statistics for the last 12 months</li>
                    <li>Receipt attachments (up to 5 per expense)</li>
                    <li>The unidentified-expense workflow &mdash; the whole thing</li>
                    <li><strong>CSV export &mdash; your data, always</strong></li>
                </ul>
                <a href="/register" class="dg-tier__cta-wrap">
                    <Button variant="almanac-ghost" size="lg" class="dg-tier__cta">
                        Begin a vault &rarr;
                    </Button>
                </a>
            </Plate>

            <Plate variant="inverted" as="article" class="dg-tier dg-tier--pro" data-reveal style="--rd: 120ms">
                <header class="dg-tier__head">
                    <h2 class="dg-tier__name"><em>Pro</em></h2>
                    <p class="dg-tier__price"><span>coming soon</span></p>
                </header>
                <Rule />
                <p class="dg-tier__lead"><em>Everything in Free, plus &mdash;</em></p>
                <ul class="dg-tier__list dg-tier__list--inv">
                    <li>Multiple funds per vault</li>
                    <li>Auto-replenishment (fixed or top-to-ceiling)</li>
                    <li>Unlimited recurring rules &middot; custom intervals &middot; auto-generation</li>
                    <li><strong>AI receipt scan</strong> (PDFs &amp; photos)</li>
                    <li><strong>AI period insights</strong>, grounded in your data</li>
                    <li>Advanced breakdowns &middot; custom range &middot; chart export</li>
                    <li>CSV import &middot; fund transfers &middot; cross-fund reimbursements</li>
                </ul>
                <p class="dg-tier__note">
                    <em>No credit card. No 14-day clock.</em> Pro can wait until
                    you actually need it.
                </p>
            </Plate>
        </div>
    </section>

    <!-- ============ PHILOSOPHY ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— On the shape of the free tier —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Pro <em>enhances</em>. It doesn&rsquo;t <em>unlock</em>.
            </h2>
        </header>
        <Rule />

        <div class="dg-pricing__philosophy">
            <Plate variant="default" as="article" class="dg-philo" data-reveal>
                <ChapterNum>§ 01</ChapterNum>
                <h3 class="dg-h3">Never gate a core workflow.</h3>
                <p class="dg-body">
                    If a free user can&rsquo;t accomplish the basic version of
                    a workflow, the workflow doesn&rsquo;t belong on Pro &mdash;
                    it belongs on Free. Logging an expense, claiming an unidentified
                    charge, viewing your own data: these will never sit behind
                    a paywall.
                </p>
            </Plate>

            <Plate variant="default" as="article" class="dg-philo" data-reveal style="--rd: 100ms">
                <ChapterNum>§ 02</ChapterNum>
                <h3 class="dg-h3">Pro gates scale, not access.</h3>
                <p class="dg-body">
                    More funds. More recurring rules. Longer history. Cross-entity
                    aggregation. Automation. AI. The Pro tier asks: <em>are you
                    doing this at the volume or depth where the cost of running
                    the feature shows up?</em> If yes, that&rsquo;s where Pro pays
                    its way.
                </p>
            </Plate>

            <Plate variant="default" as="article" class="dg-philo" data-reveal style="--rd: 200ms">
                <ChapterNum>§ 03</ChapterNum>
                <h3 class="dg-h3">Data portability is baseline trust.</h3>
                <p class="dg-body">
                    CSV export is free, on every plan, with no row limit. We
                    treat data lock-in as adversarial to the user. If you decide
                    DuitGee isn&rsquo;t for you, your full chronicle leaves with
                    you in one click.
                </p>
            </Plate>
        </div>
    </section>

    <!-- ============ COMPARISON TABLES ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— A side-by-side reading —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What&rsquo;s in <em>each tier</em>, in detail.
            </h2>
        </header>
        <Rule variant="double" />

        <div class="dg-compare">
            {#each groups as group, gi (group.title)}
                <Plate variant="default" as="figure" class="dg-compare__plate" data-reveal style="--rd: {gi * 80}ms">
                    <div class="dg-compare__head">
                        <Eyebrow tone="ink">{group.eyebrow}</Eyebrow>
                        <h3 class="dg-compare__title"><em>{group.title}</em></h3>
                    </div>
                    <Rule variant="double" />
                    <table class="dg-compare__table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th class="dg-compare__col">Free</th>
                                <th class="dg-compare__col">Pro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each group.rows as row, i (row.label)}
                                <tr class={i < group.rows.length - 1 ? "dg-compare__row dg-compare__row--dashed" : "dg-compare__row"}>
                                    <td class={row.emphasis ? "dg-compare__feat dg-compare__feat--em" : "dg-compare__feat"}>
                                        {row.label}
                                    </td>
                                    <td class="dg-compare__col">
                                        {#if row.free === "—"}
                                            <span class="dg-compare__none">—</span>
                                        {:else}
                                            {row.free}
                                        {/if}
                                    </td>
                                    <td class="dg-compare__col dg-compare__col--pro">
                                        {#if row.pro === "—"}
                                            <span class="dg-compare__none">—</span>
                                        {:else}
                                            {row.pro}
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </Plate>
            {/each}
        </div>
    </section>

    <!-- ============ WHY PRO ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— A closer look at Pro —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What you actually get when you upgrade.
            </h2>
        </header>
        <Rule />

        <ul class="dg-whypro">
            {#each proGated as feat, i (feat.name)}
                <li data-reveal style="--rd: {i * 60}ms">
                    <Plate variant="inset" class="dg-whypro__item">
                        <h3 class="dg-whypro__name"><em>{feat.name}</em></h3>
                        <p class="dg-whypro__what">{feat.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ FAQ ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Footnotes &amp; corrections —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Pricing questions, answered.
            </h2>
        </header>
        <Rule variant="double" />

        <div class="dg-faq">
            <Accordion type="single" class="dg-faq__list">
                <AccordionItem value="when-pro">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">i.</ChapterNum>
                            When is Pro launching?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Pro is in the works. The features above are
                            already wired into the codebase &mdash; we&rsquo;re
                            settling on price, billing, and the right rollout
                            order. Free users won&rsquo;t lose a thing when Pro
                            arrives.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="downgrade">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">ii.</ChapterNum>
                            What happens if I cancel Pro?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            We degrade gracefully. Data you created on Pro
                            stays visible &mdash; we don&rsquo;t hide funds,
                            delete recurring rules, or wipe history. You just
                            stop being able to <em>create new things</em> at
                            the Pro scale until you upgrade again.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="freeforever">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">iii.</ChapterNum>
                            Will Free always cover daily use?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            That&rsquo;s the design rule. We will <em>never</em>
                            move expense logging, member breakdowns, the
                            unidentified workflow, or CSV export behind a
                            paywall. The only direction Pro grows is scale,
                            automation, and depth.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="export">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">iv.</ChapterNum>
                            Can I really get my full data out, even on Free?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes. CSV export is free, on every plan, with no
                            row limit and no time gate. Take it elsewhere if
                            you want to. We&rsquo;d rather earn the next month
                            than trap the last one.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-cost">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">v.</ChapterNum>
                            Why is the AI behind Pro?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Receipt scanning and period insights both run real
                            inference per call &mdash; that&rsquo;s a usage
                            cost, not a fixed cost. Putting them on Pro keeps
                            the free tier sustainable and stops a single
                            high-volume user from forcing us to throttle the
                            rest. Manual entry, recurring, and stats remain
                            free.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </section>

    <!-- ============ FINAL CTA ============ -->
    <section class="dg-final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-final__eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-final__h">
                Begin on the<br />
                <em>free</em> tier.
            </h2>
            <p class="dg-final__lead">
                <em>You&rsquo;ll know if Pro is for you</em> long before we
                ask you to pay for it.
            </p>
            <a href="/register">
                <Button variant="almanac-ghost" size="lg" class="dg-final__cta">
                    Create your first vault &rarr;
                </Button>
            </a>
        </div>
    </section>
</div>

<style>
    /* Inherit type system from landing — this page is its own composition,
       but uses the same .dg-* classes so the editorial voice stays consistent. */

    .dg-pricing {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    /* Reveal animation — same pattern as landing */
    :global(.dg-pricing.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-pricing.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-pricing.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

    /* ---------- Type ---------- */
    .dg-display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.4rem, 6vw, 4.6rem);
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
    .dg-h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 460;
        font-size: 1.2rem;
        line-height: 1.25;
        letter-spacing: -0.012em;
        margin: 12px 0 10px;
        color: var(--almanac-ink);
    }
    .dg-body {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        margin: 0 0 0.6rem;
    }
    .dg-body em { font-style: italic; color: var(--almanac-ink); }

    /* ---------- Hero ---------- */
    .dg-hero {
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 4vw, 3.5rem);
    }
    .dg-hero--narrow .dg-hero__copy {
        max-width: 50rem;
    }
    .dg-hero__masthead {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
    }
    :global(.dg-hero__chap) {
        font-size: 1.05rem;
    }
    :global(.dg-lead) {
        font-family: 'Newsreader', serif;
        font-size: 1.15rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 1.4rem 0 0;
    }

    /* ---------- Section shell ---------- */
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

    /* ---------- Tiers (mirror landing) ---------- */
    .dg-tiers {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        margin-top: 1.5rem;
    }
    @media (min-width: 880px) {
        .dg-tiers { grid-template-columns: 1fr 1fr; }
    }
    :global(.dg-tier) {
        padding: clamp(1.5rem, 3vw, 2rem) !important;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .dg-tier__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
    }
    .dg-tier__name {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 380;
        font-size: 2rem;
        margin: 0;
    }
    .dg-tier__name em { font-style: italic; color: var(--almanac-oxblood); }
    :global(.dg-tier--pro .dg-tier__name em) { color: inherit; }
    .dg-tier__price {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.6rem;
        font-variation-settings: 'opsz' 144, 'wght' 420;
        margin: 0;
    }
    .dg-tier__price span {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--almanac-ink-3);
        margin-left: 0.4rem;
    }
    :global(.dg-tier--pro .dg-tier__price span) { color: var(--spotlight-meta); }
    .dg-tier__lead {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 1rem;
        color: var(--almanac-ink-2);
        margin: 0;
    }
    :global(.dg-tier--pro .dg-tier__lead) { color: var(--spotlight-meta); }
    .dg-tier__list {
        list-style: none;
        padding: 0;
        margin: 0;
        font-family: 'Newsreader', serif;
        font-size: 0.98rem;
        line-height: 1.55;
    }
    .dg-tier__list li {
        position: relative;
        padding: 0.5rem 0 0.5rem 1.4rem;
        border-bottom: 1px dashed var(--almanac-rule-soft);
    }
    .dg-tier__list li:last-child { border-bottom: none; }
    .dg-tier__list li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.95rem;
        width: 0.45rem;
        height: 0.45rem;
        background: var(--almanac-oxblood);
    }
    .dg-tier__list li strong {
        font-weight: 600;
        font-style: italic;
        color: var(--almanac-ink);
    }
    .dg-tier__list--inv li {
        color: var(--spotlight-fg);
        border-bottom-color: var(--spotlight-rule);
    }
    .dg-tier__list--inv li::before { background: var(--almanac-gold); }
    .dg-tier__list--inv li strong { color: var(--spotlight-fg); }

    .dg-tier__cta-wrap {
        display: inline-block;
        margin-top: 0.4rem;
    }
    .dg-tier__note {
        font-family: 'Newsreader', serif;
        font-size: 0.92rem;
        font-style: italic;
        color: var(--spotlight-meta);
        margin: 0.4rem 0 0;
    }
    .dg-tier__note em { color: var(--spotlight-fg); }

    /* ---------- Philosophy plates ---------- */
    .dg-pricing__philosophy {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        margin-top: 1.5rem;
    }
    @media (min-width: 800px) {
        .dg-pricing__philosophy { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-philo) {
        padding: clamp(1.4rem, 2.5vw, 1.8rem) !important;
    }

    /* ---------- Compare tables ---------- */
    .dg-compare {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.6rem;
        margin-top: 1.5rem;
    }
    :global(.dg-compare__plate) {
        padding: 0 !important;
        margin: 0;
        overflow: hidden;
    }
    .dg-compare__head {
        padding: clamp(1rem, 2vw, 1.4rem) clamp(1.1rem, 2.5vw, 1.6rem) 0.6rem;
    }
    .dg-compare__title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.4rem;
        line-height: 1.1;
        margin: 0.2rem 0 0;
    }
    .dg-compare__title em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
        color: var(--almanac-oxblood);
    }
    .dg-compare__table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
    }
    .dg-compare__table thead th {
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
    .dg-compare__col {
        text-align: right;
        white-space: nowrap;
        width: 32%;
    }
    .dg-compare__row td {
        padding: 0.8rem clamp(1.1rem, 2.5vw, 1.6rem);
        color: var(--almanac-ink-2);
        vertical-align: top;
    }
    .dg-compare__row--dashed td {
        border-bottom: 1px dashed var(--almanac-rule-soft);
    }
    .dg-compare__feat { color: var(--almanac-ink); }
    .dg-compare__feat--em { font-style: italic; color: var(--almanac-oxblood); }
    .dg-compare__col--pro { color: var(--almanac-ink); font-style: italic; }
    .dg-compare__none {
        font-family: 'JetBrains Mono', monospace;
        color: var(--almanac-ink-3);
    }

    /* ---------- Why-pro list ---------- */
    .dg-whypro {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    @media (min-width: 720px) {
        .dg-whypro { grid-template-columns: 1fr 1fr; }
    }
    :global(.dg-whypro__item) {
        padding: 1.1rem 1.3rem !important;
    }
    .dg-whypro__name {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.1rem;
        margin: 0 0 0.25rem;
        color: var(--almanac-ink);
    }
    .dg-whypro__name em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-whypro__what {
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0;
    }

    /* ---------- FAQ (mirror landing) ---------- */
    .dg-faq { margin-top: 1.2rem; }
    :global(.dg-faq__list) {
        font-family: 'Newsreader', serif;
    }
    .dg-faq__head {
        display: inline-flex;
        align-items: baseline;
        gap: 0.7rem;
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.1rem;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        color: var(--almanac-ink);
    }
    :global(.dg-faq__num) {
        font-style: italic;
        color: var(--almanac-gold);
    }

    /* ---------- Final CTA (matches landing) ---------- */
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
