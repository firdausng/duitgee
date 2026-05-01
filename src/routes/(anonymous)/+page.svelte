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
        MoneyDisplay,
    } from "$lib/components/almanac";

    // Reveal-on-scroll: progressive enhancement. Content visible by default
    // (SSR / no-JS friendly); JS adds .js-reveal to hide elements briefly,
    // then IntersectionObserver re-shows them as they enter the viewport.
    function reveal(node: HTMLElement) {
        node.classList.add("js-reveal");
        const targets = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]"));

        for (const el of targets) {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9) {
                el.classList.add("is-in");
            }
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

    const year = new Date().getFullYear();
</script>

<svelte:head>
    <title>DuitGee — the household almanac for shared spending</title>
    <meta
        name="description"
        content="A collaborative expense tracker for families (works solo too). Less friction with your partner, clearer view of where the money goes, and the gaps you'd otherwise miss."
    />
</svelte:head>

<div class="dg-landing" use:reveal>
    <!-- ============ HERO ============ -->
    <section class="dg-hero">
        <div class="dg-hero__grid">
            <div class="dg-hero__copy">
                <div class="dg-hero__masthead" data-reveal>
                    <Eyebrow tone="muted">Vol. V &middot; No. 01</Eyebrow>
                    <ChapterNum class="dg-hero__chap">— Chapter I —</ChapterNum>
                </div>
                <h1 class="dg-display" data-reveal style="--rd: 80ms">
                    Less friction.<br />
                    <em>Fewer</em> blind spots.
                </h1>
                <Rule />
                <DropCap class="dg-lead" data-reveal style="--rd: 160ms">
                    A collaborative expense tracker that cuts the
                    &ldquo;did you log it?&rdquo; loop with your partner and
                    surfaces the patterns you&rsquo;d otherwise miss &mdash;
                    creeping installments, weekend-outing inflation, the
                    subscription you forgot about.
                </DropCap>
                <div class="dg-cta-row" data-reveal style="--rd: 240ms">
                    <a href="/register">
                        <Button variant="almanac-ox" size="lg">Begin a vault &rarr;</Button>
                    </a>
                    <a href="/login" class="dg-link">I already have an account</a>
                </div>
                <p class="dg-trust" data-reveal style="--rd: 320ms">
                    Your data, your CSV &mdash; export anytime. Free tier never expires.
                </p>
            </div>

            <!-- Plate I — The Household Ledger (almanac table mockup) -->
            <div class="dg-mock-wrap" data-reveal style="--rd: 200ms">
                <Plate variant="default" as="figure" class="dg-mock">
                    <div class="dg-mock__head">
                        <Eyebrow tone="ink">Plate I &middot; The Household Ledger</Eyebrow>
                    </div>
                    <Rule variant="double" />
                    <table class="dg-mock__table">
                        <thead>
                            <tr>
                                <th>Fund</th>
                                <th class="dg-mock__num">Allocated</th>
                                <th class="dg-mock__num">Remaining</th>
                                <th class="dg-mock__num dg-mock__progress">Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each [
                                { fund: "Groceries",  alloc: 400, rem: 240, pct: 60, color: "var(--almanac-oxblood)" },
                                { fund: "Petrol",     alloc: 280, rem: 106, pct: 38, color: "var(--almanac-forest)" },
                                { fund: "Children",   alloc: 200, rem: 168, pct: 84, color: "var(--almanac-gold)" },
                                { fund: "Date night", alloc: 240, rem: 120, pct: 50, color: "var(--almanac-oxblood)" },
                                { fund: "Sundries",   alloc: 120, rem:  64, pct: 53, color: "var(--almanac-forest)" },
                            ] as row, i (row.fund)}
                                <tr class={i < 4 ? "dg-mock__row dg-mock__row--dashed" : "dg-mock__row"}>
                                    <td>{row.fund}</td>
                                    <td class="dg-mock__num">${row.alloc}</td>
                                    <td class="dg-mock__num">${row.rem}</td>
                                    <td class="dg-mock__num">
                                        <span class="dg-mock__bar">
                                            <span style="width:{row.pct}%; background:{row.color}"></span>
                                        </span>
                                    </td>
                                </tr>
                            {/each}
                            <tr class="dg-mock__total">
                                <td>Total</td>
                                <td class="dg-mock__num">$1,240</td>
                                <td class="dg-mock__num">$698</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                    <p class="dg-mock__caption">Fig. 1 &mdash; A typical week, October.</p>
                </Plate>
            </div>
        </div>
    </section>

    <!-- ============ PULL QUOTE ============ -->
    <section class="dg-quote">
        <Rule variant="ornament">⁂</Rule>
        <p data-reveal>
            <em>Reduce the friction with your partner.</em><br />
            <em>See the gaps in your spending.</em>
        </p>
        <p class="dg-quote__attr" data-reveal style="--rd: 100ms">
            &mdash; the two ideas behind every feature
        </p>
        <Rule variant="ornament">⁂</Rule>
    </section>

    <!-- ============ CHAPTER II — MYSTERY-CHARGE ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter II —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                Your partner spent. The bank knows. <em>You don&rsquo;t.</em>
            </h2>
        </header>
        <Rule />

        <div class="dg-strip">
            <div class="dg-strip__intro">
                <p class="dg-body" data-reveal>
                    Every shared card has this awkward dance. Most apps make you
                    pick: guess the details, or wait. We added a third option that
                    <em>nobody else has</em> &mdash; log the charge as a placeholder
                    now, fill in the details when the spender shows up.
                </p>
            </div>

            <ol class="dg-frames">
                <li data-reveal>
                    <p class="dg-frame__caption">Sara&rsquo;s phone, 8:42 pm</p>
                    <Plate variant="inset" as="figure" class="dg-frame">
                        <Eyebrow tone="muted">Banking app</Eyebrow>
                        <p class="dg-frame__title"><em>$24.50 charged</em></p>
                        <p class="dg-frame__sub">at the local cafe</p>
                    </Plate>
                </li>
                <li data-reveal style="--rd: 120ms">
                    <p class="dg-frame__caption">Two taps in DuitGee</p>
                    <Plate variant="default" as="figure" class="dg-frame dg-frame--cta">
                        <Eyebrow tone="oxblood">Quick log &middot; unidentified</Eyebrow>
                        <div class="dg-frame__amt">
                            <MoneyDisplay amount={24.5} size={40} color="var(--almanac-ink)" />
                        </div>
                        <p class="dg-frame__sub"><em>Paid by Alex &middot; today</em></p>
                        <Button variant="almanac-ox" size="sm" class="dg-frame__btn">Log placeholder</Button>
                    </Plate>
                </li>
                <li data-reveal style="--rd: 240ms">
                    <p class="dg-frame__caption">When Alex gets home</p>
                    <Plate variant="default" as="figure" class="dg-frame">
                        <p class="dg-frame__title">
                            Looks like the cafe last night. Claim &amp; add the details?
                        </p>
                        <div class="dg-frame__pills">
                            <span class="dg-pill dg-pill--ghost">Skip</span>
                            <span class="dg-pill dg-pill--ox">Claim</span>
                        </div>
                    </Plate>
                </li>
            </ol>

            <Rule />
            <p class="dg-aside" data-reveal>
                The match runs <em>&plusmn;1 day, any payer</em> &mdash; shared cards
                don&rsquo;t care whose name is on the bank notification. And it never
                auto-merges. <em>Magical when right, painful when wrong.</em>
            </p>
        </div>
    </section>

    <!-- ============ CHAPTER III — PRINCIPLES ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter III —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                What the almanac <em>contains</em>.
            </h2>
        </header>
        <Rule variant="double" />

        <div class="dg-pillars">
            <Plate variant="default" as="article" class="dg-pillar" data-reveal>
                <ChapterNum>§ 01</ChapterNum>
                <h3 class="dg-h3">
                    Less &ldquo;did you log it?&rdquo;<br />
                    Less &ldquo;wait, what was that?&rdquo;
                </h3>
                <p class="dg-body">
                    Vaults with proper roles. Member breakdowns of who paid
                    what. The mystery-charge workflow so neither of you plays
                    detective. Notifications that fan out only when the
                    household actually needs to see them.
                </p>
                <Rule />
                <div class="dg-mini">
                    <div class="dg-avatars">
                        <span style="background: var(--almanac-gold)">S</span>
                        <span style="background: var(--almanac-forest); color: var(--almanac-paper)">A</span>
                    </div>
                    <p>Sara paid <em>$720</em> &middot; Alex paid <em>$510</em> this month</p>
                </div>
            </Plate>

            <Plate variant="default" as="article" class="dg-pillar" data-reveal style="--rd: 100ms">
                <ChapterNum>§ 02</ChapterNum>
                <h3 class="dg-h3">
                    Skip the manual entry,<br />
                    most of the time
                </h3>
                <p class="dg-body">
                    Snap a receipt &mdash; image or PDF &mdash; and the AI fills
                    in the amount, merchant, date, and category. Recurring rules
                    can queue an inbox you approve, or auto-generate when you
                    trust them. Bring history in by CSV.
                </p>
                <Rule />
                <div class="dg-mini">
                    <p class="dg-mini__row">
                        <span class="dg-mini__dot" style="background: var(--almanac-forest)"></span>
                        Receipt scanned &middot; <strong>$58.20</strong> at the grocery store
                    </p>
                    <p class="dg-mini__row">
                        <span class="dg-mini__dot" style="background: var(--almanac-gold)"></span>
                        Awaiting approval &middot; <strong>Streaming &middot; $9.99</strong>
                    </p>
                </div>
            </Plate>

            <Plate variant="default" as="article" class="dg-pillar" data-reveal style="--rd: 200ms">
                <ChapterNum>§ 03</ChapterNum>
                <h3 class="dg-h3">
                    Spot the gaps<br />
                    you&rsquo;d otherwise miss
                </h3>
                <p class="dg-body">
                    Trend, category, member, and payment-type breakdowns surface
                    the patterns &mdash; the installment that crept in, the
                    dining-out drift, the subscription you forgot you paid for.
                    The AI summary is grounded against your real numbers; bullets
                    it can&rsquo;t back up are dropped.
                </p>
                <Rule />
                <p class="dg-mini__quote">
                    <em>&ldquo;You have 8 active installments &mdash; up from 3 last
                    quarter. Dining out is up 38%.&rdquo;</em>
                </p>
                <p class="dg-mini__attr">
                    AI insight &middot; grounded in your actual numbers
                </p>
            </Plate>
        </div>
    </section>

    <!-- ============ CHAPTER IV — FUNDS ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Chapter IV &middot; On naming your funds —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                A fund is a <em>wallet</em>, not a budget.
            </h2>
        </header>
        <Rule />

        <div class="dg-funds">
            <div class="dg-funds__copy">
                <p class="dg-body" data-reveal>
                    Funds are real wallets &mdash; the household debit card, the
                    kid&rsquo;s allowance, the trip kitty. They top up on a
                    schedule (or when you say so), they carry over to other funds
                    at cycle close, and they record every transaction in an
                    immutable ledger.
                </p>
                <p class="dg-body" data-reveal style="--rd: 80ms">
                    No <em>&ldquo;assign every dollar&rdquo;</em> ritual. No
                    overspending blocks. <em>Just a clear running picture of what
                    each pot has left.</em>
                </p>
            </div>

            <div class="dg-funds__cards">
                <Plate variant="default" class="dg-fund" data-reveal>
                    <div class="dg-fund__head">
                        <h3 class="dg-fund__name"><em>Groceries</em></h3>
                        <ChapterNum>§ 01</ChapterNum>
                    </div>
                    <Rule />
                    <MoneyDisplay amount={240.40} size={32} color="var(--almanac-oxblood)" />
                    <p class="dg-fund__meta">of $600 &middot; tops up the 1st</p>
                    <span class="dg-fund__bar"><span style="width:40%; background:var(--almanac-oxblood)"></span></span>
                </Plate>

                <Plate variant="default" class="dg-fund" data-reveal style="--rd: 100ms">
                    <div class="dg-fund__head">
                        <h3 class="dg-fund__name"><em>Fuel</em></h3>
                        <ChapterNum>§ 02</ChapterNum>
                    </div>
                    <Rule />
                    <MoneyDisplay amount={106.00} size={32} color="var(--almanac-forest)" />
                    <p class="dg-fund__meta">of $150 &middot; top to ceiling, weekly</p>
                    <span class="dg-fund__bar"><span style="width:71%; background:var(--almanac-forest)"></span></span>
                </Plate>

                <Plate variant="default" class="dg-fund" data-reveal style="--rd: 200ms">
                    <div class="dg-fund__head">
                        <h3 class="dg-fund__name"><em>Date Night</em></h3>
                        <ChapterNum>§ 03</ChapterNum>
                    </div>
                    <Rule />
                    <MoneyDisplay amount={120.00} size={32} color="var(--almanac-gold)" />
                    <p class="dg-fund__meta">manual top-up &middot; cycle: monthly</p>
                    <p class="dg-fund__rollover">
                        Carries unused balance &rarr; <em>Gifts fund</em>
                    </p>
                </Plate>
            </div>
        </div>
    </section>

    <!-- ============ PRICING ============ -->
    <section class="dg-section dg-section--paper-2">
        <header class="dg-chap">
            <Eyebrow tone="muted">— On gathering subscriptions —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                <em>Free</em> is fully usable. <em>Pro</em> enhances.
            </h2>
            <p class="dg-body" data-reveal style="--rd: 80ms">
                We don&rsquo;t cripple the free tier to push upgrades. Free
                covers a real household&rsquo;s daily life. Pro is for scale,
                automation, and depth.
            </p>
        </header>
        <Rule variant="double" />

        <div class="dg-tiers">
            <Plate variant="default" as="article" class="dg-tier" data-reveal style="--rd: 120ms">
                <header class="dg-tier__head">
                    <h3 class="dg-tier__name"><em>Free</em></h3>
                    <p class="dg-tier__price">$0<span>/forever</span></p>
                </header>
                <Rule />
                <ul class="dg-tier__list">
                    <li>Unlimited expenses, unlimited members</li>
                    <li>1 active fund per vault</li>
                    <li>5 active recurring rules</li>
                    <li>Statistics for the last 12 months</li>
                    <li>Receipt attachments (up to 5 per expense)</li>
                    <li>Unidentified-expense workflow &mdash; the whole thing</li>
                    <li><strong>CSV export &mdash; your data, always</strong></li>
                </ul>
            </Plate>

            <Plate variant="inverted" as="article" class="dg-tier dg-tier--pro" data-reveal style="--rd: 200ms">
                <header class="dg-tier__head">
                    <h3 class="dg-tier__name"><em>Pro</em></h3>
                    <p class="dg-tier__price"><span>coming soon</span></p>
                </header>
                <Rule />
                <p class="dg-tier__lead"><em>Everything in Free, plus &mdash;</em></p>
                <ul class="dg-tier__list dg-tier__list--inv">
                    <li>Multiple funds per vault</li>
                    <li>Auto-replenishment (fixed or top-to-ceiling)</li>
                    <li>Unlimited recurring + auto-generation + custom intervals</li>
                    <li><strong>AI receipt scan</strong> (PDFs &amp; photos)</li>
                    <li><strong>AI period insights</strong>, grounded in your data</li>
                    <li>Advanced breakdowns, custom range, chart export</li>
                    <li>CSV import, fund transfers, cross-fund reimbursements</li>
                </ul>
            </Plate>
        </div>
    </section>

    <!-- ============ FAQ — FOOTNOTES ============ -->
    <section class="dg-section">
        <header class="dg-chap">
            <Eyebrow tone="muted">— Footnotes &amp; corrections —</Eyebrow>
            <h2 class="dg-h2" data-reveal>
                We&rsquo;d rather you bounce <em>now</em> than later.
            </h2>
            <p class="dg-body dg-faq__sub" data-reveal style="--rd: 80ms">
                Here&rsquo;s what DuitGee <em>doesn&rsquo;t</em> do, in case you were
                expecting it. Knowing this in advance saves you a download.
            </p>
        </header>
        <Rule variant="double" />

        <div class="dg-faq">
            <Accordion type="single" class="dg-faq__list">
                <AccordionItem value="splitwise">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">i.</ChapterNum>
                            Is this Splitwise?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            No. DuitGee tracks the household&rsquo;s shared spending
                            pool. We don&rsquo;t do per-expense splits (60/40, by
                            income, by share) and there&rsquo;s no IOU settle-up
                            flow. If you specifically need who-owes-whom maths,
                            Splitwise stays excellent at that &mdash; we&rsquo;re
                            complementary, not a replacement.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="solo">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">ii.</ChapterNum>
                            Can I use it on my own?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes. The collaboration features (shared vaults, member
                            breakdowns, the mystery-charge workflow) are
                            designed-in, but every one of them works just as well
                            solo &mdash; your &ldquo;partner&rdquo; just becomes
                            future-you, the version trying to remember what that
                            charge was last Tuesday. Funds, recurring rules,
                            statistics, and AI insights all stand on their own.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ynab">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">iii.</ChapterNum>
                            Is this YNAB?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Also no. Funds are descriptive wallets, not a budget you
                            have to assign every dollar to. We don&rsquo;t block
                            overspending or force you to move money between
                            categories. We track reality; we don&rsquo;t enforce a
                            plan.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bank">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">iv.</ChapterNum>
                            Does it connect to my bank?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Not today. The data-in paths are manual entry, the AI
                            receipt scanner, and CSV import. The Unidentified
                            Expense workflow exists precisely because bank
                            notifications usually arrive before anyone has time to
                            log the spend &mdash; we leaned into that reality
                            instead of fighting it.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="currency">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">v.</ChapterNum>
                            Can I track multiple currencies?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Each vault is one currency &mdash; pick from 30+ at
                            creation. There&rsquo;s no per-expense currency or FX.
                            If you need two currencies, create two vaults. Frequent
                            travelers may find this limiting; we&rsquo;d rather be
                            honest about the scope than pretend to handle FX
                            correctly.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">vi.</ChapterNum>
                            Can I get my data out if I leave?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes. CSV export is free, on every plan, with no row
                            limit. We treat data portability as a baseline trust
                            signal &mdash; you should never feel locked in.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mobile">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <ChapterNum class="dg-faq__num">vii.</ChapterNum>
                            Is there a mobile app?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Mobile-friendly web today, native apps planned soon. The
                            whole UI is designed phone-first because that&rsquo;s
                            where the actual spending gets logged &mdash; the
                            wrapper around it is the next step.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </section>

    <!-- ============ FINAL — INVITATION ============ -->
    <section class="dg-final">
        <div data-reveal>
            <Eyebrow tone="gold" class="dg-final__eyebrow">— An invitation —</Eyebrow>
            <h2 class="dg-final__h">
                Begin your<br />
                <em>almanac</em>.
            </h2>
            <p class="dg-final__lead">
                <em>No credit card. No 14-day clock.</em> Pro can wait until you need it.
            </p>
            <a href="/register">
                <Button variant="almanac-ghost" size="lg" class="dg-final__cta">
                    Create your first vault &rarr;
                </Button>
            </a>
        </div>
    </section>

    <!-- ============ FOOTER ============ -->
    <footer class="dg-footer">
        <Rule variant="ornament">⁂</Rule>
        <div class="dg-footer__inner">
            <div class="dg-footer__brand">
                <span class="dg-footer__mark">duitgee</span>
                <span class="dg-footer__year">Vol. V &middot; &copy; {year}</span>
            </div>
            <nav>
                <a href="/features">Features</a>
                <a href="/pricing">Pricing</a>
                <a href="/use-cases">Use cases</a>
                <a href="/alternative-to">Comparisons</a>
                <a href="/roadmap">Roadmap</a>
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
                <a href="/status">Status</a>
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="/login">Sign in</a>
            </nav>
        </div>
    </footer>
</div>

<style>
    /* ===========================================================
       Almanac landing — layout, type, and bespoke flourishes only.
       Color tokens (paper, ink, oxblood, forest, gold) and shadcn
       variable rebinds come from .dg-almanac on the layout root.
       =========================================================== */

    .dg-landing {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        color: var(--almanac-ink);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
        font-feature-settings: 'ss01';
    }

    /* ---------- Reveal animation ----------
       The `.js-reveal` class is added at runtime by the action, so Svelte's
       static analysis can't see it inside scoped selectors. Use :global to
       opt the whole rule out of scoping. */
    :global(.js-reveal [data-reveal]) {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    :global(.js-reveal [data-reveal].is-in) {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        :global(.js-reveal [data-reveal]) { opacity: 1; transform: none; transition: none; }
    }

    /* ---------- Type system ---------- */
    .dg-display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.8rem, 7vw, 5.5rem);
        line-height: 0.95;
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
        font-size: clamp(1.8rem, 3.6vw, 2.8rem);
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
        font-size: 1.3rem;
        line-height: 1.2;
        letter-spacing: -0.012em;
        margin: 10px 0 12px;
        color: var(--almanac-ink);
    }

    .dg-body {
        font-family: 'Newsreader', 'Fraunces', Georgia, serif;
        font-size: 1rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        margin: 14px 0 0;
    }
    .dg-body em {
        font-style: italic;
        color: var(--almanac-ink);
    }

    .dg-link {
        font-family: 'Newsreader', serif;
        font-style: italic;
        color: var(--almanac-ink-2);
        font-size: 1rem;
        text-decoration: underline;
        text-underline-offset: 4px;
        transition: color 200ms;
    }
    .dg-link:hover { color: var(--almanac-oxblood); }

    .dg-trust {
        margin-top: 1.4rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        color: var(--almanac-ink-3);
    }

    /* ===========================================================
       HERO
       =========================================================== */
    .dg-hero {
        padding: clamp(3rem, 6vw, 5rem) clamp(1.25rem, 4vw, 4rem) clamp(3rem, 6vw, 5rem);
        max-width: 86rem;
        margin: 0 auto;
    }
    .dg-hero__grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: clamp(2.5rem, 5vw, 4rem);
        align-items: start;
    }
    @media (min-width: 960px) {
        .dg-hero__grid { grid-template-columns: 1.15fr 0.85fr; }
    }
    .dg-hero__masthead {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    :global(.dg-hero__chap) {
        display: inline-block;
    }
    .dg-cta-row {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-top: 1.8rem;
        flex-wrap: wrap;
    }

    /* ---------- Hero almanac ledger plate ----------
       `.dg-mock`, `.dg-frame`, `.dg-pillar`, `.dg-tier` etc. are passed via
       class= on Plate (a child component), so they land on Plate's wrapper
       element which Svelte gives Plate's scope hash, not landing's. Use
       :global() to scope-exempt these selectors. Descendants inside Plate's
       slot keep landing's scope, so non-class-passed selectors are fine. */
    .dg-mock-wrap {
        max-width: 30rem;
        width: 100%;
        justify-self: center;
    }
    :global(.dg-mock) {
        position: relative;
    }
    .dg-mock__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0;
    }
    .dg-mock__table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Newsreader', serif;
        font-size: 0.94rem;
    }
    .dg-mock__table thead tr { border-bottom: 1px solid var(--almanac-ink); }
    .dg-mock__table th {
        text-align: left;
        padding: 6px 4px;
        font-style: italic;
        font-weight: 400;
        color: var(--almanac-ink-2);
        font-size: 0.85rem;
    }
    .dg-mock__num { text-align: right; }
    .dg-mock__progress { width: 90px; }
    .dg-mock__row td {
        padding: 10px 4px;
        color: var(--almanac-ink);
    }
    .dg-mock__row--dashed td {
        border-bottom: 1px dashed var(--almanac-rule-soft);
    }
    td.dg-mock__num {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
        font-feature-settings: 'tnum';
    }
    .dg-mock__total {
        border-top: 5px solid transparent;
        background: linear-gradient(
            var(--almanac-ink) 0 1px,
            transparent 1px 4px,
            var(--almanac-ink) 4px 5px
        ) top / 100% 5px no-repeat;
    }
    .dg-mock__total td {
        padding: 14px 4px 6px;
        font-style: italic;
        font-weight: 600;
        color: var(--almanac-ink);
    }
    .dg-mock__total td.dg-mock__num {
        font-family: 'JetBrains Mono', monospace;
        font-style: normal;
    }
    .dg-mock__bar {
        display: block;
        height: 4px;
        background: var(--almanac-paper-2);
        overflow: hidden;
    }
    .dg-mock__bar > span {
        display: block;
        height: 100%;
    }
    .dg-mock__caption {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.78rem;
        color: var(--almanac-ink-3);
        margin: 14px 0 0;
        text-align: center;
    }

    /* ===========================================================
       PULL QUOTE
       =========================================================== */
    .dg-quote {
        text-align: center;
        padding: clamp(2rem, 4vw, 3rem) clamp(1.25rem, 4vw, 3rem);
        max-width: 60rem;
        margin: 0 auto;
    }
    .dg-quote p:nth-child(2) {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 320;
        font-style: italic;
        font-size: clamp(1.6rem, 3.2vw, 2.4rem);
        line-height: 1.25;
        color: var(--almanac-ink);
        margin: 0;
        letter-spacing: -0.012em;
    }
    .dg-quote p:nth-child(2) em {
        font-style: italic;
        color: var(--almanac-ink);
    }
    .dg-quote__attr {
        margin: 1rem 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--almanac-ink-3);
    }

    /* ===========================================================
       SECTIONS
       =========================================================== */
    .dg-section {
        padding: clamp(3.5rem, 7vw, 6rem) clamp(1.25rem, 4vw, 4rem);
        max-width: 86rem;
        margin: 0 auto;
    }
    .dg-section--paper-2 {
        background: var(--almanac-paper-2);
        max-width: none;
        border-top: 1px solid var(--almanac-ink);
        border-bottom: 1px solid var(--almanac-ink);
    }
    .dg-section--paper-2 > * { max-width: 86rem; margin-inline: auto; }

    .dg-chap {
        margin-bottom: 1rem;
    }

    /* ---------- Story strip ---------- */
    .dg-strip {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
    .dg-strip__intro { max-width: 38rem; }
    .dg-frames {
        list-style: none;
        padding: 0;
        margin: 1.4rem 0 0;
        display: grid;
        gap: 1.4rem;
        grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
        .dg-frames { grid-template-columns: repeat(3, 1fr); gap: 1.6rem; }
    }
    .dg-frames li {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .dg-frame__caption {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--almanac-ink-3);
        margin: 0;
    }
    :global(.dg-frame) {
        min-height: 11rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.55rem;
    }
    .dg-frame__title {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 30, 'wght' 460;
        font-size: 1.25rem;
        margin: 0.4rem 0 0;
        letter-spacing: -0.01em;
        color: var(--almanac-ink);
    }
    .dg-frame__title em { font-style: italic; color: var(--almanac-oxblood); }
    .dg-frame__sub {
        font-family: 'Newsreader', serif;
        font-size: 0.88rem;
        color: var(--almanac-ink-2);
        margin: 0;
        line-height: 1.4;
    }
    .dg-frame__sub em { font-style: italic; color: var(--almanac-ink); }
    .dg-frame__amt {
        margin: 0.4rem 0 0.2rem;
    }
    :global(.dg-frame__btn) {
        align-self: flex-start;
        margin-top: 0.6rem;
    }
    .dg-frame__pills {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .dg-pill {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.4rem 0.85rem;
        border: 1px solid var(--almanac-ink);
    }
    .dg-pill--ox {
        background: var(--almanac-oxblood);
        color: var(--almanac-paper);
        border-color: var(--almanac-oxblood);
    }
    .dg-pill--ghost {
        background: transparent;
        color: var(--almanac-ink-2);
        border-color: var(--almanac-rule-soft);
    }

    .dg-aside {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.95rem;
        color: var(--almanac-ink-2);
        line-height: 1.6;
        margin: 0;
        max-width: 48rem;
    }
    .dg-aside em { color: var(--almanac-oxblood); }

    /* ---------- Three pillars ---------- */
    .dg-pillars {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.4rem;
    }
    @media (min-width: 880px) {
        .dg-pillars {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.6rem;
        }
    }
    :global(.dg-pillar) {
        display: flex;
        flex-direction: column;
    }
    .dg-mini {
        font-family: 'Newsreader', serif;
        font-size: 0.9rem;
        color: var(--almanac-ink-2);
    }
    .dg-mini p { margin: 0; }
    .dg-mini em { font-style: italic; color: var(--almanac-oxblood); font-feature-settings: 'tnum'; }

    .dg-avatars {
        display: flex;
        margin-bottom: 0.7rem;
    }
    .dg-avatars span {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-weight: 600;
        font-size: 0.85rem;
        margin-left: -0.4rem;
        border: 2px solid var(--almanac-card);
        color: var(--almanac-ink);
    }
    .dg-avatars span:first-child { margin-left: 0; }

    .dg-mini__row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.4rem 0;
        border-bottom: 1px dashed var(--almanac-rule-soft);
        margin: 0;
    }
    .dg-mini__row:last-child { border-bottom: none; }
    .dg-mini__row strong {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 600;
        font-feature-settings: 'tnum';
        font-size: 0.85rem;
    }
    .dg-mini__dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .dg-mini__quote {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 60, 'wght' 380;
        font-size: 0.95rem;
        color: var(--almanac-ink);
        line-height: 1.5;
        margin: 0;
    }
    .dg-mini__attr {
        margin: 0.7rem 0 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: var(--almanac-ink-3);
        letter-spacing: 0.06em;
    }

    /* ---------- Funds section ---------- */
    .dg-funds {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        align-items: start;
    }
    @media (min-width: 960px) {
        .dg-funds { grid-template-columns: 1fr 1fr; gap: 3rem; }
    }
    .dg-funds__copy { max-width: 36rem; }
    .dg-funds__cards {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .dg-fund__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .dg-fund__name {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 24, 'SOFT' 30, 'wght' 500;
        font-size: 1.1rem;
        margin: 0;
        color: var(--almanac-ink);
    }
    .dg-fund__name em {
        font-style: italic;
        color: var(--almanac-ink);
    }
    .dg-fund__meta {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-ink-2);
        margin: 0.4rem 0 0;
    }
    .dg-fund__bar {
        display: block;
        height: 4px;
        background: var(--almanac-paper-2);
        overflow: hidden;
        margin-top: 0.85rem;
    }
    .dg-fund__bar > span {
        display: block;
        height: 100%;
    }
    .dg-fund__rollover {
        margin: 0.85rem 0 0;
        padding-top: 0.85rem;
        border-top: 1px dashed var(--almanac-rule-soft);
        font-family: 'Newsreader', serif;
        font-size: 0.85rem;
        color: var(--almanac-ink-3);
    }
    .dg-fund__rollover em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }

    /* ---------- Pricing ---------- */
    .dg-tiers {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.4rem;
    }
    @media (min-width: 760px) {
        .dg-tiers { grid-template-columns: 1fr 1fr; gap: 1.8rem; }
    }
    .dg-tier__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .dg-tier__name {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 500;
        font-size: 1.6rem;
        margin: 0;
        color: var(--almanac-ink);
    }
    .dg-tier__name em { font-style: italic; }
    :global(.dg-tier--pro) .dg-tier__name { color: var(--almanac-paper); }
    .dg-tier__price {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 30, 'wght' 380;
        font-size: 1.3rem;
        margin: 0;
        font-feature-settings: 'tnum';
        color: var(--almanac-ink);
    }
    .dg-tier__price span {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: var(--almanac-ink-3);
        letter-spacing: 0.06em;
        margin-left: 0.3rem;
    }
    :global(.dg-tier--pro) .dg-tier__price { color: var(--almanac-paper); }
    :global(.dg-tier--pro) .dg-tier__price span { color: var(--almanac-gold); }
    .dg-tier__lead {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-size: 0.95rem;
        margin: 0 0 0.6rem;
        color: var(--almanac-paper);
        opacity: 0.9;
    }
    .dg-tier__list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .dg-tier__list li {
        position: relative;
        padding: 0.6rem 0 0.6rem 1.4rem;
        font-family: 'Newsreader', serif;
        font-size: 0.95rem;
        line-height: 1.45;
        border-bottom: 1px dashed var(--almanac-rule-soft);
        color: var(--almanac-ink-2);
    }
    .dg-tier__list li:last-child { border-bottom: none; }
    .dg-tier__list li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 1rem;
        width: 0.55rem;
        height: 0.55rem;
        background: var(--almanac-oxblood);
    }
    .dg-tier__list li strong {
        color: var(--almanac-ink);
        font-weight: 600;
    }
    .dg-tier__list--inv li {
        color: var(--almanac-paper);
        opacity: 0.85;
        border-bottom-color: rgba(0, 0, 0, 0.25);
    }
    .dg-tier__list--inv li::before {
        background: var(--almanac-gold);
    }
    .dg-tier__list--inv li strong {
        color: var(--almanac-paper);
        opacity: 1;
    }

    /* ---------- FAQ ---------- */
    .dg-faq { max-width: 56rem; }
    .dg-faq__sub {
        max-width: 38rem;
    }
    :global(.dg-faq__list) { width: 100%; }
    :global(.dg-faq__list > div) {
        border-top: 1px solid var(--almanac-ink);
        border-bottom: none;
        padding: 0.4rem 0;
    }
    :global(.dg-faq__list > div:last-child) {
        border-bottom: 1px solid var(--almanac-ink);
    }
    :global(.dg-faq__list button) {
        font-family: 'Fraunces', serif !important;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 460 !important;
        font-style: italic !important;
        font-size: clamp(1.1rem, 1.8vw, 1.35rem) !important;
        color: var(--almanac-ink) !important;
        padding: 1.2rem 0.5rem 1.2rem 0 !important;
        text-align: left !important;
        gap: 0.6rem !important;
    }
    :global(.dg-faq__list [data-state="open"] button) {
        color: var(--almanac-oxblood) !important;
    }
    :global(.dg-faq__list p) {
        font-family: 'Newsreader', serif;
        font-size: 0.98rem;
        line-height: 1.65;
        color: var(--almanac-ink-2);
        max-width: 44rem;
        padding: 0.2rem 0 1.2rem;
        margin: 0;
    }
    .dg-faq__head {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex: 1;
    }
    :global(.dg-faq__num) {
        flex-shrink: 0;
        min-width: 2.2rem;
    }

    /* ---------- Final CTA — inverted plate ---------- */
    .dg-final {
        background: var(--almanac-ink);
        color: var(--almanac-paper);
        padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 3rem);
        text-align: center;
        position: relative;
        overflow: hidden;
        border-top: 1px solid var(--almanac-ink);
        border-bottom: 1px solid var(--almanac-ink);
    }
    .dg-final > div { position: relative; max-width: 36rem; margin: 0 auto; }
    :global(.dg-final__eyebrow) { margin: 0 0 1.4rem; }
    .dg-final__h {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 380;
        font-size: clamp(2.4rem, 5vw, 4rem);
        line-height: 1.05;
        letter-spacing: -0.02em;
        margin: 0 0 1.2rem;
        color: var(--almanac-paper);
    }
    .dg-final__h em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 360;
        color: var(--almanac-gold);
    }
    .dg-final__lead {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 1rem;
        line-height: 1.6;
        margin: 0 0 1.8rem;
        color: var(--almanac-paper);
        opacity: 0.85;
    }
    .dg-final__lead em {
        color: var(--almanac-gold);
        font-style: italic;
    }
    /* Override almanac-ghost for the dark spotlight context — needs cream stroke */
    :global(.dg-final__cta) {
        border-color: var(--almanac-paper) !important;
        color: var(--almanac-paper) !important;
    }
    :global(.dg-final__cta:hover) {
        background: var(--almanac-paper) !important;
        color: var(--almanac-ink) !important;
    }

    /* ---------- Footer ---------- */
    .dg-footer {
        max-width: 86rem;
        margin: 0 auto;
        padding: 1rem clamp(1.25rem, 4vw, 4rem) 2.5rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        color: var(--almanac-ink-3);
        letter-spacing: 0.04em;
    }
    .dg-footer__inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
    }
    .dg-footer__brand {
        display: flex;
        align-items: baseline;
        gap: 1rem;
    }
    .dg-footer__mark {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 460;
        font-size: 1.1rem;
        color: var(--almanac-oxblood);
        letter-spacing: -0.012em;
    }
    .dg-footer__year {
        text-transform: uppercase;
    }
    .dg-footer nav {
        display: flex;
        gap: 1.6rem;
    }
    .dg-footer a {
        color: var(--almanac-ink-2);
        text-decoration: none;
    }
    .dg-footer a:hover { color: var(--almanac-oxblood); }
</style>
