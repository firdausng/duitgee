<script lang="ts">
    import ComparisonPage from "$lib/components/marketing/ComparisonPage.svelte";

    const whenTheyWin = [
        {
            title: "You want infinite flexibility",
            what: "A spreadsheet bends to any shape. Custom columns, custom formulas, pivot tables, conditional formatting — if your tracking system needs to do something nobody else's does, the spreadsheet wins on flexibility.",
        },
        {
            title: "You already have a setup that works",
            what: "If your shared sheet has been tuned for years, the switching cost is real. The spreadsheet you've already trained your household on is, in that moment, the right tool.",
        },
        {
            title: "Your tracking is occasional, not daily",
            what: "If you log six expenses a quarter and review them with an accountant once a year, a spreadsheet is the simpler stack. We're built for ongoing daily life, not annual reconciliation.",
        },
        {
            title: "You want zero new vendors in the loop",
            what: "A spreadsheet lives in Google Drive or Excel — the same place your other docs live. No new account, no new login. Sometimes that's the right answer.",
        },
    ];

    const whereWeWin = [
        {
            title: "Roles, not edit access",
            what: "Spreadsheets give everyone full edit power. A vault distinguishes owner / admin / member with a real permission matrix. Your kid can log expenses without being able to delete the vault.",
        },
        {
            title: "The unidentified-expense workflow",
            what: "There's no spreadsheet recipe for “my partner's bank notification arrived but I don't know what they bought.” We modelled that as a first-class flow — placeholder now, claim later, never auto-merge.",
        },
        {
            title: "AI scan and AI insights",
            what: "Snap a photo of a receipt. Get a structured row. End of month, get an editorial recap with anomaly detection. Spreadsheets don't do that without serious automation work.",
        },
        {
            title: "Funds with cycles",
            what: "A real wallet model — top-ups, cycle ledgers, carry-over to another fund — with immutable transaction history. Sheets can simulate this with formulas, but the structure is fragile and the audit trail is manual.",
        },
        {
            title: "Server-side aggregations that scale",
            what: "Trend, category, member, payment-type breakdowns — all server-aggregated. A spreadsheet with thousands of rows starts groaning; ours doesn't.",
        },
        {
            title: "It still gives you the spreadsheet back",
            what: "CSV export is free, on every plan, no row limit. If DuitGee stops earning the household's trust, you take everything with you in one click.",
        },
    ];

    const tableRows = [
        { dim: "Flexibility", them: "Effectively unlimited", us: "Opinionated by design", takeaway: "them" as const },
        { dim: "Roles & permissions", them: "Edit / view, all-or-nothing", us: "Owner / admin / member matrix", takeaway: "us" as const },
        { dim: "Mystery charges from shared cards", them: "Manual workaround", us: "Unidentified-expense workflow", takeaway: "us" as const },
        { dim: "Receipt scanning (AI)", them: "Not modelled", us: "Pro tier — photos & PDFs", takeaway: "us" as const },
        { dim: "Period insights / anomalies", them: "Manual pivot tables", us: "AI summary, grounded", takeaway: "us" as const },
        { dim: "Funds / wallets with cycles", them: "Formula-based simulation", us: "First-class data model", takeaway: "us" as const },
        { dim: "Audit trail of changes", them: "Version history, but lossy", us: "Immutable ledger on funds", takeaway: "us" as const },
        { dim: "Notifications", them: "None native", us: "Vault-wide, best-effort", takeaway: "us" as const },
        { dim: "CSV export", them: "Native", us: "Free, no row limit", takeaway: "split" as const },
        { dim: "Lock-in risk", them: "Low", us: "Low (CSV export always free)", takeaway: "split" as const },
    ];
</script>

<svelte:head>
    <title>DuitGee vs. spreadsheets — DuitGee</title>
    <meta
        name="description"
        content="Spreadsheets are infinitely flexible. DuitGee gives the household structure spreadsheets can't — RBAC, the unidentified workflow, AI scan, and grounded insights."
    />
</svelte:head>

<ComparisonPage
    rivalName="spreadsheets"
    rivalSlug="spreadsheets"
    tagline="The spreadsheet bends. The household almanac holds shape."
    intro="A shared Google Sheet or Excel workbook is the most flexible expense tracker in the world. It also doesn't know what a member is, can't tell two people not to overwrite each other's edits, and has no answer for the bank notification that arrives before the spender. DuitGee trades infinite flexibility for opinionated structure — the structure households need but spreadsheets can't model without a heroic effort."
    {whenTheyWin}
    {whereWeWin}
    {tableRows}
    bottomLine="Use a spreadsheet if your tracking is light, occasional, and idiosyncratic. Move to DuitGee when the household has outgrown the formulas — and you can always export back to CSV if you change your mind."
/>
