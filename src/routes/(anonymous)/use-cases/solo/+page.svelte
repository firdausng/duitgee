<script lang="ts">
    import UseCasePage from "$lib/components/marketing/UseCasePage.svelte";

    const scenarios = [
        {
            when: "Tuesday, late",
            what: "Bank notification: $32.10. You don't immediately remember what you bought. Tomorrow you definitely won't.",
            tool: "Quick-log it as unidentified now. Walk past the placeholder later, claim with the receipt. Future-you doesn't have to play detective.",
        },
        {
            when: "Mid-month",
            what: "“Have I been spending more on dining out lately, or is that just vibes?”",
            tool: "Statistics → trend & category breakdown for the last 12 months. Vibe-checked against actual numbers. The forgotten subscription becomes visible in the recurring listing.",
        },
        {
            when: "Saturday, year-end",
            what: "“Where did the money actually go this year?” For the accountant, the tax return, or your own peace of mind.",
            tool: "AI period insights (Pro) generate an editorial year-end recap, grounded against your numbers. Bullets that can't be backed up are dropped.",
        },
    ];

    const features = [
        {
            title: "A vault, just for you",
            what: "All the same machinery — RBAC isn't strictly needed, but the structure (vault, members, expenses, funds) doesn't get in the way when there's only one of you.",
        },
        {
            title: "The unidentified workflow as a memory aid",
            what: "Designed for two people, but it works just as well as a “log placeholder when you're tired, claim when you remember” loop. Future-you is your collaborator.",
        },
        {
            title: "Funds — your wallets",
            what: "The trip fund. The medical fund. The hobby fund. Real descriptive wallets, not envelopes. Top up monthly; let unused amounts carry forward.",
        },
        {
            title: "Recurring rule listing",
            what: "Every active commitment — streaming, gym, software subscriptions, insurance, BNPL — in one view. The forgotten subscription becomes obvious.",
        },
        {
            title: "AI receipt scan",
            what: "Photo or PDF in, structured expense out. Pro tier. For the months when manual entry feels like a chore.",
        },
        {
            title: "Statistics that read like an editorial",
            what: "Trend, category, payment-type breakdowns. Calendar view. Period comparison. Designed to read as a chronicle, not a spreadsheet.",
        },
    ];
</script>

<svelte:head>
    <title>For solo users — DuitGee</title>
    <meta
        name="description"
        content="DuitGee works gracefully for one person. Every collaboration feature degrades to a memory aid against future-you — the version trying to remember what last Tuesday's charge was for."
    />
</svelte:head>

<UseCasePage
    audience="Solo"
    eyebrow="— Plate § For solo users —"
    tagline="Future-you is the collaborator."
    intro="Every collaboration feature in DuitGee works in degenerate single-user mode. Your “partner” just becomes future-you — the version trying to remember what last Tuesday's charge was for. The unidentified workflow becomes a memory aid; member breakdowns collapse to one person; vault-wide notifications keep yourself honest about your own spending. Funds, recurring rules, statistics, and AI insights all stand on their own without a collaborator. Solo isn't the design centre, but it's a first-class use."
    {scenarios}
    {features}
    bottomLine="If you're tracking solo and want a household-grade structure (vaults, funds, RBAC-ready) so you could invite a partner later without migrating, DuitGee fits. If you specifically want bank sync as the data-in path, the alternatives are stronger today."
/>
