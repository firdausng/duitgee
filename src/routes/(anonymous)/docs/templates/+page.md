---
title: Templates
description: Save common expense shapes and reuse them with one tap — pre-fill amount, category, payment type, fund, and tags.
---

<svelte:head>

<title>Templates — DuitGee Docs</title>
<meta name="description" content="Save common expense shapes and reuse them with one tap — pre-fill amount, category, payment type, fund, and tags." />

</svelte:head>

# Templates

A template is a pre-filled expense shape. Use it for charges you log over and over: the daily coffee, the weekly grocery run, the monthly toll. Pick the template, tweak what's different, save.

## What a template stores

- Amount (optional default)
- Category
- Payment type
- Paid by
- Fund (and how it deducts — direct or paid-back)
- Note
- Default tag set

Any of these can be empty in the template — empty fields just don't pre-fill. You always have the chance to edit before saving.

## Creating a template

From the vault, open **Templates** → **New Template**. Fill in the fields you want pre-filled and save. The template is vault-scoped — visible to every member.

You can also turn an existing expense into a template after the fact by opening it and choosing **Save as template**.

## Using a template

From the **Add expense** form, pick a template at the top. The form pre-fills with the template's values. Edit anything you want. Save.

## Templates and recurring rules

Every recurring rule is backed by a template under the hood. When you create a recurring rule, DuitGee creates (or reuses) a template to hold its shape. Editing a rule's "what" usually means editing its template.

## Permissions

- **Create**: Owner, Admin, or Member with `canCreateExpenses`.
- **Edit / Delete**: Owner or Admin.

## Related

- [Expenses](/docs/expenses) — the form templates pre-fill.
- [Recurring](/docs/recurring) — when the same template should fire on a schedule.
- [Tags](/docs/tags) — templates can pre-apply tag sets.
