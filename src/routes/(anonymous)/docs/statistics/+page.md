---
title: Statistics
description: A dashboard, not a filter UI — trends, breakdowns, and member net-position rendered server-side from your vault data.
---

<svelte:head>

<title>Statistics — DuitGee Docs</title>
<meta name="description" content="A dashboard, not a filter UI — trends, breakdowns, and member net-position rendered server-side from your vault data." />

</svelte:head>

# Statistics

Statistics is a **dashboard, not a filter UI** — every chart renders simultaneously so you can scan a month at a glance. The point is to surface patterns you can't see when you're inside the data.

## What's on the page

- **Spend hero** — total spent in the period, with comparison to the previous period.
- **Trend chart** — bucketed daily / weekly / monthly depending on the range.
- **Category breakdown** — donut + ranked list.
- **Payment-type breakdown** — what's running on cash vs cards vs e-wallets.
- **Member breakdown** — how much each member paid, plus net position (Pro).
- **Tag breakdown** (Pro) — your custom labels rolled up.
- **Fund breakdown** — spend per fund, if you use them.
- **Template breakdown** — which templates account for the most spend.
- **Day-of-week / hour-of-day heatmap** (Pro).
- **AI period insights** (Pro) — see [AI insights](/docs/ai-insights).

## Bucket granularity

DuitGee picks the bucket size based on the date range:

- ≤ 45 days → daily buckets.
- ≤ 180 days → weekly buckets.
- > 180 days → monthly buckets.

You don't choose this; the page picks the right granularity for the range you're viewing.

## Member net-position math

The "net position" in the member breakdown is a derived statistic — DuitGee does **not** store splits, shares, or IOUs. The math:

- `expectedShare = totalSpent ÷ activeMemberCount` (over the date range)
- `net = paid − expectedShare` per member

Vault-level expenses (`paidBy = null`) count toward the pool but aren't credited to any individual.

This is intentional v1 simplification — DuitGee is not a Splitwise replacement. Households where everyone covers roughly comparable categories get a useful "who's carrying more of the load" number. Households needing structured cost-sharing rules (rent split 60/40 by income, utilities split by room count) will hit this gap.

## History clamp on Free

Free vaults are clamped to the **last 12 months**. Any chart that would query further back is capped at the boundary, with a small upsell hint. Pro (`stats:custom_range`) removes the clamp.

The page always loads — only the *query* is clamped, not the navigation.

## Plan tier

| | Free | Pro |
|---|---|---|
| Trend, category, member, fund, template breakdowns | ✅ | ✅ |
| Tag breakdown, day/hour heatmap, member net-position | – | ✅ (`stats:advanced_breakdowns`) |
| Custom date range beyond 12 months | – | ✅ (`stats:custom_range`) |
| Chart export (PNG + CSV) | – | ✅ (`stats:export`) |
| AI period insights | – | ✅ (`stats:ai_insights`) |

## Related

- [AI period insights](/docs/ai-insights) — the AI reading of the period.
- [Tags](/docs/tags) — the dimension powering tag breakdowns.
- [Plans & billing](/docs/plans-billing) — what's gated and why.
