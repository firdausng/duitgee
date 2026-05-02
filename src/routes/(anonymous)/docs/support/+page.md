---
title: Support
description: How to get help with DuitGee — contact, status, and where to find roadmap context.
---

<svelte:head>

<title>Support — DuitGee Docs</title>
<meta name="description" content="How to get help with DuitGee — contact, status, and where to find roadmap context." />

</svelte:head>

# Support

DuitGee is a small product. Support is direct.

## Contact

- **Contact form** — **/contact**. Reaches the maintainers directly.
- For account-specific issues (you can't sign in, your data isn't loading, you're locked out), include your account email and the vault name.

## Status

- **/status** — current operational status.

## Roadmap

- **/roadmap** — what's planned, what's in progress, what's recently shipped. Not a commitment, but a useful signal.

## Common questions

**My data is in another tracker. Can I bring it in?**
Yes — export to CSV, then use [bulk import](/docs/import-export). Bulk import is a Pro feature; export is free.

**Can I track multiple currencies in one vault?**
No. Currency lives at the vault level. Use a separate vault per currency and reconcile manually.

**Will DuitGee ever support per-expense splits like Splitwise?**
Not in the current product direction. The "net position" stat (Pro) gives a useful "who's carrying more of the load" number, but DuitGee doesn't store IOU ledgers and doesn't have a settle-up flow.

**Will DuitGee sync with my bank?**
Not currently. Bank sync APIs vary by region and add ongoing operational cost. The [unidentified-expense workflow](/docs/unidentified-expenses) is the structural alternative.

**Is there a mobile app?**
Web is mobile-friendly today. Native wrappers are on the roadmap.

**Where's my data stored?**
Cloudflare D1 (database) and R2 (attachments). All data is private to the vault's active members; downloads go through a permission check.

## Related

- [Plans & billing](/docs/plans-billing) — for billing-specific questions.
- [Danger zone](/docs/danger-zone) — for account / vault removal.
