---
title: Funds
description: Funds are descriptive wallets, not prescriptive budgets — a fund tracks a real pool of money like the household card or the kid's allowance jar.
---

<svelte:head>

<title>Funds — DuitGee Docs</title>
<meta name="description" content="Funds are descriptive wallets, not prescriptive budgets — a fund tracks a real pool of money like the household card or the kid's allowance jar." />

</svelte:head>

# Funds

A fund tracks a real pool of money. The household debit card. The kid's allowance jar. The trip-to-Tokyo fund. Balance in, balance out, who used it. You record reality; the fund does the bookkeeping.

## Funds are not budgets

This is the most common point of confusion if you're coming from YNAB or similar tools.

| | YNAB categories | DuitGee funds |
|---|---|---|
| Mandatory coverage | Every dollar must be assigned | Optional; can run with zero |
| Tracks | Intent for money you have | A specific wallet's balance |
| Overspending | Blocked | Recorded; balance can go negative |
| Replenishment | Manual reassignment | Policy: manual / fixed amount / top to ceiling |
| Mental model | "Where should this money go?" | "Where did the money go?" |

Funds describe a wallet that exists. They don't enforce intent.

## Anatomy of a fund

- **Name** — "Family Card", "Sarah's allowance", "Trip fund".
- **Starting balance** — the amount in the wallet today.
- **Ceiling** (optional) — a soft target, not a hard cap. Used by `top_to_ceiling` replenishment.
- **Replenishment policy** — `manual` (free), `fixed_amount` (Pro), `top_to_ceiling` (Pro).
- **Replenishment cadence** — daily / weekly / monthly / yearly, with an interval.

## Operations

- **Top up** — add money to the fund.
- **Deduct** — pay an expense from the fund. Two modes:
  - **Direct** — the expense's `paymentType` is whatever the fund maps to; the fund balance drops by the expense amount immediately.
  - **Paid back** — someone paid out of pocket and will be reimbursed from the fund. The fund doesn't move until the reimbursement settles. See [Reimbursements](/docs/reimbursements).
- **Transfer** — move balance between funds. Pro feature. See [Transfers](/docs/transfers).
- **Cycle** — close the current period and start a fresh one. See [Cycles](/docs/fund-cycles).
- **Activity log** — every entry against this fund: top-ups, deductions, transfers, reimbursements.

## Tying expenses to funds

When you create or edit an expense, the **Fund** field deducts from the chosen fund. Templates and recurring rules can pin a fund (and the deduction mode) so you don't have to set it every time.

If you delete a fund-linked expense, the matching fund transaction is reversed in the same write — balances stay honest.

## Plan tier

| | Free | Pro |
|---|---|---|
| Active funds | 1 | unlimited |
| Replenishment policies | manual | manual + fixed amount + top to ceiling |
| Cycle history | active cycle only | full history |
| Cross-fund reimbursements | – | ✅ |
| Transfers | – | ✅ |

## Related

- [Cycles](/docs/fund-cycles) — close a period, capture the closing balance, start fresh.
- [Reimbursements](/docs/reimbursements) — settle out-of-pocket charges against a fund.
- [Transfers](/docs/transfers) — move balance between funds.
