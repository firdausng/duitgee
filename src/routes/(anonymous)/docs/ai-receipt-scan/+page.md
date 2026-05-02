---
title: AI Receipt Scan
description: Drop a receipt photo or PDF and DuitGee extracts amount, merchant, date, and a suggested category.
---

<svelte:head>

<title>AI Receipt Scan — DuitGee Docs</title>
<meta name="description" content="Drop a receipt photo or PDF and DuitGee extracts amount, merchant, date, and a suggested category." />

</svelte:head>

# AI Receipt Scan

Drop a receipt and let DuitGee fill in the form. Pro-only.

## What you get back

The scan returns:

- **Amount** — parsed from the receipt total.
- **Currency** — ISO 4217 code if visible.
- **Merchant** — the merchant name, if it's clear.
- **Date** — date and time of purchase.
- **Suggested category** — pinned to the canonical category list. Falls back to **Misc** if the model invents a name.
- **Confidence** — DuitGee's read on how sure it is.

You always confirm before saving. Bad scans cost you nothing — just edit the form.

## Supported file types

- Images: JPEG, PNG, WebP.
- PDFs: standard PDFs with a text layer.

**PDFs work better than photos** today. DuitGee uses Cloudflare's image-to-markdown step, which is closer to scene summarization than dense OCR — packed receipt text can be lossy. For best results on photos, take them straight-on with good light.

## How it works

Two stages:

1. The file is converted to markdown (text layer for PDFs, scene summary for images).
2. A Llama model parses the markdown into structured JSON, constrained to the canonical category list.

Output gets validated, sanity-bounded (amounts above 1,000,000 are dropped), and category-normalized before it reaches your form.

## Guardrails

- **Daily cap**: 50 scans per user per day. The cap is per-user, not per-vault.
- **Dedup cache**: scanning the same file again within 24 hours returns the same result without re-spending the quota.
- **Sanity bounds**: implausible amounts become empty rather than poisoning the form.

## Failure modes

- Empty markdown → user-facing message suggesting a screenshot for PDFs without text layers.
- Unexpected output → "Scanner returned an unexpected shape." Retry or fill the form by hand.
- Hit the daily cap → wait until UTC midnight or fall back to manual entry.

## Plan tier

Pro only (`attachment:scan`). Free users see the upload control with a Pro badge — the feature is visible, just gated.

## Related

- [Attachments](/docs/attachments) — the scan attaches the file to the expense in the same flow.
- [Expenses](/docs/expenses) — the form the scan pre-fills.
