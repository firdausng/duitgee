---
title: Reimbursements
description: Settle out-of-pocket expenses against a fund — record the charge now, settle when the fund pays it back.
---

<svelte:head>

<title>Reimbursements — DuitGee Docs</title>
<meta name="description" content="Settle out-of-pocket expenses against a fund — record the charge now, settle when the fund pays it back." />

</svelte:head>

# Reimbursements

Sometimes someone pays out of pocket for something the fund should cover — you grab groceries on your personal card because the household card is at home, but the household fund should cover it. Reimbursements close that loop.

## The flow

1. **Log the expense** with **Paid back** as the fund deduction mode. The fund balance does **not** drop yet — instead, the expense is marked as awaiting reimbursement.
2. When the fund actually pays the spender back (cash hand-off, transfer, however you handle it in real life), open the expense or the fund's reimbursements list and **Settle**.
3. On settle, the fund balance drops by the expense amount; the spender is credited; the audit log records who settled when.

The point is to keep the fund balance honest. If you'd marked the deduction as **Direct**, the fund would show a phantom drop the moment you logged the charge — even though no money has moved out of the wallet yet.

## Pending reimbursements view

Each fund has a **Reimbursements** tab listing pending and settled entries:

- **Pending** — logged but not yet settled. Shows amount, date, original spender.
- **Settled** — closed, with settle date.

## Cross-fund reimbursements (Pro)

Free shows reimbursements within a single fund. Pro (`fund:cross_fund_reimbursement`) lets you list and settle reimbursements across every fund in the vault from one screen — useful in households with several active wallets.

## Permissions

- **Log a reimbursable expense**: anyone with `canCreateExpenses`.
- **Settle**: Owner or Admin.

## Related

- [Funds](/docs/funds) — the parent concept.
- [Cycles](/docs/fund-cycles) — settled reimbursements land in the active cycle.
- [Transfers](/docs/transfers) — for moving balance between funds, not for personal-to-fund settlement.
