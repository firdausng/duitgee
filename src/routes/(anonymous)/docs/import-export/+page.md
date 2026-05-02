---
title: Import & Export
description: Move expenses in and out of DuitGee with CSV — bulk import (Pro), bulk export (free, no row limit), and an undo button.
---

<svelte:head>

<title>Import & Export — DuitGee Docs</title>
<meta name="description" content="Move expenses in and out of DuitGee with CSV — bulk import (Pro), bulk export (free, no row limit), and an undo button." />

</svelte:head>

# Import & Export

CSV import and export. Data portability is baseline trust — export is **free forever, no row limit**.

## Export

From the vault, hit **Export**. You get a CSV stream with the same filters you'd use on the expense list:

- Date range
- Category
- Member
- Fund

The export is streamed, so it works on tens of thousands of rows without timing out.

### CSV column schema

`id, date, amount, category, paymentType, note, paidByEmail, tags, fundName, createdAt, createdBy`

- `tags` is `;`-separated.
- `paidByEmail` is the actual email of the member, or empty for vault-level expenses.
- `id`, `createdBy`, `createdAt`, `fundName` are export-only — they're ignored on import.

### Plan tier

Free for everyone. No row limit.

## Import (Pro)

Bulk import is a Pro feature (`expense:import`). Free vaults can still import by exporting from another tool, opening the CSV, and pasting via the standard add-expense form — but the bulk path is paywalled.

### Workflow

1. **Upload** — drag a CSV onto **/vaults/<id>/expenses/import**.
2. **Preview** — DuitGee parses and validates without writing anything. You'll see:
   - Valid rows, ready to import.
   - Errors per row (bad date, unknown member, malformed amount).
   - New tags that will be created on confirm.
3. **Confirm** — DuitGee inserts in batches of 50 and stamps every row with the same `importBatchId`.
4. **Undo** (optional) — if you regret the import, **Undo** soft-deletes every row stamped with that batch ID.

### Hard limits

- **Max 10,000 rows** per file. Files above are rejected with guidance to split.
- Inserts are batched at 50. If the import fails mid-way, prior batches are persisted; you'll get the import token and can call **Undo** to roll the partial back.

### Import column behavior

- `id`, `createdBy`, `fundName` — ignored on import.
- `paidByEmail` — must match an active vault member; unknown emails error per row.
- `category` — case-insensitive match against the catalog; falls through to free-form if unknown (matching the manual-entry behavior).
- `tags` — `;`-separated; missing tags auto-create on confirm.
- `paymentType` — free-string; new types are accepted.

### No duplicate detection on import

Re-importing the same file twice **doubles your data**. By design — expenses have no natural unique key, and hash-deduplication risks silent loss when wrong. Use **Undo** if you re-import by mistake.

## Plan tier

| | Free | Pro |
|---|---|---|
| CSV export | ✅ (no row limit) | ✅ |
| CSV import | – | ✅ |
| Undo last import | – | ✅ |

## Related

- [Expenses](/docs/expenses) — the row format imports map to.
- [Tags](/docs/tags) — auto-created on import.
- [Plans & billing](/docs/plans-billing) — why export is free.
