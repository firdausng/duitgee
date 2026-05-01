<script lang="ts">
    import { Eyebrow, ChapterNum, Rule, DropCap } from "$lib/components/almanac";
</script>

<svelte:head>
    <title>About — DuitGee</title>
    <meta
        name="description"
        content="DuitGee was built so a husband and wife could manage their shared expenses without the small recurring frictions. The product generalises from there — a collaborative-first tracker for households, with solo use as a graceful fallback."
    />
</svelte:head>

<div class="dg-volume">
    <article class="dg-volume__inner">
        <header class="dg-volume__head">
            <Eyebrow tone="muted">Vol. V &middot; Plate § About</Eyebrow>
            <h1 class="dg-volume__title">
                On <em>why</em> DuitGee exists.
            </h1>
            <p class="dg-volume__sub">
                A short note on the origin, the two ideas, and who this is for.
            </p>
        </header>
        <Rule variant="double" />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter I &middot; Origin —</ChapterNum>
            <h2 class="dg-volume__h2">A husband, a wife, a shared card.</h2>
            <DropCap class="dg-volume__body">
                DuitGee was built primarily so the maker and his wife could
                manage their shared expenses without the small recurring
                frictions that come with a manual-entry app. The product
                generalises from that origin &mdash; a collaborative-first
                expense tracker for <em>families</em>, with the smaller
                &ldquo;works solo too&rdquo; framing as a secondary audience.
            </DropCap>
            <p class="dg-volume__body">
                The collaborative framing is the design centre, not a
                marketing add-on. Vaults with proper roles, the
                unidentified-expense workflow, member breakdowns,
                vault-wide notifications &mdash; these all start from
                <em>&ldquo;people sharing money in a household&rdquo;</em>
                and degrade gracefully to <em>&ldquo;one person tracking
                themselves.&rdquo;</em>
            </p>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter II &middot; The two ideas —</ChapterNum>
            <h2 class="dg-volume__h2">Every feature serves one of these.</h2>
            <p class="dg-volume__body">
                If a feature can&rsquo;t be traced back to one of the two
                ideas below, it probably isn&rsquo;t on-strategy. Most
                features primarily serve one; a few enabling pieces (funds,
                recurring rules, attachments) support both as scaffolding.
            </p>

            <h3 class="dg-volume__h3"><em>i.</em> &middot; Reduce misunderstanding and friction</h3>
            <p class="dg-volume__body">
                Between the people in a household managing shared money. The
                friction is interpersonal, not technical:
            </p>
            <ul class="dg-volume__list">
                <li><em>&ldquo;Did you log that yet?&rdquo;</em> &mdash; the &ldquo;ping me when you&rsquo;re done&rdquo; loop that sharing a card creates.</li>
                <li><em>&ldquo;Wait, what was that charge?&rdquo;</em> &mdash; the bank notification that nobody in the family can immediately explain.</li>
                <li><em>&ldquo;I think you double-entered that.&rdquo;</em> &mdash; the duplicate-detection problem when two members log the same dinner.</li>
                <li><em>&ldquo;How much did we spend on dining out this month?&rdquo;</em> &mdash; the &ldquo;let me dig through receipts&rdquo; tax on every check-in.</li>
            </ul>

            <h3 class="dg-volume__h3"><em>ii.</em> &middot; Spot gaps in spending behavior</h3>
            <p class="dg-volume__body">
                The patterns you can&rsquo;t see when you&rsquo;re inside them:
            </p>
            <ul class="dg-volume__list">
                <li>The installment that crept in &mdash; subscriptions, BNPL, monthly devices.</li>
                <li>The dining-out drift &mdash; last quarter it was a treat; this quarter it&rsquo;s the default.</li>
                <li>The forgotten subscription you stopped using six months ago.</li>
                <li>The category that consistently runs over your mental model of <em>normal</em>.</li>
            </ul>
            <p class="dg-volume__body">
                These two ideas are <em>not interchangeable</em>. The first is
                relational (&ldquo;between us&rdquo;). The second is analytical
                (&ldquo;about the data&rdquo;). When we suggest a new feature,
                we ask which idea it serves. If neither, it has to justify
                itself on a different axis &mdash; trust, table stakes, error
                recovery &mdash; or get deprioritised.
            </p>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter III &middot; Who it&rsquo;s for —</ChapterNum>
            <h2 class="dg-volume__h2">Households first, solo gracefully.</h2>

            <h3 class="dg-volume__h3"><em>§ 3.1</em> &middot; Primary audience</h3>
            <p class="dg-volume__body">
                Families sharing money. Couples, couples with kids,
                multi-generational households, flatmates with a joint pool.
                Two or more people, one (or a few) shared pool(s) of money.
                The collaboration features assume household members trust
                each other but don&rsquo;t always communicate immediately
                about every transaction.
            </p>

            <h3 class="dg-volume__h3"><em>§ 3.2</em> &middot; Secondary audience</h3>
            <p class="dg-volume__body">
                Solo users. Every collaboration feature works in degenerate
                single-user mode &mdash; your &ldquo;partner&rdquo; just
                becomes future-you, the version trying to remember what last
                Tuesday&rsquo;s charge was for. Funds, recurring rules,
                statistics, and AI insights all stand on their own without
                a collaborator.
            </p>

            <h3 class="dg-volume__h3"><em>§ 3.3</em> &middot; Not the audience</h3>
            <ul class="dg-volume__list">
                <li><strong>Splitwise&rsquo;s audience</strong> &mdash; people who need who-owes-whom math, settle-up flows, uneven splits.</li>
                <li><strong>YNAB&rsquo;s audience</strong> &mdash; people who want a prescriptive &ldquo;assign every dollar&rdquo; budgeting ritual.</li>
                <li><strong>Monarch / Copilot / Mint audience</strong> &mdash; people who want bank-sync-driven aggregation and net-worth tracking.</li>
                <li><strong>Enterprise expense</strong> &mdash; Expensify, Pleo, Brex.</li>
            </ul>
            <p class="dg-volume__body">
                Knowing this in advance saves you a download. We&rsquo;d
                rather you bounce <em>now</em> than later.
            </p>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter IV &middot; Plan philosophy —</ChapterNum>
            <h2 class="dg-volume__h2"><em>Pro</em> enhances. <em>Free</em> is fully usable.</h2>
            <p class="dg-volume__body">
                Never gate a core workflow. The free tier covers a real
                household&rsquo;s daily life: unlimited expenses and members,
                shared vaults, the entire unidentified-expense workflow,
                one fund, five recurring rules, basic statistics for the
                last 12 months, attachments, and full CSV export. A user
                who never upgrades should still get sustained value.
            </p>
            <p class="dg-volume__body">
                Pro gates <em>scale, automation, depth, and AI</em> &mdash;
                never access to basic functionality. Multiple funds, fund
                auto-replenishment, unlimited recurring rules, AI receipt
                scan, AI period insights, advanced breakdowns, custom
                ranges, chart export, CSV import, fund transfers,
                cross-fund reimbursements.
            </p>
            <p class="dg-volume__body">
                <em>Data portability is baseline trust.</em> CSV export is
                free, on every plan, with no row limit, with no time gate.
                Data lock-in is adversarial to the user.
            </p>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter V &middot; What this isn&rsquo;t —</ChapterNum>
            <h2 class="dg-volume__h2">Corrections worth keeping straight.</h2>
            <ul class="dg-volume__list">
                <li>
                    <strong>Not a Splitwise replacement.</strong> No per-expense
                    splits, no IOU ledger, no settle-up. Each expense has
                    one payer. The &ldquo;net position&rdquo; stat is just
                    total spend divided by active members &mdash; an even
                    split is assumed.
                </li>
                <li>
                    <strong>Not a YNAB-style budget tool.</strong> Funds are
                    descriptive wallets, not prescriptive envelopes. No
                    <em>&ldquo;assign every dollar&rdquo;</em>, no overspending
                    block, no forced category-to-category trade-offs.
                </li>
                <li>
                    <strong>Not a bank-syncing aggregator.</strong> Manual
                    entry, AI receipt scan, and CSV import are the data-in
                    paths. The unidentified-expense workflow exists because
                    bank notifications usually arrive <em>before</em> anyone
                    can log the spend &mdash; we leaned into that reality
                    instead of fighting it.
                </li>
                <li>
                    <strong>Not multi-currency per expense.</strong> Currency
                    lives at the vault level. Travelers and cross-currency
                    households use a vault per currency.
                </li>
            </ul>
        </section>
        <Rule />

        <section class="dg-volume__section">
            <ChapterNum class="dg-volume__chap">— Chapter VI &middot; What&rsquo;s next —</ChapterNum>
            <h2 class="dg-volume__h2">Roadmap signals, not commitments.</h2>
            <ul class="dg-volume__list">
                <li>
                    <strong>Native mobile apps.</strong> Web is mobile-friendly
                    today; the wrapper is the next major step. Most household
                    spending gets logged on a phone.
                </li>
                <li>
                    <strong>Bank sync</strong> is the biggest functional gap
                    versus Western personal-finance apps but is structurally
                    hard &mdash; region-fragmented APIs, ongoing cost. The
                    unidentified workflow is the structural alternative for now.
                </li>
                <li>
                    <strong>Per-expense splits and settle-up</strong> would
                    expand the Splitwise overlap. <em>Not currently planned</em>;
                    we&rsquo;ll flag if a request implies it.
                </li>
                <li>
                    <strong>Category budgets layer.</strong> Could be added on
                    top of existing funds without changing the descriptive-wallet
                    philosophy. <em>Not currently planned.</em>
                </li>
            </ul>
        </section>

        <Rule variant="ornament">⁂</Rule>

        <p class="dg-volume__foot">
            <a href="/features">Features</a>
            <span aria-hidden="true">·</span>
            <a href="/pricing">Pricing</a>
            <span aria-hidden="true">·</span>
            <a href="/contact">Contact</a>
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
    .dg-volume__head {
        margin-bottom: 0;
    }
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
    .dg-volume__h2 em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-volume__h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 460;
        font-size: 1.05rem;
        margin: 1.5rem 0 0.6rem;
        color: var(--almanac-ink);
    }
    .dg-volume__h3 em {
        font-style: italic;
        color: var(--almanac-gold);
        margin-right: 0.4rem;
    }

    .dg-volume__body {
        font-family: 'Newsreader', serif;
        font-size: 1rem;
        line-height: 1.7;
        color: var(--almanac-ink-2);
        margin: 0 0 1rem;
    }
    .dg-volume__body em { font-style: italic; color: var(--almanac-ink); }

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
    .dg-volume__list li em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }

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
