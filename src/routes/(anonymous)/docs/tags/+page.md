---
title: Tags
description: The WHO/WHY dimension complementing categories — vault-scoped, many-to-many, optional, and useful in breakdowns.
---

<svelte:head>

<title>Tags — DuitGee Docs</title>
<meta name="description" content="The WHO/WHY dimension complementing categories — vault-scoped, many-to-many, optional, and useful in breakdowns." />

</svelte:head>

# Tags

A category answers *what was bought*. A tag answers *who or why*. Tags are the dimension you use to slice spending across categories — for a person, a project, a trip, a context.

## Tags vs categories

| | Categories | Tags |
|---|---|---|
| Source | System catalog (60+) | You define them, per vault |
| Cardinality per expense | One | Many |
| Coverage | Always one | Optional |
| Use case | "What is this expense?" | "Who or why?" |

Examples of useful tags:

- **Person** — `kids`, `mom`, `parents-in-law`.
- **Project** — `house-renovation`, `wedding`, `tokyo-trip`.
- **Reason** — `birthday`, `medical`, `tax-deductible`.
- **Reimbursable** — `work-expense`, `to-claim`.

## Creating and assigning tags

- Create a tag from the **Tags** page in your vault, or inline when you're editing an expense — typing a new label and hitting save will create it.
- Assign multiple tags to one expense.
- Tags carry an optional color.
- Tag names are unique per vault (case-insensitive, excluding deleted tags).

## System tags

A few default tags are seeded into every new vault. They're marked as **system** — they survive vault deletes' tag wipe and can't be removed by users.

## Templates can pre-apply tags

When you create a [template](/docs/templates), you can pin a default tag set. Every expense created from that template starts with those tags. Saves a lot of clicks if you're always tagging your weekly grocery runs.

## CSV import / export

- Export joins tags as a `;`-separated list in the `tags` column.
- Import auto-creates any tags it doesn't recognize on confirm.

See [Import & Export](/docs/import-export).

## Tag-level statistics

The **Tag breakdown** in [Statistics](/docs/statistics) groups your spend by tag. Pro feature (`stats:advanced_breakdowns`) — Free vaults can apply tags but don't see the breakdown.

## Related

- [Expenses](/docs/expenses) — where tags are assigned.
- [Templates](/docs/templates) — for pre-applied tag sets.
- [Statistics](/docs/statistics) — the tag breakdown.
