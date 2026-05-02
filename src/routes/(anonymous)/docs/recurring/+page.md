---
title: Recurring Expenses
description: Schedule expenses that repeat on a cadence — daily, weekly, monthly, yearly, or any custom interval — with auto or queue generation.
---

<svelte:head>

<title>Recurring Expenses — DuitGee Docs</title>
<meta name="description" content="Schedule expenses that repeat on a cadence — daily, weekly, monthly, yearly, or any custom interval — with auto or queue generation." />

</svelte:head>

# Recurring Expenses

Set rent, salary, the streaming subscription, the gym membership once, and let DuitGee do the bookkeeping every cycle.

## Two generation modes

**Queue (free).** When the rule fires, DuitGee creates a *pending occurrence* in your inbox. You explicitly approve or skip it, with the option to override the amount or note before approving. Ideal for variable charges (electricity, mobile data) where the number isn't the same every cycle.

**Auto (Pro).** When the rule fires, DuitGee creates the actual expense with no input from you. Ideal for fixed charges that don't surprise you (rent, Netflix).

The mode is set per rule at creation. Free vaults default to queue.

## Schedule

- **Unit**: day / week / month / year.
- **Interval**: a positive integer. `2 × week` is bi-weekly. `3 × month` is quarterly. Anything beyond `1 × {day,week,month,year}` requires Pro (`recurring:custom_interval`).
- **Anchor date**: the first occurrence and the cadence anchor — DuitGee preserves day-of-week or day-of-month from this date.

## Lifecycle

- **Active** — generating on schedule.
- **Paused** — the rule is kept, but no occurrences are generated. You can resume any time; DuitGee recomputes the next occurrence from the anchor.
- **Ended** — the rule has hit its end date or count. No further generation.

Operations:

- **Pause** — temporarily stop generation.
- **Resume** — continue from the anchor + interval.
- **Skip next** — advance the next occurrence by one interval without generating.
- **Settle** — record a single lump-sum expense and end the rule. Used for "I just paid the rest off."
- **Delete** — optionally with **Also delete generated expenses** to soft-delete every prior occurrence and reverse fund transactions in the same write.

## Termination

A rule can have:

- **End date** (inclusive), or
- **End after count** (max occurrences), or
- **Both**, or
- **Neither** (= indefinite).

## Backfill (queue mode)

When you create a queue rule, you can ask DuitGee to backfill pending occurrences from the anchor date forward to today. Hard cap: **12 occurrences** server-side. Keeps your inbox sane.

## Apply to past

When you edit a rule (price hike on Netflix, category move), check **Apply to past** to push the change back through every expense the rule already generated. Fund transactions are re-wired in the same operation:

- Amount change → delta entry against the fund.
- Fund change → detach from the old fund, attach to the new.

Without this flag, edits only affect future occurrences. Existing past expenses are left alone.

## Plan tier

| | Free | Pro |
|---|---|---|
| Active rule cap | 5 | unlimited |
| Schedule | daily / weekly / monthly / yearly | + custom intervals |
| Generation mode | queue | queue + auto |

## Related

- [Templates](/docs/templates) — recurring rules are always backed by a template.
- [Funds](/docs/funds) — recurring rules can deduct from a fund automatically.
- [Notifications](/docs/notifications) — pending occurrences fan out to vault members.
