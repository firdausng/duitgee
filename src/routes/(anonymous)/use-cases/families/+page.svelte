<script lang="ts">
    import UseCasePage from "$lib/components/marketing/UseCasePage.svelte";

    const scenarios = [
        {
            when: "Saturday morning",
            what: "Your teenager spends $18 on a school trip. Your partner already paid for groceries. Your parent pitched in for the kid's allowance.",
            tool: "Each person logs their own — at their own speed — under one shared vault. Member breakdowns surface who paid what without a settle-up flow.",
        },
        {
            when: "First of the term",
            what: "Tuition for two kids. Music lessons. The school book list. Three different invoices, all paid against the household pool, all needing receipts.",
            tool: "Recurring rules for predictable costs. Receipt attachments (up to 5 on Free, 20 on Pro) for the irregular invoices. Funds for the per-kid allowances.",
        },
        {
            when: "End of year",
            what: "“Are we spending more on the kids than two years ago?” The kind of question only annual-cycle history can answer.",
            tool: "Statistics with custom date range (Pro). Compare same-period across years. Tag-level breakdowns for per-kid totals.",
        },
    ];

    const features = [
        {
            title: "Member roles for the whole household",
            what: "Owner for the parents. Admin for the older kid you trust to log without supervision. Member for the younger one who can log expenses but not delete them.",
        },
        {
            title: "Multiple funds (Pro)",
            what: "Allowances per child, the household debit card, the trip kitty, the school-year fund. One vault, many descriptive wallets.",
        },
        {
            title: "Tags for per-person attribution",
            what: "Categories are vault-wide; tags are how you slice spend by kid, by trip, by season. Statistics roll up tag breakdowns server-side.",
        },
        {
            title: "Recurring with auto-generation (Pro)",
            what: "Tuition, music lessons, after-school programs — the predictable monthly hits. Auto-post when you trust them; queue mode when you don't.",
        },
        {
            title: "AI receipt scan for school invoices",
            what: "PDFs and photos in, structured expense out. Saves the “sit down and copy these into the spreadsheet” evening.",
        },
        {
            title: "Vault-wide notifications",
            what: "When someone in the family logs a large expense, everyone with the right role sees it. Best-effort delivery — never rolls back the underlying action.",
        },
    ];
</script>

<svelte:head>
    <title>For families — DuitGee</title>
    <meta
        name="description"
        content="DuitGee for couples with kids and multi-generational households. Allowances, school invoices, recurring tuitions, the multi-generational pool — modelled with member roles and funds."
    />
</svelte:head>

<UseCasePage
    audience="Families"
    eyebrow="— Plate § For families —"
    tagline="More people. More wallets. More patterns to spot."
    intro="A family adds dimensions: per-kid allowances, school invoices that arrive in waves, recurring tuitions, the multi-generational pool where a grandparent occasionally pitches in. DuitGee's vaults, role matrix, and multiple-funds model were designed for this — the shape is the same as a couple's, just with more people sharing the chronicle. Per-expense splits aren't the answer; a shared pool with member visibility is."
    {scenarios}
    {features}
    bottomLine="Families have the same two problems as couples — friction and gaps — just more of them. The vault, the funds, and the member breakdowns scale up; the design centre doesn't change."
/>
