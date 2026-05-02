---
title: AI Period Insights
description: A short, grounded read of your spending over the period — anomalies, sustained trends, and category drift, with a hallucination guard.
---

<svelte:head>

<title>AI Period Insights — DuitGee Docs</title>
<meta name="description" content="A short, grounded read of your spending over the period — anomalies, sustained trends, and category drift, with a hallucination guard." />

</svelte:head>

# AI Period Insights

A short, plain-language read of your spending for the period you're looking at. Pro feature.

## What it tries to do

The AI insight is meant to surface things you'd notice if you sat down and stared at the numbers, but probably won't:

- **Anomalies** — single transactions that are unusually large for their category.
- **Sustained trends** — categories that have been creeping up for several months.
- **Category drift** — the "treat is now the default" pattern.
- **Notable shifts** — a payment type you've started leaning on, a member's spend taking off.

It's an entry point, not a full analyst report. Three to five short bullets.

## Hallucination guard

LLMs sometimes invent numbers. DuitGee runs every insight through a grounding filter: any bullet citing a number that isn't present (within 1% tolerance) in the source aggregation is **dropped before display**. You'll see fewer bullets sometimes; you won't see fabricated ones.

The model is also fed *only* aggregated data plus the small list of flagged anomalies — never the full expense list, never the previous period's narrative. Narratives don't compound.

## Caching and limits

- Insights are cached per (vault, period) hash. Cache TTL is 6 hours for periods including today; 30 days for fully past periods.
- A **`Refresh`** action bypasses the cache.
- Each vault has a generation cap of 30 insights per month. The cap protects against cache-buster loops.

## Failure modes

The insight box silently shows *"Insights unavailable right now."* if anything goes wrong — model timeout, validation failure, daily cap hit. The rest of the statistics page is unaffected.

## Plan tier

Pro only (`stats:ai_insights`). Free users see the section title with a Pro badge.

## Related

- [Statistics](/docs/statistics) — where insights are rendered.
- [AI receipt scan](/docs/ai-receipt-scan) — the other AI feature.
- [Plans & billing](/docs/plans-billing) — gating details.
