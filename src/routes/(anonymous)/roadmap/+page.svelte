<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import {
        Eyebrow,
        ChapterNum,
        Rule,
        DropCap,
        Plate,
    } from "$lib/components/almanac";

    type Item = { title: string; what: string };

    const shipped: Item[] = [
        { title: "Vaults & roles", what: "Owner / admin / member RBAC, multi-vault support, soft delete, member invitations." },
        { title: "Unidentified-expense workflow", what: "Placeholder logging when the bank notification beats the spender home — claim-don't-merge, ±1 day matching, any payer." },
        { title: "Funds — descriptive wallets", what: "Real wallets with cycle ledgers, scheduled or manual top-ups, optional carry-over to another fund." },
        { title: "Recurring expenses", what: "Queue mode (you approve) and auto-generation mode. Daily, weekly, monthly, yearly intervals." },
        { title: "AI receipt scan", what: "Photos and PDFs in, structured expense out — amount, merchant, date, category. Always confirm before saving." },
        { title: "AI period insights", what: "Anomalies, drifts, forgotten subscriptions — grounded against your real numbers, with a hallucination guard." },
        { title: "Statistics dashboard", what: "Server-side aggregations: trend, category, member, payment-type, fund, template breakdowns." },
        { title: "Calendar view", what: "A whole month of household spending laid out by day." },
        { title: "CSV import & export", what: "Bring history in, take everything out — export is free on every plan, no row limit." },
        { title: "Multi-currency by vault", what: "Each vault is one currency; pick from 30+ at creation." },
        { title: "Notifications", what: "Vault-wide best-effort delivery, fan-out only when the household actually needs to see something." },
        { title: "Family Almanac design system", what: "Editorial visual system — Fraunces, Newsreader, oxblood, square corners, hairline rules — shipped end-to-end on 2026-05-01." },
    ];

    const inProgress: Item[] = [
        { title: "Public marketing surfaces", what: "Pricing, features, about, contact, roadmap, status — the marketing front-of-house, in Almanac voice." },
        { title: "Pro plan launch", what: "Billing flow, subscription handling, plan-tier UX. The entitlements are already wired into the codebase." },
    ];

    const comingSoon: Item[] = [
        { title: "Native mobile apps", what: "Most household spending gets logged on a phone. Web is mobile-friendly today; the wrapper is the next major step." },
        { title: "Quick-log on the home screen", what: "Two-tap entry from the lock screen, for the recurring small charges that don't deserve a full form." },
        { title: "Notifications with delivery channels", what: "Email and push on top of in-app, so the household actually sees the things that matter." },
    ];

    const considering: Item[] = [
        { title: "Bank sync", what: "The biggest functional gap versus Western personal-finance apps. Structurally hard — region-fragmented APIs, ongoing operational cost. The unidentified workflow is the structural alternative for now." },
        { title: "Category budgets layer", what: "On top of existing funds, without changing the descriptive-wallet philosophy. Could add a soft alert at category level. Not currently planned." },
        { title: "Period-over-period reports", what: "Quarterly / yearly recap pages that read like an editorial issue. Aligned to the AI period insights work." },
        { title: "Household-onboarding ritual", what: "A short, opinionated setup: first vault, first fund, first recurring, first invite — instead of a blank slate." },
    ];

    const wontDo: Item[] = [
        { title: "Per-expense splits & settle-up", what: "Would expand the Splitwise overlap. Not currently planned — flag if a request implies it." },
        { title: "Multi-currency per expense", what: "Currency lives at the vault level. Travelers and cross-currency households use a vault per currency." },
        { title: "Prescriptive budgeting (YNAB-style)", what: "Funds are descriptive wallets, not envelopes. We don't enforce \"assign every dollar.\"" },
        { title: "Bank-sync as primary input", what: "Manual entry, AI scan, and CSV are the data-in paths. The unidentified-expense workflow exists because bank notifications usually arrive before anyone can log the spend." },
    ];

    const counts = [
        { label: "Shipped", count: shipped.length, color: "var(--almanac-forest)" },
        { label: "In progress", count: inProgress.length, color: "var(--almanac-oxblood)" },
        { label: "Coming soon", count: comingSoon.length, color: "var(--almanac-gold)" },
        { label: "Considering", count: considering.length, color: "var(--almanac-ink-2)" },
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

    const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
</script>

<svelte:head>
    <title>Roadmap — DuitGee</title>
    <meta
        name="description"
        content="What's shipped, what's in progress, what's coming, and what we've consciously decided not to build. The roadmap, openly."
    />
</svelte:head>

<div class="dg-landing dg-roadmap" use:reveal>
    <!-- ============ HERO ============ -->
    <section class="dg-hero dg-hero--narrow">
        <div class="dg-hero__copy">
            <div class="dg-hero__masthead" data-reveal>
                <Eyebrow tone="muted">Vol. V &middot; Last revised &middot; {today}</Eyebrow>
                <ChapterNum class="dg-hero__chap">Plate § Roadmap</ChapterNum>
            </div>
            <h1 class="dg-display" data-reveal style="--rd: 80ms">
                What we&rsquo;ve built. What&rsquo;s <em>next</em>.
            </h1>
            <Rule />
            <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                Roadmaps are signals, not promises. The shape of the
                household almanac changes as we use it. <em>Shipped</em>
                items are in the app today; <em>in progress</em> is what
                we&rsquo;re writing this week. <em>Coming soon</em> is the
                near horizon. <em>Considering</em> is honest about ideas
                we&rsquo;re weighing without committing &mdash; and there
                are a few things we&rsquo;ve consciously decided <em>not</em>
                to build.
            </DropCap>
        </div>
    </section>

    <!-- ============ COUNTS ============ -->
    <section class="dg-section">
        <div class="dg-roadmap__counts">
            {#each counts as item, i (item.label)}
                <Plate variant="default" class="dg-roadmap__count" data-reveal style="--rd: {i * 60}ms">
                    <Eyebrow tone="muted">{item.label}</Eyebrow>
                    <p class="dg-roadmap__count-num" style="color: {item.color}">
                        {item.count}
                    </p>
                </Plate>
            {/each}
        </div>
    </section>

    <!-- ============ SHIPPED ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter I &middot; In the volume —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What&rsquo;s <em>shipped</em>.
            </h2>
            <p class="dg-body dg-roadmap__sub" data-reveal style="--rd: 80ms">
                Available in the app today. Use them in your own vault &mdash;
                Free or otherwise.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-roadmap__list">
            {#each shipped as item, i (item.title)}
                <li data-reveal style="--rd: {i * 40}ms">
                    <Plate variant="default" class="dg-roadmap__item">
                        <div class="dg-roadmap__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <span class="dg-roadmap__badge dg-roadmap__badge--shipped">Shipped</span>
                        </div>
                        <h3 class="dg-roadmap__name"><em>{item.title}</em></h3>
                        <Rule />
                        <p class="dg-roadmap__what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ IN PROGRESS ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter II &middot; This week&rsquo;s pages —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What&rsquo;s <em>in progress</em>.
            </h2>
            <p class="dg-body dg-roadmap__sub" data-reveal style="--rd: 80ms">
                Actively in development. These are likely to land in the next
                few revisions.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-roadmap__list">
            {#each inProgress as item, i (item.title)}
                <li data-reveal style="--rd: {i * 40}ms">
                    <Plate variant="default" class="dg-roadmap__item">
                        <div class="dg-roadmap__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <span class="dg-roadmap__badge dg-roadmap__badge--progress">In progress</span>
                        </div>
                        <h3 class="dg-roadmap__name"><em>{item.title}</em></h3>
                        <Rule />
                        <p class="dg-roadmap__what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ COMING SOON ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter III &middot; The near horizon —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What&rsquo;s <em>coming soon</em>.
            </h2>
            <p class="dg-body dg-roadmap__sub" data-reveal style="--rd: 80ms">
                Designed and committed, queued for build. Order may shift as
                we learn from real households.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-roadmap__list">
            {#each comingSoon as item, i (item.title)}
                <li data-reveal style="--rd: {i * 40}ms">
                    <Plate variant="default" class="dg-roadmap__item">
                        <div class="dg-roadmap__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <span class="dg-roadmap__badge dg-roadmap__badge--soon">Coming soon</span>
                        </div>
                        <h3 class="dg-roadmap__name"><em>{item.title}</em></h3>
                        <Rule />
                        <p class="dg-roadmap__what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ CONSIDERING ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter IV &middot; Open questions —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What we&rsquo;re <em>considering</em>.
            </h2>
            <p class="dg-body dg-roadmap__sub" data-reveal style="--rd: 80ms">
                Ideas we&rsquo;re weighing without committing. They might
                ship in this shape, or in a different shape, or not at all.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-roadmap__list">
            {#each considering as item, i (item.title)}
                <li data-reveal style="--rd: {i * 40}ms">
                    <Plate variant="default" class="dg-roadmap__item">
                        <div class="dg-roadmap__head">
                            <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                            <span class="dg-roadmap__badge dg-roadmap__badge--maybe">Considering</span>
                        </div>
                        <h3 class="dg-roadmap__name"><em>{item.title}</em></h3>
                        <Rule />
                        <p class="dg-roadmap__what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ WON'T DO ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter V &middot; Conscious omissions —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What we&rsquo;ve decided <em>not</em> to build.
            </h2>
            <p class="dg-body dg-roadmap__sub" data-reveal style="--rd: 80ms">
                Saying no is a feature. These would expand the surface area
                without serving the two ideas behind the product.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-roadmap__wont">
            {#each wontDo as item, i (item.title)}
                <li data-reveal style="--rd: {i * 40}ms">
                    <Plate variant="inset" class="dg-roadmap__wont-item">
                        <h3 class="dg-roadmap__name"><em>{item.title}</em></h3>
                        <p class="dg-roadmap__what">{item.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ FINAL CTA ============ -->
    <section class="dg-final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-final__eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-final__h">
                Have an idea<br />
                <em>worth a chapter?</em>
            </h2>
            <p class="dg-final__lead">
                <em>We read every email.</em> If you&rsquo;ve hit something
                missing, or seen a way DuitGee could serve the two ideas
                better, write us.
            </p>
            <a href="/contact">
                <Button variant="almanac-ghost" size="lg" class="dg-final__cta">
                    Send us a note &rarr;
                </Button>
            </a>
        </div>
    </section>
</div>

<style>
    .dg-roadmap {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-roadmap.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-roadmap.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-roadmap.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

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
    .dg-body {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
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
    .dg-roadmap__sub { max-width: 50rem; margin-top: 1rem; }

    /* ---------- Counts ---------- */
    .dg-roadmap__counts {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }
    @media (min-width: 720px) {
        .dg-roadmap__counts { grid-template-columns: repeat(4, 1fr); }
    }
    :global(.dg-roadmap__count) {
        padding: 1.1rem 1.3rem !important;
        text-align: left;
    }
    .dg-roadmap__count-num {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 380;
        font-style: italic;
        font-size: 2.6rem;
        line-height: 1;
        letter-spacing: -0.02em;
        margin: 0.5rem 0 0;
    }

    /* ---------- Item lists ---------- */
    .dg-roadmap__list {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
    }
    @media (min-width: 760px) {
        .dg-roadmap__list { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 1100px) {
        .dg-roadmap__list { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-roadmap__item) {
        padding: clamp(1.2rem, 2.4vw, 1.6rem) !important;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .dg-roadmap__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
    }
    .dg-roadmap__name {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        font-size: 1.15rem;
        line-height: 1.2;
        margin: 0;
        color: var(--almanac-ink);
    }
    .dg-roadmap__name em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-roadmap__what {
        font-family: 'Newsreader', serif;
        font-size: 0.96rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0;
    }

    /* ---------- Status badges ---------- */
    .dg-roadmap__badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 0.25rem 0.55rem;
        border: 1px solid;
        background: transparent;
    }
    .dg-roadmap__badge--shipped {
        color: var(--almanac-forest);
        border-color: var(--almanac-forest);
    }
    .dg-roadmap__badge--progress {
        color: var(--almanac-oxblood);
        border-color: var(--almanac-oxblood);
    }
    .dg-roadmap__badge--soon {
        color: var(--almanac-gold);
        border-color: var(--almanac-gold);
    }
    .dg-roadmap__badge--maybe {
        color: var(--almanac-ink-2);
        border-color: var(--almanac-rule-soft);
    }

    /* ---------- Won't-do (de-emphasised) ---------- */
    .dg-roadmap__wont {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    @media (min-width: 760px) {
        .dg-roadmap__wont { grid-template-columns: 1fr 1fr; }
    }
    :global(.dg-roadmap__wont-item) {
        padding: 1.1rem 1.3rem !important;
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
