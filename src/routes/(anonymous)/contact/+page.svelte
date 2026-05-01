<script lang="ts">
    import { Eyebrow, ChapterNum, Rule, DropCap, Plate } from "$lib/components/almanac";
</script>

<svelte:head>
    <title>Contact — DuitGee</title>
    <meta
        name="description"
        content="Get in touch with the DuitGee team. Email for support, account questions, and partnership enquiries."
    />
</svelte:head>

<div class="dg-volume">
    <article class="dg-volume__inner">
        <header class="dg-volume__head">
            <Eyebrow tone="muted">Vol. V &middot; Plate § Contact</Eyebrow>
            <h1 class="dg-volume__title">
                The household&rsquo;s <em>letterbox</em>.
            </h1>
            <p class="dg-volume__sub">
                Where to write us, what to expect, and how soon.
            </p>
        </header>
        <Rule variant="double" />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter I —</ChapterNum>
            <h2 class="dg-volume__h2">Before you write.</h2>
            <DropCap class="dg-volume__body">
                Most questions about the product itself are answered on the
                <a href="/features" class="dg-volume__link">features</a> and
                <a href="/pricing" class="dg-volume__link">pricing</a> pages.
                Privacy and account-handling questions live in
                <a href="/privacy" class="dg-volume__link">the privacy
                policy</a> and <a href="/terms" class="dg-volume__link">terms of
                service</a>. If you&rsquo;ve checked those and your question
                is still open, write us &mdash; the channels are below.
            </DropCap>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter II &middot; The channels —</ChapterNum>
            <h2 class="dg-volume__h2">How to reach us.</h2>
            <p class="dg-volume__body">
                We keep a single inbox. There&rsquo;s no chat widget, no
                support tier, no &ldquo;your call is important to us&rdquo;
                queue. A real person reads every email.
            </p>

            <div class="dg-contact__plates">
                <Plate variant="default" class="dg-contact__plate">
                    <Eyebrow tone="oxblood">Plate § 01</Eyebrow>
                    <h3 class="dg-contact__h"><em>Support</em> &amp; account questions</h3>
                    <p class="dg-contact__what">
                        Bugs, feature questions, account recovery, vault
                        membership, billing &mdash; anything to do with
                        <em>using</em> DuitGee.
                    </p>
                    <Rule />
                    <a href="mailto:support@duitgee.com" class="dg-contact__email">
                        support@duitgee.com
                    </a>
                    <p class="dg-contact__sla">
                        <em>We aim to reply within two business days.</em>
                    </p>
                </Plate>

                <Plate variant="default" class="dg-contact__plate">
                    <Eyebrow tone="oxblood">Plate § 02</Eyebrow>
                    <h3 class="dg-contact__h"><em>Privacy</em> &amp; data requests</h3>
                    <p class="dg-contact__what">
                        Data export beyond CSV, data deletion, GDPR / CCPA
                        requests, security disclosures. Use the same address
                        and we&rsquo;ll route it.
                    </p>
                    <Rule />
                    <a href="mailto:support@duitgee.com?subject=Privacy%20request" class="dg-contact__email">
                        support@duitgee.com
                    </a>
                    <p class="dg-contact__sla">
                        <em>Subject line: &ldquo;Privacy request&rdquo; &mdash; helps us prioritise.</em>
                    </p>
                </Plate>

                <Plate variant="default" class="dg-contact__plate">
                    <Eyebrow tone="oxblood">Plate § 03</Eyebrow>
                    <h3 class="dg-contact__h"><em>Partnership</em> &amp; press</h3>
                    <p class="dg-contact__what">
                        Integrations, partnerships, press, podcast invitations.
                        We&rsquo;re a small team &mdash; we&rsquo;ll be honest
                        about whether we have the bandwidth.
                    </p>
                    <Rule />
                    <a href="mailto:support@duitgee.com?subject=Partnership" class="dg-contact__email">
                        support@duitgee.com
                    </a>
                    <p class="dg-contact__sla">
                        <em>Subject line: &ldquo;Partnership&rdquo; or &ldquo;Press&rdquo;.</em>
                    </p>
                </Plate>
            </div>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter III &middot; What helps us help you —</ChapterNum>
            <h2 class="dg-volume__h2">A short etiquette note.</h2>
            <p class="dg-volume__body">
                A few details, included up front, save us a back-and-forth:
            </p>
            <ul class="dg-volume__list">
                <li>
                    The <strong>vault name or ID</strong> the question is about
                    (you can find it in the URL of the vault).
                </li>
                <li>
                    The <strong>email address</strong> on the account, if
                    you&rsquo;re writing from a different one.
                </li>
                <li>
                    For bugs, what you <strong>expected</strong> versus what
                    <strong>happened</strong>, plus the browser / device.
                </li>
                <li>
                    For data requests, the <strong>scope</strong> &mdash;
                    one vault, all vaults, a specific date range.
                </li>
            </ul>
            <p class="dg-volume__body">
                Screenshots are welcome. Sensitive details (amounts, names)
                can be redacted &mdash; the structure of the issue is usually
                what we need.
            </p>
        </section>

        <Rule variant="ornament">⁂</Rule>

        <p class="dg-volume__foot">
            <a href="/about">About</a>
            <span aria-hidden="true">·</span>
            <a href="/features">Features</a>
            <span aria-hidden="true">·</span>
            <a href="/pricing">Pricing</a>
            <span aria-hidden="true">·</span>
            <a href="/">Back to home</a>
        </p>
    </article>
</div>

<style>
    .dg-volume {
        max-width: 64rem;
        margin: 0 auto;
        padding: clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem);
        color: var(--almanac-ink);
    }
    .dg-volume__inner {
        background: var(--almanac-card);
        border: 1px solid var(--almanac-ink);
        padding: clamp(2rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem);
    }
    .dg-volume__head { margin-bottom: 0; }
    .dg-volume__title {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 400;
        font-size: clamp(2.4rem, 5vw, 3.6rem);
        line-height: 1.05;
        letter-spacing: -0.02em;
        margin: 0.6rem 0 0.4rem;
        color: var(--almanac-ink);
    }
    .dg-volume__title em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
        color: var(--almanac-oxblood);
    }
    .dg-volume__sub {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 1.05rem;
        color: var(--almanac-ink-2);
        margin: 0.4rem 0 0;
    }

    .dg-volume__section { padding: 1.4rem 0 0.6rem; }
    :global(.dg-volume__chap) {
        display: block;
        margin-bottom: 0.4rem;
    }
    .dg-volume__h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 60, 'wght' 380;
        font-style: italic;
        font-size: clamp(1.5rem, 2.6vw, 2rem);
        line-height: 1.1;
        letter-spacing: -0.014em;
        color: var(--almanac-ink);
        margin: 0 0 1rem;
    }
    .dg-volume__body {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.7;
        color: var(--almanac-ink-2);
        margin: 0 0 1rem;
    }
    .dg-volume__link {
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
    }

    .dg-volume__list {
        list-style: none;
        padding: 0;
        margin: 0 0 1rem;
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
    }
    .dg-volume__list li {
        position: relative;
        padding: 0.4rem 0 0.4rem 1.4rem;
        border-bottom: 1px dashed var(--almanac-rule-soft);
    }
    .dg-volume__list li:last-child { border-bottom: none; }
    .dg-volume__list li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.85rem;
        width: 0.45rem;
        height: 0.45rem;
        background: var(--almanac-oxblood);
    }
    .dg-volume__list li strong {
        font-weight: 600;
        font-style: italic;
        color: var(--almanac-ink);
    }

    /* ---------- Contact plates ---------- */
    .dg-contact__plates {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
        margin: 1.5rem 0 0.6rem;
    }
    @media (min-width: 880px) {
        .dg-contact__plates { grid-template-columns: repeat(3, 1fr); }
    }
    :global(.dg-contact__plate) {
        padding: 1.2rem 1.3rem !important;
    }
    .dg-contact__h {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'wght' 460;
        font-size: 1.15rem;
        line-height: 1.25;
        margin: 0.4rem 0 0.4rem;
        color: var(--almanac-ink);
    }
    .dg-contact__h em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-contact__what {
        font-family: 'Newsreader', serif;
        font-size: 0.96rem;
        line-height: 1.55;
        color: var(--almanac-ink-2);
        margin: 0 0 0.6rem;
    }
    .dg-contact__what em { font-style: italic; color: var(--almanac-ink); }
    .dg-contact__email {
        display: inline-block;
        margin: 0.7rem 0 0.4rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.92rem;
        letter-spacing: 0.01em;
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
        word-break: break-all;
    }
    .dg-contact__sla {
        font-family: 'Newsreader', serif;
        font-size: 0.88rem;
        font-style: italic;
        color: var(--almanac-ink-3);
        margin: 0;
    }
    .dg-contact__sla em { color: var(--almanac-ink-2); }

    .dg-volume__foot {
        margin: 1.5rem 0 0;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        color: var(--almanac-ink-3);
    }
    .dg-volume__foot a {
        color: var(--almanac-ink-2);
        text-decoration: none;
    }
    .dg-volume__foot a:hover { color: var(--almanac-oxblood); }
    .dg-volume__foot span { margin: 0 0.6rem; }
</style>
