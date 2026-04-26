<script lang="ts">
    import { onMount } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import {
        Accordion,
        AccordionItem,
        AccordionTrigger,
        AccordionContent,
    } from "$lib/components/ui/accordion";

    // Reveal-on-scroll: progressive enhancement. Content is visible by default
    // (SSR / no-JS friendly); when JS runs we hide elements briefly via .js-reveal
    // and the IntersectionObserver re-shows them as they enter the viewport.
    function reveal(node: HTMLElement) {
        node.classList.add("js-reveal");
        const targets = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]"));

        // Above-the-fold elements should be in their final state immediately.
        // Mark them in-view synchronously so they don't flash.
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
</script>

<svelte:head>
    <title>DuitGee — collaborative expense tracking that spots the gaps</title>
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
                <p class="dg-eyebrow" data-reveal>Designed for families &middot; works solo</p>
                <h1 class="dg-display" data-reveal style="--rd: 80ms">
                    Less friction.<br />
                    <em>Fewer</em> blind spots.
                </h1>
                <p class="dg-lead" data-reveal style="--rd: 160ms">
                    A collaborative expense tracker that cuts the
                    &ldquo;did you log it?&rdquo; loop with your partner and
                    surfaces the patterns you&rsquo;d otherwise miss &mdash;
                    creeping installments, weekend-outing inflation, the
                    subscription you forgot about.
                </p>
                <div class="dg-cta-row" data-reveal style="--rd: 240ms">
                    <a href="/register">
                        <Button size="lg" class="dg-cta">Start free &rarr;</Button>
                    </a>
                    <a href="/login" class="dg-link">I already have an account</a>
                </div>
                <p class="dg-trust" data-reveal style="--rd: 320ms">
                    Your data, your CSV &mdash; export it anytime. Free tier never expires.
                </p>
            </div>

            <!-- Hand-coded product mockup, not a stock floating card -->
            <div class="dg-mock-wrap" data-reveal style="--rd: 200ms">
                <div class="dg-mock dg-mock--vault">
                    <header class="dg-mock__head">
                        <div>
                            <p class="dg-mock__eyebrow">Vault</p>
                            <p class="dg-mock__title">Our Home</p>
                        </div>
                        <span class="dg-mock__chip">2 members</span>
                    </header>

                    <div class="dg-mock__amount">
                        <p class="dg-mock__label">This month</p>
                        <p class="dg-mock__bignum">
                            <span class="dg-mock__cur">$</span>1,847<span class="dg-mock__dec">.20</span>
                        </p>
                        <svg viewBox="0 0 200 32" class="dg-mock__spark" aria-hidden="true">
                            <path
                                d="M0,22 L20,18 L40,24 L60,12 L80,16 L100,8 L120,14 L140,6 L160,11 L180,4 L200,9"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>

                    <div class="dg-mock__row dg-mock__row--alert">
                        <div class="dg-mock__icon">?</div>
                        <div class="dg-mock__rowbody">
                            <p class="dg-mock__rowtitle">Unidentified &middot; $24.50</p>
                            <p class="dg-mock__rowmeta">Logged by Sara &middot; yesterday</p>
                        </div>
                        <button class="dg-mock__action">Claim</button>
                    </div>

                    <div class="dg-mock__row">
                        <div class="dg-mock__icon dg-mock__icon--fund">G</div>
                        <div class="dg-mock__rowbody">
                            <p class="dg-mock__rowtitle">Groceries</p>
                            <p class="dg-mock__rowmeta">$240 / $600 &middot; tops up 1st</p>
                            <div class="dg-mock__bar"><span style="width:40%"></span></div>
                        </div>
                    </div>

                    <div class="dg-mock__row">
                        <div class="dg-mock__icon dg-mock__icon--soon">↻</div>
                        <div class="dg-mock__rowbody">
                            <p class="dg-mock__rowtitle">Internet bill &middot; $59</p>
                            <p class="dg-mock__rowmeta">In 3 days &middot; auto-generated</p>
                        </div>
                    </div>
                </div>

                <!-- Decorative wash, NOT a floating blob -->
                <div class="dg-mock__wash" aria-hidden="true"></div>
            </div>
        </div>
    </section>

    <!-- ============ EDITORIAL PULL-QUOTE ============ -->
    <section class="dg-quote">
        <p data-reveal>
            <span class="dg-quote__mark">&ldquo;</span>
            Reduce the friction with your partner.<br />
            See the gaps in your spending.
        </p>
        <p class="dg-quote__attr" data-reveal style="--rd: 100ms">
            &mdash; the two ideas behind every feature
        </p>
    </section>

    <!-- ============ DIFFERENTIATOR: UNIDENTIFIED ============ -->
    <section class="dg-section">
        <div class="dg-chap">
            <span class="dg-chap__num">01</span>
            <span class="dg-chap__name">The mystery-charge problem</span>
        </div>

        <div class="dg-strip">
            <div class="dg-strip__intro">
                <h2 class="dg-h2" data-reveal>
                    Your partner spent. The bank knows. You don&rsquo;t.
                    <em>Now what?</em>
                </h2>
                <p class="dg-body" data-reveal style="--rd: 80ms">
                    Every shared card has this awkward dance. Most apps make you
                    pick: guess the details, or wait. We added a third option that
                    <em>nobody else has</em> &mdash; log the charge as a
                    placeholder now, fill in the details when the spender shows
                    up.
                </p>
            </div>

            <ol class="dg-frames">
                <li data-reveal>
                    <p class="dg-frame__caption">Sara&rsquo;s phone, 8:42 pm</p>
                    <div class="dg-frame dg-frame--phone">
                        <p class="dg-frame__app">Banking app</p>
                        <p class="dg-frame__title">$24.50 charged</p>
                        <p class="dg-frame__sub">at the local cafe</p>
                    </div>
                </li>
                <li data-reveal style="--rd: 120ms">
                    <p class="dg-frame__caption">Two taps in DuitGee</p>
                    <div class="dg-frame dg-frame--quick">
                        <p class="dg-frame__quick-label">Quick log &middot; unidentified</p>
                        <p class="dg-frame__quick-amt">$24.50</p>
                        <p class="dg-frame__quick-meta">Paid by Alex &middot; today</p>
                        <button class="dg-frame__quick-cta">Log placeholder</button>
                    </div>
                </li>
                <li data-reveal style="--rd: 240ms">
                    <p class="dg-frame__caption">Alex sees this when he opens the app</p>
                    <div class="dg-frame dg-frame--claim">
                        <p class="dg-frame__app">Notification</p>
                        <p class="dg-frame__title">Sara logged $24.50</p>
                        <p class="dg-frame__sub">
                            Looks like the cafe last night. Claim &amp; add
                            the details?
                        </p>
                        <div class="dg-frame__claim-row">
                            <span class="dg-frame__pill dg-frame__pill--alt">Skip</span>
                            <span class="dg-frame__pill">Claim</span>
                        </div>
                    </div>
                </li>
            </ol>

            <p class="dg-aside" data-reveal>
                The match runs <span>&plusmn;1 day, any payer</span> &mdash;
                shared cards don&rsquo;t care whose name is on the bank
                notification. And it never auto-merges. Magical when right,
                painful when wrong.
            </p>
        </div>
    </section>

    <!-- ============ THREE PILLARS ============ -->
    <section class="dg-section dg-section--cream">
        <div class="dg-chap">
            <span class="dg-chap__num">02</span>
            <span class="dg-chap__name">What it does, plainly</span>
        </div>

        <div class="dg-pillars">
            <article class="dg-pillar" data-reveal>
                <p class="dg-pillar__num">i.</p>
                <h3 class="dg-h3">Less &ldquo;did you log it?&rdquo;<br />Less &ldquo;wait, what was that?&rdquo;</h3>
                <p class="dg-body">
                    Vaults with proper roles. Member breakdowns of who paid
                    what. The mystery-charge workflow so neither of you
                    plays detective. Notifications that fan out only when
                    the household actually needs to see them.
                </p>
                <div class="dg-mini-mock dg-mini-mock--members">
                    <div class="dg-avatars">
                        <span style="background:#E8B45C">S</span>
                        <span style="background:#1B4D3E;color:#FAF7F0">A</span>
                    </div>
                    <p>Sara paid $720 &middot; Alex paid $510 this month</p>
                </div>
            </article>

            <article class="dg-pillar" data-reveal style="--rd: 100ms">
                <p class="dg-pillar__num">ii.</p>
                <h3 class="dg-h3">Skip the manual entry,<br />most of the time</h3>
                <p class="dg-body">
                    Snap a receipt &mdash; image or PDF &mdash; and the AI fills in the
                    amount, merchant, date, and category. Recurring rules can
                    queue an inbox you approve, or auto-generate when you trust
                    them. Bring history in by CSV.
                </p>
                <div class="dg-mini-mock dg-mini-mock--scan">
                    <div class="dg-mini-mock__row">
                        <span class="dg-mini-mock__dot"></span>
                        <p>Receipt scanned &middot; <strong>$58.20</strong> at the grocery store</p>
                    </div>
                    <div class="dg-mini-mock__row">
                        <span class="dg-mini-mock__dot dg-mini-mock__dot--alt"></span>
                        <p>Awaiting approval &middot; <strong>Streaming &middot; $9.99</strong></p>
                    </div>
                </div>
            </article>

            <article class="dg-pillar" data-reveal style="--rd: 200ms">
                <p class="dg-pillar__num">iii.</p>
                <h3 class="dg-h3">Spot the gaps<br />you&rsquo;d otherwise miss</h3>
                <p class="dg-body">
                    Trend, category, member, and payment-type breakdowns
                    surface the patterns &mdash; the installment that crept in,
                    the dining-out drift, the subscription you forgot you
                    paid for. The AI summary is grounded against your real
                    numbers; bullets it can&rsquo;t back up are dropped.
                </p>
                <div class="dg-mini-mock dg-mini-mock--insight">
                    <p class="dg-mini-mock__quote">
                        &ldquo;You have 8 active installments &mdash; up from
                        3 last quarter. Dining out is up 38%.&rdquo;
                    </p>
                    <p class="dg-mini-mock__attr">AI insight &middot; grounded in
                    your actual numbers</p>
                </div>
            </article>
        </div>
    </section>

    <!-- ============ FUNDS MOMENT ============ -->
    <section class="dg-section">
        <div class="dg-chap">
            <span class="dg-chap__num">03</span>
            <span class="dg-chap__name">Envelope wallets, done quietly</span>
        </div>

        <div class="dg-funds">
            <div class="dg-funds__copy">
                <h2 class="dg-h2" data-reveal>
                    Envelope budgeting that <em>tracks reality</em>,<br />
                    not a plan you have to maintain.
                </h2>
                <p class="dg-body" data-reveal style="--rd: 80ms">
                    Funds are real wallets &mdash; the household debit card, the
                    kid&rsquo;s allowance, the trip kitty. They top up on a
                    schedule (or when you say so), they carry over to other
                    funds at cycle close, and they record every transaction in
                    an immutable ledger.
                </p>
                <p class="dg-body" data-reveal style="--rd: 160ms">
                    No <em>&ldquo;assign every dollar&rdquo;</em> ritual. No
                    overspending blocks. Just a clear running picture of what
                    each pot has left.
                </p>
            </div>

            <div class="dg-funds__cards">
                <div class="dg-fund" data-reveal>
                    <div class="dg-fund__head">
                        <span class="dg-fund__icon" style="background:#1B4D3E;color:#FAF7F0">G</span>
                        <div>
                            <p class="dg-fund__name">Groceries</p>
                            <p class="dg-fund__meta">Tops up 1st &middot; fixed $600</p>
                        </div>
                    </div>
                    <p class="dg-fund__bal">
                        <span class="dg-fund__cur">$</span>240<span class="dg-fund__dec">.40</span>
                        <span class="dg-fund__of">/ 600</span>
                    </p>
                    <div class="dg-fund__bar"><span style="width:40%"></span></div>
                </div>

                <div class="dg-fund" data-reveal style="--rd: 100ms">
                    <div class="dg-fund__head">
                        <span class="dg-fund__icon" style="background:#E8B45C;color:#1A1614">F</span>
                        <div>
                            <p class="dg-fund__name">Fuel</p>
                            <p class="dg-fund__meta">Top to ceiling weekly &middot; $150</p>
                        </div>
                    </div>
                    <p class="dg-fund__bal">
                        <span class="dg-fund__cur">$</span>106<span class="dg-fund__dec">.00</span>
                        <span class="dg-fund__of">/ 150</span>
                    </p>
                    <div class="dg-fund__bar"><span style="width:71%;background:#C97B3F"></span></div>
                </div>

                <div class="dg-fund" data-reveal style="--rd: 200ms">
                    <div class="dg-fund__head">
                        <span class="dg-fund__icon" style="background:#C97B3F;color:#FAF7F0">D</span>
                        <div>
                            <p class="dg-fund__name">Date Night</p>
                            <p class="dg-fund__meta">Manual top-up &middot; cycle: monthly</p>
                        </div>
                    </div>
                    <p class="dg-fund__bal">
                        <span class="dg-fund__cur">$</span>120<span class="dg-fund__dec">.00</span>
                        <span class="dg-fund__of">/ &mdash;</span>
                    </p>
                    <p class="dg-fund__rollover">
                        Carries unused balance &rarr; <strong>Gifts fund</strong>
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- ============ PRICING ============ -->
    <section class="dg-section dg-section--cream">
        <div class="dg-chap">
            <span class="dg-chap__num">04</span>
            <span class="dg-chap__name">Pricing, without the games</span>
        </div>

        <div class="dg-pricing">
            <p class="dg-pricing__quote" data-reveal>
                <em>Free</em> is fully usable. <em>Pro</em> enhances.
            </p>
            <p class="dg-pricing__sub" data-reveal style="--rd: 80ms">
                We don&rsquo;t cripple the free tier to push upgrades. Free covers
                a real household&rsquo;s daily life. Pro is for scale, automation,
                and depth.
            </p>

            <div class="dg-tiers">
                <article class="dg-tier" data-reveal style="--rd: 120ms">
                    <header>
                        <p class="dg-tier__name">Free</p>
                        <p class="dg-tier__price">$0<span>/forever</span></p>
                    </header>
                    <ul>
                        <li>Unlimited expenses, unlimited members</li>
                        <li>1 active fund per vault</li>
                        <li>5 active recurring rules</li>
                        <li>Statistics for the last 12 months</li>
                        <li>Receipt attachments (up to 5 per expense)</li>
                        <li>Unidentified-expense workflow &mdash; the whole thing</li>
                        <li><strong>CSV export &mdash; your data, always</strong></li>
                    </ul>
                </article>

                <article class="dg-tier dg-tier--pro" data-reveal style="--rd: 200ms">
                    <header>
                        <p class="dg-tier__name">Pro</p>
                        <p class="dg-tier__price"><span>coming soon</span></p>
                    </header>
                    <p class="dg-tier__lead">Everything in Free, plus &mdash;</p>
                    <ul>
                        <li>Multiple funds per vault</li>
                        <li>Auto-replenishment (fixed or top-to-ceiling)</li>
                        <li>Unlimited recurring + auto-generation + custom intervals</li>
                        <li><strong>AI receipt scan</strong> (PDFs &amp; photos)</li>
                        <li><strong>AI period insights</strong>, grounded in your data</li>
                        <li>Advanced breakdowns, custom range, chart export</li>
                        <li>CSV import, fund transfers, cross-fund reimbursements</li>
                    </ul>
                </article>
            </div>
        </div>
    </section>

    <!-- ============ FAQ ============ -->
    <section class="dg-section">
        <div class="dg-chap">
            <span class="dg-chap__num">05</span>
            <span class="dg-chap__name">Things to know before you sign up</span>
        </div>

        <div class="dg-faq">
            <h2 class="dg-h2" data-reveal>
                We&rsquo;d rather you bounce now than later.
            </h2>
            <p class="dg-body dg-faq__sub" data-reveal style="--rd: 80ms">
                Here&rsquo;s what DuitGee <em>doesn&rsquo;t</em> do, in case you
                were expecting it. Knowing this in advance saves you a download.
            </p>

            <Accordion type="single" class="dg-faq__list">
                <AccordionItem value="splitwise">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q1</span>
                        Is this Splitwise?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            No. DuitGee tracks the household&rsquo;s shared
                            spending pool. We don&rsquo;t do per-expense splits
                            (60/40, by income, by share) and there&rsquo;s no
                            IOU settle-up flow. If you specifically need
                            who-owes-whom maths, Splitwise stays excellent at
                            that &mdash; we&rsquo;re complementary, not a
                            replacement.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="solo">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q2</span>
                        Can I use it on my own?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes. The collaboration features (shared vaults,
                            member breakdowns, the mystery-charge workflow)
                            are designed-in, but every one of them works just
                            as well solo &mdash; your &ldquo;partner&rdquo;
                            just becomes future-you, the version trying to
                            remember what that charge was last Tuesday.
                            Funds, recurring rules, statistics, and AI
                            insights all stand on their own.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ynab">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q3</span>
                        Is this YNAB?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Also no. Funds are descriptive wallets, not a budget
                            you have to assign every dollar to. We don&rsquo;t
                            block overspending or force you to move money
                            between categories. We track reality; we don&rsquo;t
                            enforce a plan.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bank">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q4</span>
                        Does it connect to my bank?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Not today. The data-in paths are manual entry, the
                            AI receipt scanner, and CSV import. The
                            Unidentified Expense workflow exists precisely
                            because bank notifications usually arrive before
                            anyone has time to log the spend &mdash; we leaned
                            into that reality instead of fighting it.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="currency">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q5</span>
                        Can I track multiple currencies?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Each vault is one currency &mdash; pick from 30+ at
                            creation. There&rsquo;s no per-expense currency or
                            FX. If you need two currencies, create two
                            vaults. Frequent travelers may find this
                            limiting; we&rsquo;d rather be honest about the
                            scope than pretend to handle FX correctly.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q6</span>
                        Can I get my data out if I leave?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes. CSV export is free, on every plan, with no row
                            limit. We treat data portability as a baseline
                            trust signal &mdash; you should never feel locked
                            in.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mobile">
                    <AccordionTrigger>
                        <span class="dg-faq__head">
                            <span class="dg-faq__num">Q7</span>
                        Is there a mobile app?
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Mobile-friendly web today, native apps planned
                            soon. The whole UI is designed phone-first
                            because that&rsquo;s where the actual spending
                            gets logged &mdash; the wrapper around it is the
                            next step.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </section>

    <!-- ============ FINAL CTA ============ -->
    <section class="dg-final">
        <div data-reveal>
            <p class="dg-final__eyebrow">Ready when you are</p>
            <h2 class="dg-final__h">
                Start free.<br />
                <em>Keep your data forever.</em>
            </h2>
            <a href="/register">
                <Button size="lg" class="dg-cta dg-cta--invert">
                    Create your first vault &rarr;
                </Button>
            </a>
            <p class="dg-final__small">
                No credit card. No 14-day clock. Pro can wait until you need it.
            </p>
        </div>
    </section>

    <!-- ============ FOOTER ============ -->
    <footer class="dg-footer">
        <div>
            <img src="/favicon.svg" alt="" class="dg-footer__mark" />
            <span>DuitGee &middot; &copy; {new Date().getFullYear()}</span>
        </div>
        <nav>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/login">Sign in</a>
        </nav>
    </footer>
</div>

<style>
    /* ===========================================================
       Scoped landing-page styles. The wider app keeps its tokens.
       =========================================================== */

    .dg-landing {
        --paper:        oklch(0.972 0.012 75);   /* warm bone */
        --paper-2:      oklch(0.945 0.018 70);   /* cream tint */
        --ink:          oklch(0.21  0.02  50);   /* warm charcoal */
        --ink-2:        oklch(0.42  0.018 55);   /* secondary text */
        --ink-3:        oklch(0.62  0.014 60);   /* hairline copy */
        --rule:         oklch(0.88  0.012 70);   /* hairline */
        --rule-2:       oklch(0.80  0.014 70);
        --teal:         oklch(0.36  0.05  175);  /* deep peacock */
        --teal-soft:    oklch(0.92  0.03  175);
        --clay:         oklch(0.62  0.13  45);   /* burnt clay */
        --gold:         oklch(0.78  0.13  82);   /* warm amber */

        /* Surface tokens — elevated card backgrounds (lifted above paper) */
        --surface:      oklch(1 0 0);
        --surface-2:    oklch(0.95 0.01 70);
        --surface-3:    oklch(0.99 0 0);
        --surface-warm: oklch(0.97 0.05 80);

        /* Spotlight tokens — deep contrast section (.dg-final, .dg-tier--pro).
           Stay dark in both modes so the section reads as a spotlight. */
        --spotlight:        oklch(0.21 0.02 50);
        --spotlight-fg:     oklch(0.972 0.012 75);
        --spotlight-fg-2:   oklch(0.85 0.012 60);
        --spotlight-rule:   oklch(0.40 0.02 50);
        --spotlight-rule-2: oklch(0.30 0.02 50);
        --spotlight-meta:   oklch(0.65 0.012 60);

        --shadow-sm:    0 1px 2px oklch(0.20 0.02 50 / 0.05),
                        0 2px 6px oklch(0.20 0.02 50 / 0.04);
        --shadow-md:    0 4px 14px oklch(0.20 0.02 50 / 0.07),
                        0 12px 30px oklch(0.20 0.02 50 / 0.06);
        --shadow-lg:    0 8px 24px oklch(0.20 0.02 50 / 0.08),
                        0 24px 60px oklch(0.20 0.02 50 / 0.10);

        background: var(--paper);
        color: var(--ink);
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-feature-settings: 'ss01', 'cv01';
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
    }

    /* Dark mode — overrides the warm-bone palette with a deep espresso scheme.
       Surface/spotlight tokens shift so cards stay lifted above the page bg
       and the spotlight section stays visually deeper than the surrounding page. */
    :global(.dark) .dg-landing {
        --paper:        oklch(0.16  0.012 60);
        --paper-2:      oklch(0.20  0.018 55);
        --ink:          oklch(0.94  0.012 75);
        --ink-2:        oklch(0.76  0.014 70);
        --ink-3:        oklch(0.55  0.014 65);
        --rule:         oklch(0.28  0.014 55);
        --rule-2:       oklch(0.36  0.014 55);
        --teal:         oklch(0.74  0.09  175);
        --teal-soft:    oklch(0.30  0.04  175);
        --clay:         oklch(0.74  0.12  45);
        --gold:         oklch(0.78  0.13  82);

        --surface:      oklch(0.22 0.018 55);
        --surface-2:    oklch(0.25 0.018 55);
        --surface-3:    oklch(0.21 0.014 55);
        --surface-warm: oklch(0.26 0.04  70);

        --spotlight:        oklch(0.10 0.012 55);
        --spotlight-fg:     oklch(0.94 0.012 75);
        --spotlight-fg-2:   oklch(0.78 0.014 70);
        --spotlight-rule:   oklch(0.22 0.014 55);
        --spotlight-rule-2: oklch(0.18 0.014 55);
        --spotlight-meta:   oklch(0.55 0.014 65);

        --shadow-sm:    0 1px 2px oklch(0 0 0 / 0.45),
                        0 2px 6px oklch(0 0 0 / 0.35);
        --shadow-md:    0 4px 14px oklch(0 0 0 / 0.50),
                        0 12px 30px oklch(0 0 0 / 0.40);
        --shadow-lg:    0 8px 24px oklch(0 0 0 / 0.55),
                        0 24px 60px oklch(0 0 0 / 0.45);
    }

    /* tasteful subtle paper texture */
    .dg-landing::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background:
            radial-gradient(1px 1px at 20% 30%, oklch(0.70 0.04 70 / 0.05), transparent 50%),
            radial-gradient(1px 1px at 70% 80%, oklch(0.70 0.04 70 / 0.05), transparent 50%),
            radial-gradient(1px 1px at 40% 60%, oklch(0.70 0.04 70 / 0.04), transparent 50%);
        background-size: 7px 7px, 11px 11px, 13px 13px;
        opacity: 0.6;
    }

    .dg-landing > * { position: relative; z-index: 1; }

    /* ---------- Reveal animation ----------
       Progressive enhancement: by default content is visible (SSR / no-JS).
       The JS action adds `.js-reveal` to the page wrapper which then hides
       elements until the observer adds `.is-in`. */
    .js-reveal [data-reveal] {
        opacity: 0;
        transform: translateY(14px);
        transition:
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms),
            transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) var(--rd, 0ms);
    }
    .js-reveal [data-reveal].is-in {
        opacity: 1;
        transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
        .js-reveal [data-reveal] { opacity: 1; transform: none; transition: none; }
    }

    /* ---------- Type system ---------- */
    .dg-display {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: clamp(2.6rem, 7vw, 5.5rem);
        line-height: 0.95;
        letter-spacing: -0.025em;
        color: var(--ink);
        margin: 0;
    }
    .dg-display em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--teal);
    }

    .dg-h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 380;
        font-size: clamp(1.7rem, 3.6vw, 2.7rem);
        line-height: 1.05;
        letter-spacing: -0.018em;
        margin: 0;
        color: var(--ink);
    }
    .dg-h2 em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 360;
        color: var(--teal);
    }

    .dg-h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 420;
        font-size: clamp(1.25rem, 2vw, 1.55rem);
        line-height: 1.15;
        letter-spacing: -0.012em;
        margin: 0 0 0.85rem 0;
        color: var(--ink);
    }

    .dg-eyebrow {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--ink-3);
        margin: 0 0 1.5rem 0;
    }

    .dg-lead {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 24, 'SOFT' 20, 'wght' 380;
        font-size: clamp(1.05rem, 1.4vw, 1.2rem);
        line-height: 1.5;
        color: var(--ink-2);
        margin: 1.4rem 0 0 0;
        max-width: 32rem;
    }

    .dg-body {
        font-size: 0.98rem;
        line-height: 1.65;
        color: var(--ink-2);
        margin: 0.85rem 0 0 0;
    }
    .dg-body em {
        font-family: 'Fraunces', Georgia, serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 60;
        color: var(--ink);
    }

    .dg-link {
        color: var(--ink-2);
        font-size: 0.95rem;
        text-decoration: none;
        border-bottom: 1px solid var(--rule-2);
        padding-bottom: 1px;
        transition: color 200ms, border-color 200ms;
    }
    .dg-link:hover {
        color: var(--teal);
        border-color: var(--teal);
    }

    /* ---------- CTA ---------- */
    :global(.dg-cta) {
        background: var(--ink) !important;
        color: var(--paper) !important;
        border: none !important;
        border-radius: 999px !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: -0.005em !important;
        padding: 0.95rem 1.6rem !important;
        height: auto !important;
        font-size: 1rem !important;
        box-shadow: var(--shadow-md);
        transition: transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1),
                    box-shadow 250ms !important;
    }
    :global(.dg-cta:hover) {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }
    :global(.dg-cta--invert) {
        background: var(--spotlight-fg) !important;
        color: var(--spotlight) !important;
    }

    .dg-cta-row {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-top: 2.2rem;
        flex-wrap: wrap;
    }

    .dg-trust {
        margin-top: 1.4rem;
        font-size: 0.85rem;
        color: var(--ink-3);
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: -0.01em;
    }

    /* ===========================================================
       HERO
       =========================================================== */
    .dg-hero {
        padding: clamp(3rem, 7vw, 6.5rem) clamp(1.25rem, 4vw, 4rem)
                 clamp(4rem, 8vw, 7rem);
        max-width: 86rem;
        margin: 0 auto;
    }
    .dg-hero__grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: clamp(3rem, 6vw, 5rem);
        align-items: center;
    }
    @media (min-width: 960px) {
        .dg-hero__grid { grid-template-columns: 1.05fr 0.95fr; }
    }

    /* ---------- Hero product mockup ---------- */
    .dg-mock-wrap {
        position: relative;
        max-width: 28rem;
        justify-self: center;
        width: 100%;
    }
    .dg-mock {
        position: relative;
        background: var(--surface);
        border: 1px solid var(--rule);
        border-radius: 1.25rem;
        padding: 1.4rem 1.4rem 1.5rem;
        box-shadow: var(--shadow-lg);
        z-index: 2;
    }
    .dg-mock__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.4rem;
    }
    .dg-mock__eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-3);
        margin: 0;
    }
    .dg-mock__title {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 24, 'SOFT' 30, 'wght' 500;
        font-size: 1.3rem;
        margin: 0.2rem 0 0;
        letter-spacing: -0.01em;
    }
    .dg-mock__chip {
        font-size: 0.72rem;
        font-weight: 500;
        background: var(--paper-2);
        color: var(--ink-2);
        padding: 0.3rem 0.65rem;
        border-radius: 999px;
        border: 1px solid var(--rule);
    }
    .dg-mock__amount {
        padding: 1rem 0 1.2rem;
        border-top: 1px solid var(--rule);
        border-bottom: 1px solid var(--rule);
        margin-bottom: 1.1rem;
        position: relative;
        color: var(--teal);
    }
    .dg-mock__label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.62rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-3);
        margin: 0 0 0.5rem 0;
    }
    .dg-mock__bignum {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 20, 'wght' 380;
        font-size: 2.6rem;
        line-height: 1;
        letter-spacing: -0.02em;
        color: var(--ink);
        margin: 0;
        font-feature-settings: 'tnum';
    }
    .dg-mock__cur {
        font-size: 1.05rem;
        font-weight: 500;
        color: var(--ink-2);
        margin-right: 0.35rem;
        font-family: 'JetBrains Mono', monospace;
        vertical-align: 0.6rem;
        letter-spacing: 0;
    }
    .dg-mock__dec {
        color: var(--ink-3);
        font-size: 1.4rem;
    }
    .dg-mock__spark {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-30%);
        width: 8rem;
        height: 1.8rem;
        opacity: 0.85;
    }

    .dg-mock__row {
        display: flex;
        gap: 0.85rem;
        align-items: center;
        padding: 0.65rem 0;
    }
    .dg-mock__row + .dg-mock__row {
        border-top: 1px dashed var(--rule);
    }
    .dg-mock__row--alert {
        background: var(--surface-warm);
        border-radius: 0.7rem;
        padding: 0.7rem 0.8rem;
        margin: 0 -0.4rem 0.5rem;
    }
    .dg-mock__icon {
        width: 2.1rem;
        height: 2.1rem;
        border-radius: 0.6rem;
        background: var(--gold);
        display: grid;
        place-items: center;
        font-family: 'Fraunces', serif;
        font-weight: 700;
        font-size: 1rem;
        color: var(--spotlight);
        flex-shrink: 0;
    }
    .dg-mock__icon--fund { background: var(--teal); color: var(--paper); }
    .dg-mock__icon--soon { background: var(--paper-2); color: var(--ink-2); border: 1px solid var(--rule); font-size: 0.95rem; }
    .dg-mock__rowbody { flex: 1; min-width: 0; }
    .dg-mock__rowtitle {
        font-size: 0.92rem;
        font-weight: 600;
        margin: 0;
        color: var(--ink);
        font-feature-settings: 'tnum';
    }
    .dg-mock__rowmeta {
        font-size: 0.78rem;
        color: var(--ink-3);
        margin: 0.15rem 0 0 0;
    }
    .dg-mock__action {
        background: var(--ink);
        color: var(--paper);
        border: none;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        cursor: pointer;
    }
    .dg-mock__bar {
        height: 4px;
        background: var(--paper-2);
        border-radius: 999px;
        margin-top: 0.5rem;
        overflow: hidden;
    }
    .dg-mock__bar > span {
        display: block;
        height: 100%;
        background: var(--teal);
        border-radius: 999px;
    }
    .dg-mock__wash {
        position: absolute;
        inset: -2.5rem -2.5rem -2.5rem -2.5rem;
        background:
            radial-gradient(60% 50% at 30% 30%, oklch(0.85 0.13 82 / 0.35), transparent 70%),
            radial-gradient(50% 50% at 70% 80%, oklch(0.55 0.10 175 / 0.25), transparent 70%);
        z-index: 0;
        filter: blur(40px);
    }

    /* ===========================================================
       PULL QUOTE
       =========================================================== */
    .dg-quote {
        text-align: center;
        padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 3rem);
        max-width: 60rem;
        margin: 0 auto;
        border-top: 1px solid var(--rule);
        border-bottom: 1px solid var(--rule);
    }
    .dg-quote p:first-child {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 320;
        font-style: italic;
        font-size: clamp(1.7rem, 3.4vw, 2.6rem);
        line-height: 1.2;
        color: var(--ink);
        margin: 0;
        position: relative;
        letter-spacing: -0.015em;
    }
    .dg-quote__mark {
        font-size: 1.5em;
        color: var(--teal);
        line-height: 0;
        vertical-align: -0.25em;
        margin-right: 0.05em;
    }
    .dg-quote__attr {
        margin-top: 1.3rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-3);
    }

    /* ===========================================================
       SECTIONS
       =========================================================== */
    .dg-section {
        padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 4rem);
        max-width: 86rem;
        margin: 0 auto;
    }
    .dg-section--cream {
        background: var(--paper-2);
        max-width: none;
        border-top: 1px solid var(--rule);
        border-bottom: 1px solid var(--rule);
    }
    .dg-section--cream > * { max-width: 86rem; margin-left: auto; margin-right: auto; }

    .dg-chap {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        margin-bottom: clamp(2rem, 4vw, 3rem);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--ink-3);
        padding-bottom: 0.85rem;
        border-bottom: 1px solid var(--rule);
    }
    .dg-chap__num { color: var(--teal); font-weight: 500; }

    /* ---------- Story strip ---------- */
    .dg-strip {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2.5rem;
    }
    @media (min-width: 960px) {
        .dg-strip__intro { max-width: 36rem; }
    }
    .dg-frames {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 1.4rem;
        grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
        .dg-frames { grid-template-columns: repeat(3, 1fr); gap: 1.8rem; }
    }
    .dg-frames li {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }
    .dg-frame__caption {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--ink-3);
        margin: 0;
    }
    .dg-frame {
        background: var(--surface);
        border: 1px solid var(--rule);
        border-radius: 1rem;
        padding: 1.3rem 1.2rem;
        box-shadow: var(--shadow-sm);
        min-height: 11rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
    }
    .dg-frame__app {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        color: var(--ink-3);
        letter-spacing: 0.14em;
        margin: 0 0 0.7rem;
    }
    .dg-frame__title {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 30, 'wght' 460;
        font-size: 1.35rem;
        margin: 0;
        letter-spacing: -0.01em;
        color: var(--ink);
    }
    .dg-frame__sub {
        font-size: 0.88rem;
        color: var(--ink-2);
        margin: 0.5rem 0 0;
        line-height: 1.4;
    }
    .dg-frame--phone { background: var(--surface-2); border-color: var(--rule-2); }
    .dg-frame--quick { background: var(--surface-3); border-style: dashed; }
    .dg-frame__quick-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--clay);
        margin: 0 0 0.4rem;
    }
    .dg-frame__quick-amt {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-size: 2rem;
        line-height: 1;
        margin: 0;
        color: var(--ink);
        font-feature-settings: 'tnum';
    }
    .dg-frame__quick-meta {
        font-size: 0.82rem;
        color: var(--ink-3);
        margin: 0.4rem 0 0.9rem;
    }
    .dg-frame__quick-cta {
        align-self: flex-start;
        background: var(--ink);
        color: var(--paper);
        border: none;
        font-size: 0.82rem;
        font-weight: 600;
        padding: 0.55rem 1rem;
        border-radius: 999px;
        cursor: pointer;
    }
    .dg-frame--claim { background: var(--surface-warm); }
    .dg-frame__claim-row {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.95rem;
    }
    .dg-frame__pill {
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        background: var(--ink);
        color: var(--paper);
    }
    .dg-frame__pill--alt {
        background: transparent;
        color: var(--ink-2);
        border: 1px solid var(--rule-2);
    }
    .dg-aside {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 60, 'wght' 380;
        font-size: 1rem;
        color: var(--ink-2);
        line-height: 1.6;
        margin: 0;
        padding-top: 1.2rem;
        border-top: 1px solid var(--rule);
        max-width: 48rem;
    }
    .dg-aside span {
        font-style: normal;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        color: var(--clay);
        background: var(--surface-warm);
        padding: 0.1rem 0.45rem;
        border-radius: 0.3rem;
    }

    /* ---------- Three pillars ---------- */
    .dg-pillars {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2.4rem;
    }
    @media (min-width: 880px) {
        .dg-pillars {
            grid-template-columns: repeat(3, 1fr);
            gap: 2.8rem;
        }
    }
    .dg-pillar { display: flex; flex-direction: column; }
    .dg-pillar__num {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 80, 'wght' 380;
        font-size: 1.05rem;
        color: var(--teal);
        margin: 0 0 0.85rem 0;
    }
    .dg-mini-mock {
        margin-top: 1.5rem;
        background: var(--surface);
        border: 1px solid var(--rule);
        border-radius: 0.85rem;
        padding: 1rem 1.1rem;
        box-shadow: var(--shadow-sm);
        font-size: 0.86rem;
    }
    .dg-mini-mock--members .dg-avatars {
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
        font-weight: 600;
        font-size: 0.85rem;
        margin-left: -0.4rem;
        border: 2px solid var(--surface);
        color: var(--ink);
    }
    .dg-avatars span:first-child { margin-left: 0; }
    .dg-mini-mock--members p {
        margin: 0;
        color: var(--ink-2);
        font-feature-settings: 'tnum';
    }
    .dg-mini-mock__row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.4rem 0;
    }
    .dg-mini-mock__row + .dg-mini-mock__row {
        border-top: 1px dashed var(--rule);
    }
    .dg-mini-mock__row p {
        margin: 0;
        color: var(--ink-2);
        font-feature-settings: 'tnum';
    }
    .dg-mini-mock__dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        background: var(--teal);
        flex-shrink: 0;
    }
    .dg-mini-mock__dot--alt { background: var(--gold); }
    .dg-mini-mock__quote {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 60, 'wght' 380;
        font-size: 0.95rem;
        color: var(--ink);
        line-height: 1.5;
        margin: 0;
    }
    .dg-mini-mock__attr {
        margin: 0.7rem 0 0 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: var(--ink-3);
        letter-spacing: 0.06em;
    }

    /* ---------- Funds section ---------- */
    .dg-funds {
        display: grid;
        grid-template-columns: 1fr;
        gap: 3rem;
        align-items: start;
    }
    @media (min-width: 960px) {
        .dg-funds { grid-template-columns: 1fr 1fr; gap: 4rem; }
    }
    .dg-funds__cards {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
    }
    .dg-fund {
        background: var(--surface);
        border: 1px solid var(--rule);
        border-radius: 1rem;
        padding: 1.2rem 1.3rem;
        box-shadow: var(--shadow-sm);
    }
    .dg-fund__head {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        margin-bottom: 0.9rem;
    }
    .dg-fund__icon {
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 0.6rem;
        display: grid;
        place-items: center;
        font-family: 'Fraunces', serif;
        font-weight: 700;
        font-size: 1.1rem;
    }
    .dg-fund__name {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 24, 'SOFT' 30, 'wght' 500;
        font-size: 1.05rem;
        margin: 0;
        color: var(--ink);
    }
    .dg-fund__meta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: var(--ink-3);
        margin: 0.15rem 0 0 0;
        letter-spacing: 0.04em;
    }
    .dg-fund__bal {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 20, 'wght' 380;
        font-size: 2rem;
        line-height: 1;
        margin: 0;
        color: var(--ink);
        font-feature-settings: 'tnum';
    }
    .dg-fund__cur {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--ink-2);
        margin-right: 0.3rem;
        vertical-align: 0.4rem;
    }
    .dg-fund__dec { color: var(--ink-3); font-size: 1.2rem; }
    .dg-fund__of { color: var(--ink-3); font-size: 0.9rem; margin-left: 0.4rem; font-family: 'JetBrains Mono', monospace; }
    .dg-fund__bar {
        height: 5px;
        background: var(--paper-2);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 0.85rem;
    }
    .dg-fund__bar > span {
        display: block;
        height: 100%;
        background: var(--teal);
    }
    .dg-fund__rollover {
        margin: 0.85rem 0 0 0;
        font-size: 0.8rem;
        color: var(--ink-3);
        padding-top: 0.85rem;
        border-top: 1px dashed var(--rule);
    }
    .dg-fund__rollover strong { color: var(--clay); font-weight: 600; }

    /* ---------- Pricing ---------- */
    .dg-pricing { text-align: left; }
    .dg-pricing__quote {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 60, 'wght' 360;
        font-size: clamp(1.8rem, 3.6vw, 2.8rem);
        line-height: 1.15;
        margin: 0;
        letter-spacing: -0.018em;
        color: var(--ink);
    }
    .dg-pricing__quote em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100;
        color: var(--teal);
    }
    .dg-pricing__sub {
        font-size: 1rem;
        color: var(--ink-2);
        margin: 1rem 0 2.5rem;
        max-width: 38rem;
        line-height: 1.6;
    }
    .dg-tiers {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.4rem;
    }
    @media (min-width: 760px) {
        .dg-tiers { grid-template-columns: 1fr 1fr; gap: 1.8rem; }
    }
    .dg-tier {
        background: var(--surface);
        border: 1px solid var(--rule);
        border-radius: 1.1rem;
        padding: 1.8rem;
        box-shadow: var(--shadow-sm);
    }
    .dg-tier--pro {
        background: var(--spotlight);
        color: var(--spotlight-fg);
        border-color: var(--spotlight);
    }
    .dg-tier header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 1.4rem;
        padding-bottom: 1.2rem;
        border-bottom: 1px solid var(--rule);
    }
    .dg-tier--pro header { border-bottom-color: var(--spotlight-rule); }
    .dg-tier__name {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 500;
        font-size: 1.5rem;
        margin: 0;
        letter-spacing: -0.01em;
    }
    .dg-tier__price {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 30, 'wght' 380;
        font-size: 1.3rem;
        margin: 0;
        font-feature-settings: 'tnum';
    }
    .dg-tier__price span {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: var(--ink-3);
        letter-spacing: 0.06em;
        margin-left: 0.3rem;
    }
    .dg-tier--pro .dg-tier__price span { color: var(--spotlight-meta); }
    .dg-tier__lead {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 60;
        font-size: 0.95rem;
        margin: 0 0 1rem 0;
        color: var(--spotlight-fg-2);
    }
    .dg-tier ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .dg-tier li {
        position: relative;
        padding: 0.55rem 0 0.55rem 1.5rem;
        font-size: 0.93rem;
        line-height: 1.45;
        color: inherit;
        border-bottom: 1px solid var(--rule);
    }
    .dg-tier--pro li { border-bottom-color: var(--spotlight-rule-2); }
    .dg-tier li:last-child { border-bottom: none; }
    .dg-tier li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.95rem;
        width: 0.65rem;
        height: 0.65rem;
        border-radius: 50%;
        background: var(--teal);
    }
    .dg-tier--pro li::before { background: var(--gold); }

    /* ---------- FAQ ---------- */
    .dg-faq { max-width: 52rem; }
    .dg-faq__sub { margin-bottom: 2.5rem; max-width: 38rem; }
    :global(.dg-faq__list) { width: 100%; }
    :global(.dg-faq__list > div) {
        border-top: 1px solid var(--rule);
        border-bottom: none;
        padding: 0.4rem 0;
    }
    :global(.dg-faq__list > div:last-child) {
        border-bottom: 1px solid var(--rule);
    }
    :global(.dg-faq__list button) {
        font-family: 'Fraunces', serif !important;
        font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 460 !important;
        font-size: clamp(1.1rem, 1.8vw, 1.35rem) !important;
        color: var(--ink) !important;
        padding: 1.4rem 0.5rem 1.4rem 0 !important;
        text-align: left !important;
        gap: 0.5rem !important;
    }
    :global(.dg-faq__list [data-state="open"] button) {
        color: var(--teal) !important;
    }
    :global(.dg-faq__list p) {
        font-size: 0.98rem;
        line-height: 1.65;
        color: var(--ink-2);
        max-width: 44rem;
        padding: 0.2rem 0 1.2rem;
        margin: 0;
    }
    .dg-faq__head {
        display: flex;
        align-items: baseline;
        gap: 1.2rem;
        flex: 1;
    }
    .dg-faq__num {
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 0.72rem !important;
        color: var(--teal);
        letter-spacing: 0.14em;
        font-weight: 500;
        font-variation-settings: normal !important;
        flex-shrink: 0;
        min-width: 1.8rem;
    }

    /* ---------- Final CTA ---------- */
    .dg-final {
        background: var(--spotlight);
        color: var(--spotlight-fg);
        padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 3rem);
        text-align: center;
        position: relative;
        overflow: hidden;
    }
    .dg-final::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
            radial-gradient(40% 50% at 20% 30%, oklch(0.55 0.10 175 / 0.18), transparent 70%),
            radial-gradient(40% 50% at 85% 75%, oklch(0.78 0.13 82 / 0.12), transparent 70%);
        pointer-events: none;
    }
    .dg-final > div { position: relative; max-width: 36rem; margin: 0 auto; }
    .dg-final__eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--spotlight-meta);
        margin: 0 0 1.5rem;
    }
    .dg-final__h {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 380;
        font-size: clamp(2.2rem, 5vw, 3.6rem);
        line-height: 1.05;
        letter-spacing: -0.02em;
        margin: 0 0 2.4rem;
        color: var(--spotlight-fg);
    }
    .dg-final__h em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 360;
        color: var(--gold);
    }
    .dg-final__small {
        margin-top: 1.6rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        color: var(--spotlight-meta);
    }

    /* ---------- Footer ---------- */
    .dg-footer {
        max-width: 86rem;
        margin: 0 auto;
        padding: 2.5rem clamp(1.25rem, 4vw, 4rem);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
        border-top: 1px solid var(--rule);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        color: var(--ink-3);
        letter-spacing: 0.04em;
    }
    .dg-footer > div {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }
    .dg-footer__mark { width: 1.1rem; height: 1.1rem; }
    .dg-footer nav {
        display: flex;
        gap: 1.6rem;
    }
    .dg-footer a {
        color: var(--ink-2);
        text-decoration: none;
    }
    .dg-footer a:hover { color: var(--teal); }
</style>
