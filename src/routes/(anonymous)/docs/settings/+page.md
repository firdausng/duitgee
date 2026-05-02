---
title: Settings
description: Account, appearance, and plan settings — manage your DuitGee account and per-user preferences.
---

<svelte:head>

<title>Settings — DuitGee Docs</title>
<meta name="description" content="Account, appearance, and plan settings — manage your DuitGee account and per-user preferences." />

</svelte:head>

# Settings

User-level settings live at **/settings**. Vault-level settings live on each vault.

## Account

- **Name** and **email** — change either at any time. Email change requires re-verification.
- **Password** — set or change.
- **Linked accounts** — see Anonymous → Registered below.

## Appearance

- **Theme** — light, dark, or system.

Currency, locale, and date formatting are **vault-level** — set them on each vault, not in user settings. A traveler tracking household money in MYR and a personal stash in JPY uses two vaults, each with its own currency.

## Plan

The **Plan** tab shows your current subscription tier (the one that controls how many vaults you can create — see [Plans & billing](/docs/plans-billing)). Per-vault Pro upgrades are managed on each vault.

## Anonymous → Registered

If you started using DuitGee anonymously and later registered, DuitGee migrates everything you created during the anonymous session to your new account:

- Vault ownership and membership move to the new account.
- Audit trails on prior records keep the old anonymous ID — that history is correct *("this was created by the user when they were anonymous")*, not a bug.

The link is one-shot — anonymous IDs aren't reused after the link.

## Vault-level settings

These live on each vault, not in user settings:

- Vault name, locale, currency.
- Default vault (which vault you land on at sign-in). At most one default per user.
- Members and roles. See [Members & invitations](/docs/members).
- Plan upgrade for that vault. See [Plans & billing](/docs/plans-billing).

## Related

- [Plans & billing](/docs/plans-billing) — what's gated.
- [Danger zone](/docs/danger-zone) — account / vault deletion.
