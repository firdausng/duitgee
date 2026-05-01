<script lang="ts">
    import ComparisonPage from "$lib/components/marketing/ComparisonPage.svelte";

    const whenTheyWin = [
        {
            title: "Solo tracker with a polished mobile-first feel",
            what: "Money Lover has been refined as a personal-finance app for years. If you're tracking your own spending and the family case doesn't apply, it's a strong, native-feeling choice.",
        },
        {
            title: "Bank sync where it's available",
            what: "In some regions, Money Lover offers bank connections. We don't — we lean on manual, AI scan, CSV, and the unidentified workflow. If automatic transaction import is critical, it's worth weighing.",
        },
        {
            title: "Native iOS and Android apps today",
            what: "DuitGee is mobile-friendly web today, with native apps planned. If you specifically want a native app store presence right now, Money Lover delivers.",
        },
        {
            title: "Prescriptive budgets at the category level",
            what: "Money Lover supports YNAB-style category budgets with overspending alerts. Funds in DuitGee are descriptive wallets, not category envelopes.",
        },
    ];

    const whereWeWin = [
        {
            title: "Built for households, not just individuals",
            what: "Vaults with owner / admin / member roles. Member breakdowns. Vault-wide notifications. Money Lover's collaboration model is per-account sharing — vaults are designed-in.",
        },
        {
            title: "The unidentified-expense workflow",
            what: "When the bank notification beats the spender home — log a placeholder, claim later, never auto-merge. No other tracker has this exact loop, because it only matters when two people share a card.",
        },
        {
            title: "AI period insights that actually run on your numbers",
            what: "End-of-month editorial recap with anomaly detection (z-score against per-category baseline) and a hallucination guard. Bullets that can't be backed up are dropped before you see them.",
        },
        {
            title: "Funds that run on cycles, with carry-over",
            what: "A fund is a real wallet — top-ups on a schedule, immutable cycle ledger, optional carry-over to another fund at cycle close. Money Lover models budgets, not pots.",
        },
        {
            title: "Free tier without a row limit",
            what: "Unlimited expenses, unlimited members, full unidentified workflow, full CSV export — free forever. We treat data lock-in as adversarial.",
        },
        {
            title: "Editorial design — readable as an almanac",
            what: "DuitGee reads like a household chronicle, not a finance dashboard. If the spreadsheet aesthetic of most trackers feels cold, the visual difference is real.",
        },
    ];

    const tableRows = [
        { dim: "Primary audience", them: "Solo personal finance", us: "Households (works solo too)", takeaway: "split" as const },
        { dim: "Multi-user model", them: "Account sharing", us: "Vaults with RBAC", takeaway: "us" as const },
        { dim: "Mystery charges from shared cards", them: "Not solved", us: "Unidentified-expense workflow", takeaway: "us" as const },
        { dim: "AI receipt scan", them: "Available", us: "Pro tier — photos & PDFs", takeaway: "split" as const },
        { dim: "AI period insights / anomalies", them: "Limited", us: "Grounded against your numbers", takeaway: "us" as const },
        { dim: "Bank sync", them: "Available in some regions", us: "Not offered today", takeaway: "them" as const },
        { dim: "Native mobile apps", them: "Available", us: "Web today, native planned", takeaway: "them" as const },
        { dim: "Funds / wallets model", them: "Category budgets", us: "Descriptive wallets with cycles", takeaway: "us" as const },
        { dim: "CSV export", them: "Pro tier", us: "Free, no row limit", takeaway: "us" as const },
        { dim: "Free tier ceiling", them: "Limited (entry counts, ads)", us: "Unlimited core usage", takeaway: "us" as const },
    ];
</script>

<svelte:head>
    <title>DuitGee vs. Money Lover — DuitGee</title>
    <meta
        name="description"
        content="DuitGee is built for households first; Money Lover for individuals first. If you share money with someone, the unidentified-expense workflow alone is worth comparing."
    />
</svelte:head>

<ComparisonPage
    rivalName="Money Lover"
    rivalSlug="money-lover"
    tagline="DuitGee is household-first. Money Lover is individual-first."
    intro="Money Lover is a polished, long-standing solo personal-finance app — strong on bank sync where it's available, with native apps and a familiar category-budget model. DuitGee was designed for households first, with collaboration features (vaults, member breakdowns, the unidentified workflow) baked in rather than bolted on. If you're tracking your own money in a region with great bank sync, Money Lover is a fair bet. If you share money with a partner or family, read on."
    {whenTheyWin}
    {whereWeWin}
    {tableRows}
    bottomLine="Use Money Lover if you're solo and bank sync is critical. Use DuitGee if you share money with someone — the unidentified workflow alone changes how the household tracks shared cards."
/>
