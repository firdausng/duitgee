---
title: Roles & Permissions
description: Owner, Admin, and Member — what each role can do in a DuitGee vault.
---

<svelte:head>

<title>Roles & Permissions — DuitGee Docs</title>
<meta name="description" content="Owner, Admin, and Member — what each role can do in a DuitGee vault." />

</svelte:head>

# Roles & Permissions

Each vault has its own roles. A user can be Owner of one vault, Admin of another, and Member of a third.

## The three roles

- **Owner** — full control. Created the vault by default; ownership can be transferred. Only Owners can delete the vault.
- **Admin** — manage everything in the vault except deleting it. Edit and delete expenses, manage members, manage funds, edit vault settings.
- **Member** — create expenses. Cannot edit or delete other people's records.

## Permission matrix

| Permission | Owner | Admin | Member |
|---|:-:|:-:|:-:|
| View expenses | ✅ | ✅ | ✅ |
| Create expenses | ✅ | ✅ | ✅ |
| Edit expenses | ✅ | ✅ | ❌ |
| Delete expenses | ✅ | ✅ | ❌ |
| Manage funds (top up, deduct, transfer) | ✅ | ✅ | ❌ |
| Settle reimbursements | ✅ | ✅ | ❌ |
| Manage members (invite, remove, role change) | ✅ | ✅ | ❌ |
| Edit vault settings | ✅ | ✅ | ❌ |
| Delete vault | ✅ | ❌ | ❌ |

## Picking a role

- **Family with kids logging their own purchases** — kids as Members, parents as Owner / Admin.
- **Couple sharing a household** — both as Owner (or one Owner, one Admin if you want a clear "vault keeper").
- **Flatmates with a joint card** — whoever takes responsibility for the records is Owner / Admin; everyone else is Member.

## Two gating systems work together

DuitGee always checks **role first, then plan**:

- **Role permissions** — per-user-per-vault. Govern *what actions* you can take.
- **Plan entitlements** — per-vault, applies to all members. Govern *which features* the vault has access to.

A member of a Pro vault still can't edit other people's expenses; an Owner of a Free vault still can't run AI receipt scans. See [Plans & billing](/docs/plans-billing) for what Pro unlocks.

## Related

- [Members & invitations](/docs/members) — how to assign roles in practice.
- [Plans & billing](/docs/plans-billing) — the other half of the gating system.
