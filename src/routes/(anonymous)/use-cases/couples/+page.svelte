<script lang="ts">
    import UseCasePage from "$lib/components/marketing/UseCasePage.svelte";

    const scenarios = [
        {
            when: "Tuesday, 8:42 pm",
            what: "Sara's phone buzzes — $24.50 at the local cafe, on the shared card. She didn't make the charge. Alex isn't home yet.",
            tool: "Quick-log unidentified. A placeholder is logged in two taps. When Alex gets home, the app prompts a claim-and-fill — never auto-merged.",
        },
        {
            when: "End of month",
            what: "“Are we spending more on dining out than last quarter?” The answer used to mean digging through receipts.",
            tool: "Statistics → trend & category breakdown. Server-side aggregation, with period comparison built in. Two clicks, not twenty.",
        },
        {
            when: "First of the month",
            what: "The streaming services, the gym, the cloud backup, the language app — small recurring charges that add up to something neither of you tracks.",
            tool: "Recurring rule listing. Every active commitment in one view, with a running monthly total. The forgotten subscription becomes visible.",
        },
    ];

    const features = [
        {
            title: "Vaults with proper roles",
            what: "Owner / admin / member. You're both owners; neither of you accidentally deletes the vault while logging dinner.",
        },
        {
            title: "Member breakdowns",
            what: "Who paid what, this month, this quarter. The “let me dig through receipts” tax disappears.",
        },
        {
            title: "Unidentified-expense workflow",
            what: "The bank notification arrived first. Log the placeholder. Claim later. ±1 day matching, any payer — shared cards don't care whose name is on the alert.",
        },
        {
            title: "Funds — descriptive wallets",
            what: "Date night, the trip kitty, the household debit card. Real wallets with cycles and carry-over, not envelopes that block you.",
        },
        {
            title: "AI receipt scan",
            what: "Snap the dinner receipt. Get a structured expense back. Pro tier — for the months when manual entry feels like a chore.",
        },
        {
            title: "Period insights, grounded",
            what: "End-of-month editorial recap with anomaly detection. Bullets we can't back up are dropped before you see them.",
        },
    ];
</script>

<svelte:head>
    <title>For couples — DuitGee</title>
    <meta
        name="description"
        content="DuitGee was built for couples first. Shared cards, the “did you log it?” loop, the monthly check-in — modelled with vaults, member breakdowns, and the unidentified workflow."
    />
</svelte:head>

<UseCasePage
    audience="Couples"
    eyebrow="— Plate § For couples —"
    tagline="The relationship that drove DuitGee's design."
    intro="DuitGee was built primarily so the maker and his wife could manage their shared expenses without the small recurring frictions that come with a manual-entry app. Couples are the design centre — the “did you log it?” loop, the bank notification that arrives before the spender, the monthly “where did it go?” conversation. If two people share a card, share a pool, and don't want to run a tab against each other, this is the shape."
    {scenarios}
    {features}
    bottomLine="The two ideas — reduce friction with your partner, and spot the gaps you'd otherwise miss — both make most sense for two people sharing money. Couples are who DuitGee was made for first."
/>
