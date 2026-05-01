<script lang="ts">
    import ComparisonPage from "$lib/components/marketing/ComparisonPage.svelte";

    const whenTheyWin = [
        {
            title: "“Assign every dollar” is the ritual you want",
            what: "If the prescriptive envelope-budgeting practice is the value — moving money between categories, refusing to overspend, the discipline of zero-based budgeting — YNAB was built for that. We were not.",
        },
        {
            title: "Strict envelopes with overspending blocks",
            what: "YNAB enforces the plan. If you want the app to refuse the transaction, or to make you reassign before you spend, that's their philosophy. Funds in DuitGee don't block.",
        },
        {
            title: "Decades of method, community, books",
            what: "YNAB has the rule-of-four method, the workshops, the books. If you've already learned the YNAB way and it works for you, the lock-in is real value, not a cost.",
        },
        {
            title: "Bank sync as a first-class input",
            what: "YNAB pulls transactions from your bank automatically. We don't — we offer manual entry, AI receipt scan, CSV import, and the unidentified workflow as the structural alternative.",
        },
    ];

    const whereWeWin = [
        {
            title: "Funds describe reality, they don't enforce a plan",
            what: "A fund is a wallet — the household debit card, the trip kitty, the kid's allowance. It tracks what's left, not what should be. No moralising, no overspending blocks.",
        },
        {
            title: "Built for couples and families from the ground up",
            what: "Vaults with proper RBAC. Member breakdowns. Vault-wide notifications. The unidentified-expense workflow for shared cards. YNAB has multi-user, but it's bolted on, not designed-in.",
        },
        {
            title: "AI receipt scan & period insights",
            what: "Snap a photo of a receipt; get a structured expense back. End of month, get an editorial recap of where the money went — grounded against your actual numbers.",
        },
        {
            title: "Free tier is genuinely usable",
            what: "Unlimited expenses, unlimited members, the unidentified workflow, statistics, attachments, full CSV export — free forever. YNAB is paid-only.",
        },
        {
            title: "Statistics built for the long view",
            what: "Server-side aggregations across trend, category, member, payment-type, fund. Calendar view. Period comparison. Designed to read like an editorial volume of your money.",
        },
        {
            title: "No prescriptive philosophy required",
            what: "DuitGee doesn't ask you to learn a method. Open it, log expenses, watch the patterns. The two ideas are reduce friction with the people you share money with, and spot gaps.",
        },
    ];

    const tableRows = [
        { dim: "Philosophy", them: "Assign every dollar (prescriptive)", us: "Track what happened (descriptive)", takeaway: "split" as const },
        { dim: "Overspending behaviour", them: "Blocks / forces reassignment", us: "Records and shows the gap", takeaway: "split" as const },
        { dim: "Multi-user / household", them: "Bolted-on multi-device", us: "Vaults with RBAC, designed-in", takeaway: "us" as const },
        { dim: "Mystery charges from shared cards", them: "Not solved", us: "Unidentified-expense workflow", takeaway: "us" as const },
        { dim: "Bank sync", them: "First-class, automatic", us: "Manual / AI scan / CSV / unidentified", takeaway: "them" as const },
        { dim: "AI receipt scan", them: "Not modelled", us: "Pro tier — photos & PDFs", takeaway: "us" as const },
        { dim: "Period insights / anomalies", them: "Manual reports", us: "AI summary, grounded", takeaway: "us" as const },
        { dim: "Free tier", them: "None — paid only", us: "Free forever, fully usable", takeaway: "us" as const },
        { dim: "Method / learning curve", them: "Steep — the YNAB way", us: "Low — open and log", takeaway: "us" as const },
    ];
</script>

<svelte:head>
    <title>DuitGee vs. YNAB — DuitGee</title>
    <meta
        name="description"
        content="DuitGee is descriptive, not prescriptive. We don't ask you to assign every dollar. Funds are wallets, not envelopes — and the free tier is genuinely usable."
    />
</svelte:head>

<ComparisonPage
    rivalName="YNAB"
    rivalSlug="ynab"
    tagline="DuitGee describes. YNAB prescribes."
    intro="YNAB built a beloved practice around “assign every dollar” budgeting — envelopes you have to fund before you spend, overspending blocks, the rule-of-four. DuitGee takes the opposite stance: funds are descriptive wallets that record reality, not prescriptive envelopes that enforce a plan. If the YNAB ritual is the value, please use it. If you'd rather see what happened than be told what should, read on."
    {whenTheyWin}
    {whereWeWin}
    {tableRows}
    bottomLine="Use YNAB if you want a budgeting method enforced by the app. Use DuitGee if you want a household chronicle that surfaces the patterns without making you do the ritual."
/>
