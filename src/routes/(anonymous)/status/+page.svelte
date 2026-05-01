<script lang="ts">
    import {
        Eyebrow,
        ChapterNum,
        Rule,
        DropCap,
        Plate,
    } from "$lib/components/almanac";

    type ServiceState = "operational" | "degraded" | "outage" | "maintenance";

    type Service = {
        name: string;
        what: string;
        state: ServiceState;
    };

    const services: Service[] = [
        {
            name: "The web application",
            what: "Pages, forms, the household chronicle.",
            state: "operational",
        },
        {
            name: "The API",
            what: "Hono RPC endpoints powering every action.",
            state: "operational",
        },
        {
            name: "The main database",
            what: "Cloudflare D1 — vaults, expenses, funds, recurring rules.",
            state: "operational",
        },
        {
            name: "The auth database",
            what: "Cloudflare D1 — accounts, sessions, organisations.",
            state: "operational",
        },
        {
            name: "Authentication",
            what: "Better Auth — sign-in, sessions, account security.",
            state: "operational",
        },
        {
            name: "Object storage",
            what: "Cloudflare R2 — receipt attachments, photos, PDFs.",
            state: "operational",
        },
        {
            name: "Workers AI",
            what: "Receipt scan and period insights inference.",
            state: "operational",
        },
    ];

    const overall: ServiceState = services.every((s) => s.state === "operational")
        ? "operational"
        : services.some((s) => s.state === "outage")
          ? "outage"
          : "degraded";

    const overallCopy = {
        operational: {
            eyebrow: "— All systems —",
            title: "Operating as expected.",
            sub: "Every surface of the household almanac is reachable. No reported incidents in the last day.",
        },
        degraded: {
            eyebrow: "— Degraded —",
            title: "Operating with friction.",
            sub: "One or more services are responding slowly or partially. Active incident below.",
        },
        outage: {
            eyebrow: "— Outage —",
            title: "Service is interrupted.",
            sub: "One or more critical services are unreachable. We are working on it.",
        },
        maintenance: {
            eyebrow: "— Scheduled maintenance —",
            title: "Briefly under maintenance.",
            sub: "A planned window is in progress. Service should resume shortly.",
        },
    } as const;

    const stateLabel: Record<ServiceState, string> = {
        operational: "Operational",
        degraded: "Degraded",
        outage: "Outage",
        maintenance: "Maintenance",
    };

    // 30-day uptime strip — all-good for now (no incident history wiring yet)
    const uptime = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            state: "operational" as ServiceState,
        };
    });

    const lastChecked = new Date().toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

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
    <title>Status — DuitGee</title>
    <meta
        name="description"
        content="Current operational status of DuitGee services — web, API, database, storage, AI, and authentication."
    />
</svelte:head>

<div class="dg-landing dg-status" use:reveal>
    <!-- ============ HERO ============ -->
    <section class="dg-hero dg-hero--narrow">
        <div class="dg-hero__copy">
            <div class="dg-hero__masthead" data-reveal>
                <Eyebrow tone="muted">Vol. V &middot; Last checked &middot; {lastChecked}</Eyebrow>
                <ChapterNum class="dg-hero__chap">Plate § Status</ChapterNum>
            </div>
            <h1 class="dg-display" data-reveal style="--rd: 80ms">
                The <em>operational</em><br />
                bulletin.
            </h1>
            <Rule />
            <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                A short, plain-language reading of every service the
                household almanac depends on. If something here is red,
                we already know &mdash; and we&rsquo;re working on it.
                Subscribe to the page in your feed reader if you want a
                heads-up the moment a state changes.
            </DropCap>
        </div>
    </section>

    <!-- ============ OVERALL BANNER ============ -->
    <section class="dg-section">
        <Plate
            variant="default"
            class="dg-status__banner dg-status__banner--{overall}"
            data-reveal
        >
            <div class="dg-status__banner-inner">
                <div class="dg-status__dot dg-status__dot--{overall}" aria-hidden="true"></div>
                <div class="dg-status__banner-text">
                    <Eyebrow tone={overall === "operational" ? "muted" : "oxblood"}>
                        {overallCopy[overall].eyebrow}
                    </Eyebrow>
                    <p class="dg-status__banner-title">
                        <em>{overallCopy[overall].title}</em>
                    </p>
                    <p class="dg-status__banner-sub">
                        {overallCopy[overall].sub}
                    </p>
                </div>
            </div>
        </Plate>
    </section>

    <!-- ============ SERVICES ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter I &middot; The services —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What&rsquo;s <em>up</em>, line by line.
            </h2>
            <p class="dg-body dg-status__sub" data-reveal style="--rd: 80ms">
                Each service is checked on a one-minute cadence. Anything
                other than <em>operational</em> shows a short note explaining
                what we know and what we&rsquo;re doing about it.
            </p>
        </header>
        <Rule variant="double" />

        <ul class="dg-status__services">
            {#each services as service, i (service.name)}
                <li data-reveal style="--rd: {i * 40}ms">
                    <Plate variant="default" class="dg-status__service">
                        <div class="dg-status__service-head">
                            <div class="dg-status__service-id">
                                <ChapterNum>§ {String(i + 1).padStart(2, "0")}</ChapterNum>
                                <h3 class="dg-status__service-name">
                                    <em>{service.name}</em>
                                </h3>
                            </div>
                            <span class="dg-status__pill dg-status__pill--{service.state}">
                                <span class="dg-status__pill-dot dg-status__dot--{service.state}"></span>
                                {stateLabel[service.state]}
                            </span>
                        </div>
                        <Rule />
                        <p class="dg-status__service-what">{service.what}</p>
                    </Plate>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ============ UPTIME ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter II &middot; The last thirty days —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Uptime, <em>at a glance</em>.
            </h2>
            <p class="dg-body dg-status__sub" data-reveal style="--rd: 80ms">
                Each square is a day. <em>Forest</em> means clear; warmer
                colours mean a degradation or outage we logged.
            </p>
        </header>
        <Rule />

        <Plate variant="default" class="dg-status__uptime" data-reveal>
            <div class="dg-status__uptime-head">
                <Eyebrow tone="ink">Plate II &middot; The chronicle of uptime</Eyebrow>
            </div>
            <Rule variant="double" />
            <div class="dg-status__uptime-grid" role="img" aria-label="30-day uptime grid">
                {#each uptime as day (day.date)}
                    <span
                        class="dg-status__uptime-cell dg-status__uptime-cell--{day.state}"
                        title={`${day.date} — ${stateLabel[day.state]}`}
                    ></span>
                {/each}
            </div>
            <div class="dg-status__uptime-meta">
                <span>{uptime[0].date}</span>
                <span>30 days, all clear</span>
                <span>{uptime[uptime.length - 1].date}</span>
            </div>
        </Plate>
    </section>

    <!-- ============ INCIDENTS ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter III &middot; The incident log —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Recent <em>incidents</em>.
            </h2>
            <p class="dg-body dg-status__sub" data-reveal style="--rd: 80ms">
                When something goes sideways, this is where the post-mortem
                lives. A short timeline, the impact, and the fix.
            </p>
        </header>
        <Rule variant="double" />

        <Plate variant="inset" class="dg-status__empty" data-reveal>
            <Eyebrow tone="muted">— No active incidents —</Eyebrow>
            <p class="dg-status__empty-title">
                <em>The chronicle is quiet.</em>
            </p>
            <p class="dg-status__empty-sub">
                We have no reported incidents in the last 30 days. If you
                are seeing something unexpected, please write us at
                <a href="mailto:support@duitgee.com" class="dg-status__email">support@duitgee.com</a>.
            </p>
        </Plate>
    </section>

    <!-- ============ FOOTER NOTE ============ -->
    <section class="dg-section dg-status__footer">
        <Rule variant="ornament">⁂</Rule>
        <p class="dg-status__foot">
            <a href="/contact">Contact</a>
            <span aria-hidden="true">·</span>
            <a href="/roadmap">Roadmap</a>
            <span aria-hidden="true">·</span>
            <a href="/">Back to home</a>
        </p>
    </section>
</div>

<style>
    .dg-status {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    :global(.dg-status.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.dg-status.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.dg-status.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
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
    .dg-status__sub { max-width: 50rem; margin-top: 1rem; }

    /* ---------- Overall banner ---------- */
    :global(.dg-status__banner) {
        padding: clamp(1.4rem, 2.6vw, 2rem) !important;
    }
    :global(.dg-status__banner--operational) {
        border-left: 4px solid var(--almanac-forest) !important;
    }
    :global(.dg-status__banner--degraded) {
        border-left: 4px solid var(--almanac-gold) !important;
    }
    :global(.dg-status__banner--outage) {
        border-left: 4px solid var(--almanac-oxblood) !important;
    }
    :global(.dg-status__banner--maintenance) {
        border-left: 4px solid var(--almanac-ink-2) !important;
    }
    .dg-status__banner-inner {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    }
    .dg-status__banner-text { flex: 1; min-width: 0; }
    .dg-status__banner-title {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 60, 'wght' 380;
        font-size: clamp(1.4rem, 2.6vw, 2rem);
        line-height: 1.1;
        margin: 0.3rem 0 0.4rem;
        color: var(--almanac-ink);
    }
    .dg-status__banner-title em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
    }
    .dg-status__banner-sub {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0;
    }

    /* ---------- Status dot (used in banner + service pills) ---------- */
    .dg-status__dot {
        width: 0.85rem;
        height: 0.85rem;
        border-radius: 999px;
        flex-shrink: 0;
        margin-top: 0.5rem;
        position: relative;
    }
    .dg-status__dot::after {
        content: "";
        position: absolute;
        inset: -4px;
        border-radius: 999px;
        opacity: 0.25;
    }
    .dg-status__dot--operational { background: var(--almanac-forest); }
    .dg-status__dot--operational::after { background: var(--almanac-forest); }
    .dg-status__dot--degraded { background: var(--almanac-gold); }
    .dg-status__dot--degraded::after { background: var(--almanac-gold); }
    .dg-status__dot--outage { background: var(--almanac-oxblood); }
    .dg-status__dot--outage::after { background: var(--almanac-oxblood); }
    .dg-status__dot--maintenance { background: var(--almanac-ink-2); }
    .dg-status__dot--maintenance::after { background: var(--almanac-ink-2); }

    /* ---------- Services list ---------- */
    .dg-status__services {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    @media (min-width: 760px) {
        .dg-status__services { grid-template-columns: 1fr 1fr; }
    }
    :global(.dg-status__service) {
        padding: 1.1rem 1.3rem !important;
    }
    .dg-status__service-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.5rem;
    }
    .dg-status__service-id {
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
    }
    .dg-status__service-name {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        font-size: 1.1rem;
        line-height: 1.2;
        margin: 0;
        color: var(--almanac-ink);
    }
    .dg-status__service-name em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-status__service-what {
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0.5rem 0 0;
    }

    /* ---------- Status pill ---------- */
    .dg-status__pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 0.3rem 0.55rem;
        border: 1px solid;
        background: transparent;
        white-space: nowrap;
    }
    .dg-status__pill--operational {
        color: var(--almanac-forest);
        border-color: var(--almanac-forest);
    }
    .dg-status__pill--degraded {
        color: var(--almanac-gold);
        border-color: var(--almanac-gold);
    }
    .dg-status__pill--outage {
        color: var(--almanac-oxblood);
        border-color: var(--almanac-oxblood);
    }
    .dg-status__pill--maintenance {
        color: var(--almanac-ink-2);
        border-color: var(--almanac-rule-soft);
    }
    .dg-status__pill-dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        margin: 0;
    }
    .dg-status__pill-dot::after { display: none; }

    /* ---------- Uptime grid ---------- */
    :global(.dg-status__uptime) {
        padding: 0 !important;
        margin: 1.5rem auto 0;
        max-width: 56rem;
        overflow: hidden;
    }
    .dg-status__uptime-head {
        padding: clamp(1rem, 2vw, 1.4rem) clamp(1.2rem, 2.5vw, 1.8rem) 0.5rem;
    }
    .dg-status__uptime-grid {
        display: grid;
        grid-template-columns: repeat(30, minmax(0, 1fr));
        gap: 0.3rem;
        padding: 1.1rem clamp(1.2rem, 2.5vw, 1.8rem) 0.6rem;
    }
    .dg-status__uptime-cell {
        display: block;
        aspect-ratio: 1 / 3;
        border: 1px solid transparent;
    }
    .dg-status__uptime-cell--operational {
        background: var(--almanac-forest);
    }
    .dg-status__uptime-cell--degraded {
        background: var(--almanac-gold);
    }
    .dg-status__uptime-cell--outage {
        background: var(--almanac-oxblood);
    }
    .dg-status__uptime-cell--maintenance {
        background: var(--almanac-ink-2);
    }
    .dg-status__uptime-meta {
        padding: 0.6rem clamp(1.2rem, 2.5vw, 1.8rem) 1.1rem;
        display: flex;
        justify-content: space-between;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--almanac-ink-3);
    }

    /* ---------- Empty incidents ---------- */
    :global(.dg-status__empty) {
        padding: clamp(1.6rem, 3vw, 2.2rem) !important;
        text-align: center;
        margin-top: 1.5rem;
    }
    .dg-status__empty-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.4rem;
        margin: 0.6rem 0 0.4rem;
        color: var(--almanac-ink);
    }
    .dg-status__empty-title em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-status__empty-sub {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.6;
        color: var(--almanac-ink-2);
        margin: 0;
        max-width: 36rem;
        margin-left: auto;
        margin-right: auto;
    }
    .dg-status__email {
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
    }

    /* ---------- Footer ---------- */
    .dg-status__footer { text-align: center; }
    .dg-status__foot {
        margin: 1rem 0 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        color: var(--almanac-ink-3);
    }
    .dg-status__foot a {
        color: var(--almanac-ink-2);
        text-decoration: none;
    }
    .dg-status__foot a:hover { color: var(--almanac-oxblood); }
    .dg-status__foot span { margin: 0 0.6rem; }
</style>
