---
title: Plans & Billing
description: Free vs Pro — what's included, what's gated, and how DuitGee thinks about plan design.
---

<svelte:head>

<title>Plans & Billing — DuitGee Docs</title>
<meta name="description" content="Free vs Pro — what's included, what's gated, and how DuitGee thinks about plan design." />

</svelte:head>

# Plans & Billing

DuitGee has two plans: Free and Pro. The plan applies per **vault**, not per user — so you can have a free personal vault and a Pro family vault, or any other mix.

## Plan philosophy

**Pro enhances. Free is fully usable.** Free covers a real household's daily life. Pro adds power-user capabilities, depth, scale, and AI — never access to basic functionality.

We won't gate a core workflow. That's a hard rule, not a marketing line.

## What's free

- Unlimited expenses.
- Unlimited members.
- Unlimited shared vaults.
- 1 active fund.
- 5 active recurring rules (queue mode).
- Statistics for the last 12 months.
- Tag system, fully usable.
- Calendar view.
- Up to 5 attachments per expense.
- The entire unidentified-expense workflow.
- **Full CSV export, no row limit, forever.**

A user who never upgrades should still get sustained value.

## What Pro adds

| Area | What you get |
|---|---|
| Funds | Multiple active funds, auto-replenishment (`fixed_amount`, `top_to_ceiling`), full cycle history, transfers, cross-fund reimbursements |
| Recurring | Unlimited active rules, custom intervals, auto-generation |
| Attachments | Up to 20 per expense, AI receipt scan |
| Statistics | YoY, day/hour heatmap, tag breakdown, member net-position, custom date range beyond 12 months, chart export |
| AI | Period insights, receipt scanning |
| Data | Bulk CSV import, undo last import |

The full entitlement list is in `src/lib/configurations/plans.ts` if you want to see it in code.

## Two gating systems

Plans are one of two gating systems. The other is roles.

- **Role permissions** — per user per vault. Govern *what actions* you can take.
- **Plan entitlements** — per vault, applies to all members. Govern *which features* the vault has access to.

DuitGee always checks role first, then plan. See [Roles & permissions](/docs/permissions).

## Subscription tiers (separate from vault plans)

There's also a per-user subscription that limits how many vaults you can **create**:

- **Free user** — max 1 vault.
- **Premium user** — unlimited vaults.

This is independent of the per-vault Pro plan. A premium user can have many free-plan vaults; a free user can be a member of someone else's Pro vault without limits.

## Upgrading and downgrading

Plan changes apply immediately. **Downgrading is non-destructive** — your data stays. Pro features become read-only or hidden behind upgrade prompts. We don't delete things you created on Pro.

## Pricing

See **/pricing** for current pricing.

## Related

- [Roles & permissions](/docs/permissions) — the other half of gating.
- [Funds](/docs/funds), [Recurring](/docs/recurring), [Statistics](/docs/statistics) — the most plan-affected areas.
