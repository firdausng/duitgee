<script lang="ts">
    import UseCasePage from "$lib/components/marketing/UseCasePage.svelte";

    const scenarios = [
        {
            when: "Sunday, grocery run",
            what: "One of you grabs the communal stuff — toilet paper, oil, dish soap, the household coffee — on the joint card. The personal bag sits on top.",
            tool: "Tag the trip “communal” when logging. Personal items go to your own vault or stay off-ledger. The vault tracks what the house pays for, not what you do.",
        },
        {
            when: "First of the month",
            what: "Rent. Utilities. The shared streaming service. Internet. The cleaning service. The “whose turn is it” loop — settled the same way every month.",
            tool: "Recurring rules for the predictable hits. The vault sees who paid; nobody has to chase. Notifications fan out so the household doesn't argue about whether it happened.",
        },
        {
            when: "Mid-quarter",
            what: "“Are we actually saving by sharing groceries, or has the communal cart drifted into individual snacks?”",
            tool: "Statistics → category and member breakdowns. The drift becomes visible in the trend chart. The forgotten subscription in the streaming category gets surfaced.",
        },
    ];

    const features = [
        {
            title: "Vaults with member roles",
            what: "All housemates are members; one or two are admins. Nobody can accidentally delete the vault while logging the grocery run.",
        },
        {
            title: "The unidentified-expense workflow",
            what: "When the joint card gets charged but nobody's home — placeholder now, claim later. Specifically designed for shared cards.",
        },
        {
            title: "Member breakdowns",
            what: "Who paid what, this period. The “you owe me”s become “we already see what each of us paid.” No IOU ledger; just visibility.",
        },
        {
            title: "Funds for the communal pool",
            what: "The household kitty, the cleaning fund, the bills account. Real wallets that top up monthly and carry over what's left.",
        },
        {
            title: "Tags for trip-level attribution",
            what: "“This grocery run was for the dinner party.” “This was the move-in restock.” Tags slice spend in ways category alone can't.",
        },
        {
            title: "CSV export for end-of-tenancy",
            what: "When someone moves out, hand them the full chronicle as CSV. Free, no row limit, every plan. Data lock-in is adversarial — we don't do it.",
        },
    ];
</script>

<svelte:head>
    <title>For housemates — DuitGee</title>
    <meta
        name="description"
        content="DuitGee for flatmates with a shared communal pool. Communal groceries, shared utilities, the “whose turn is it” loop — without becoming an IOU ledger."
    />
</svelte:head>

<UseCasePage
    audience="Housemates"
    eyebrow="— Plate § For housemates —"
    tagline="The shared pool, without the IOU ledger."
    intro="Housemates with a joint pool — for groceries, bills, the cleaning service, the household kitty — sit in an awkward middle. Splitwise turns every interaction into a tab; spreadsheets fall over once life gets busy. DuitGee's vault model fits the actual shape: one shared pool, multiple members logging into it, periodic visibility into who paid what without the running balance. The design centre — friction and gaps — applies just as much when the people you share with aren't romantic partners."
    {scenarios}
    {features}
    bottomLine="If your house has a real shared pool — not a per-meal IOU — DuitGee fits better than either Splitwise or a sheet. If you split each grocery trip 30/40/30, Splitwise is still the right call."
/>
