---
title: Attachments
description: Attach receipts and supporting files to expenses — images and PDFs, stored in Cloudflare R2.
---

<svelte:head>

<title>Attachments — DuitGee Docs</title>
<meta name="description" content="Attach receipts and supporting files to expenses — images and PDFs, stored in Cloudflare R2." />

</svelte:head>

# Attachments

Attach receipts, invoices, or supporting docs to an expense.

## What you can upload

- Images: JPEG, PNG, WebP.
- PDFs.
- File size cap: 10 MB per file.

Other types may extend later. The [AI receipt scan](/docs/ai-receipt-scan) path is more restrictive — see that page for what it accepts.

## How many per expense

| Plan | Per-expense cap |
|---|:-:|
| Free | 5 |
| Pro (`attachment:multiple`) | 20 |

## How it works

Upload from the expense form. Files go to Cloudflare R2; only the metadata + key live in DuitGee's database. Every download is permission-gated against the vault, so attachments are private to the vault's active members.

You can attach the same file to multiple expenses (the storage layer supports it, even if the UI today creates them 1:1).

## Deleting

Attachment removal soft-deletes the metadata. The file in R2 stays for now — eventual GC of orphaned objects is a future concern, not a user one.

## Related

- [AI receipt scan](/docs/ai-receipt-scan) — drop a receipt and prefill the form.
- [Expenses](/docs/expenses) — the parent record.
- [Plans & billing](/docs/plans-billing) — why the cap is 5 vs 20.
