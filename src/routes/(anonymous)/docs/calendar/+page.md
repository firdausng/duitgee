---
title: Calendar
description: A day-grid view of your vault's spending — heat overlay on each cell, click a day or drag a range to filter.
---

<svelte:head>

<title>Calendar — DuitGee Docs</title>
<meta name="description" content="A day-grid view of your vault's spending — heat overlay on each cell, click a day or drag a range to filter." />

</svelte:head>

# Calendar

A month-grid view of every expense in the vault. Useful for quickly answering *"what did we spend that week?"* or *"when did the dining out spike?"*

## What you see

- Each day cell shows the daily total as a heat overlay — denser color, bigger spend.
- Click a day → the list below filters to that day's expenses, grouped.
- Drag a range across days → the list filters to that range.
- Nav arrows to jump between months.

## Where it lives

`/vaults/<id>/calendar`.

## Plan tier

Free for everyone. No gate.

## Related

- [Expenses](/docs/expenses) — the underlying records the calendar visualizes.
- [Statistics](/docs/statistics) — for trend lines and breakdowns rather than per-day grids.
