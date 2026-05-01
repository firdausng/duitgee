<script lang="ts">
    import ComparisonPage from "$lib/components/marketing/ComparisonPage.svelte";

    const whenTheyWin = [
        {
            title: "Per-expense splits with weights",
            what: "60/40, by income, by share, by anything. Splitwise was built around uneven splits — that's its core. We assume an even pool.",
        },
        {
            title: "The IOU ledger and settle-up flow",
            what: "Net balances, “Alex owes Sara $24.30,” and one-tap settle. Splitwise tracks who-owes-whom across time. We don't.",
        },
        {
            title: "Trips with people you don't share life with",
            what: "Friend trips, group dinners, work offsite — relationships where you do need an explicit ledger. Splitwise is the right shape there.",
        },
        {
            title: "Cross-currency expense splitting",
            what: "Splitwise handles per-expense currency conversion in trips. DuitGee keeps currency at the vault level — no per-expense FX.",
        },
    ];

    const whereWeWin = [
        {
            title: "The household pool, not the IOU",
            what: "Couples and families don't usually want a running tab against each other. They want one shared ledger, with periodic visibility into who paid for what.",
        },
        {
            title: "The unidentified-expense workflow",
            what: "When the bank notification arrives before the spender — Splitwise has no answer. We built the placeholder-then-claim flow specifically for shared cards.",
        },
        {
            title: "Funds — descriptive wallets",
            what: "Real wallets with cycle ledgers, scheduled top-ups, optional carry-over. Splitwise is per-expense; we model the actual pots a household runs.",
        },
        {
            title: "AI receipt scan & period insights",
            what: "Snap a photo, get a structured expense. End of month, get an editorial recap of where the money went — grounded in your real numbers.",
        },
        {
            title: "Server-side statistics that scale",
            what: "Trend, category, member, payment-type, fund breakdowns — all server-aggregated. Built for vaults with thousands of rows and multi-year history.",
        },
        {
            title: "Free tier covers daily life",
            what: "Unlimited expenses, unlimited members, the full unidentified workflow, CSV export — all free, forever. Splitwise gates duplicate detection and recurring on Pro.",
        },
    ];

    const tableRows = [
        { dim: "Mental model", them: "Per-expense IOU ledger", us: "Shared household pool", takeaway: "split" as const },
        { dim: "Splits", them: "Per-expense, weighted, custom", us: "Even split assumed; one paidBy per expense", takeaway: "them" as const },
        { dim: "Settle-up", them: "Net balances, one-tap settle", us: "No settle-up — designed for trusted households", takeaway: "them" as const },
        { dim: "Mystery charges from shared cards", them: "Not solved", us: "Unidentified-expense workflow, ±1 day, any payer", takeaway: "us" as const },
        { dim: "Funds / wallets", them: "Not modelled", us: "Descriptive wallets with cycles + carry-over", takeaway: "us" as const },
        { dim: "AI receipt scan", them: "Pro tier", us: "Pro tier — works on photos & PDFs", takeaway: "split" as const },
        { dim: "Period insights / anomalies", them: "Not modelled", us: "AI summary, grounded in your numbers", takeaway: "us" as const },
        { dim: "CSV export", them: "Pro tier", us: "Free, no row limit, every plan", takeaway: "us" as const },
        { dim: "Multi-currency", them: "Per-expense FX", us: "Per-vault — vault per currency", takeaway: "them" as const },
    ];
</script>

<svelte:head>
    <title>DuitGee vs. Splitwise — DuitGee</title>
    <meta
        name="description"
        content="An honest comparison of DuitGee and Splitwise. Splitwise is excellent at IOUs and settle-up. DuitGee is the household pool — vaults, the unidentified workflow, funds, and AI insights."
    />
</svelte:head>

<ComparisonPage
    rivalName="Splitwise"
    rivalSlug="splitwise"
    tagline="DuitGee is the household pool. Splitwise is the IOU ledger."
    intro="Splitwise made its name on per-expense splits, settle-up flows, and tracking who-owes-whom across trips and roommates. DuitGee was built for the household where you and your partner share money, share cards, and don't run a running tab against each other. They serve adjacent problems — and we're not trying to replace each other."
    {whenTheyWin}
    {whereWeWin}
    {tableRows}
    bottomLine="Use Splitwise if you need IOU maths. Use DuitGee if your household has a shared pool, shared cards, and the loops you want to remove are 'did you log it?' and 'wait, what was that charge?'"
/>
