import type { Component } from 'svelte';
import House from '@lucide/svelte/icons/house';
import Receipt from '@lucide/svelte/icons/receipt';
import Wallet from '@lucide/svelte/icons/wallet';
import ChartBar from '@lucide/svelte/icons/chart-bar';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import FileText from '@lucide/svelte/icons/file-text';
import Users from '@lucide/svelte/icons/users';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import Calendar from '@lucide/svelte/icons/calendar';

export type BadgeKey = 'pendingRecurring';

export type NavItem = {
    id: string;
    label: string;
    icon: Component;
    /** Path segment after `/vaults/[vaultId]/`. Empty string = vault home. */
    path: string;
    /** Active state requires exact pathname match (used for Home so it doesn't match every sub-page). */
    exact?: boolean;
    badgeKey?: BadgeKey;
};

export type NavSection = {
    id: string;
    label?: string;
    items: NavItem[];
};

export const VAULT_NAV: NavSection[] = [
    {
        id: 'primary',
        items: [
            { id: 'home', label: 'Home', icon: House, path: '', exact: true },
            { id: 'expenses', label: 'Expenses', icon: Receipt, path: 'expenses' },
            { id: 'funds', label: 'Funds', icon: Wallet, path: 'funds' },
        ],
    },
    {
        id: 'manage',
        label: 'Manage',
        items: [
            { id: 'statistics', label: 'Statistics', icon: ChartBar, path: 'statistics' },
            {
                id: 'recurring',
                label: 'Recurring',
                icon: RotateCcw,
                path: 'recurring',
                badgeKey: 'pendingRecurring',
            },
            { id: 'templates', label: 'Templates', icon: FileText, path: 'templates' },
            { id: 'members', label: 'Members', icon: Users, path: 'members' },
            {
                id: 'reimbursements',
                label: 'Reimbursements',
                icon: HandCoins,
                path: 'reimbursements',
            },
            { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight, path: 'transfer' },
            { id: 'calendar', label: 'Calendar', icon: Calendar, path: 'calendar' },
        ],
    },
];

/** 3 of 4 destinations on the mobile bottom bar (4th slot is the centered Quick Add ⊕). */
export const MOBILE_BOTTOM_PRIMARY: NavItem[] = [
    { id: 'home', label: 'Home', icon: House, path: '', exact: true },
    { id: 'expenses', label: 'Expenses', icon: Receipt, path: 'expenses' },
    { id: 'funds', label: 'Funds', icon: Wallet, path: 'funds' },
];

/** Items shown inside the mobile "More" bottom sheet. */
export const MOBILE_MORE_ITEMS: NavItem[] =
    VAULT_NAV.find((s) => s.id === 'manage')?.items ?? [];

export function vaultItemHref(vaultId: string, item: NavItem, search = ''): string {
    const base = item.path ? `/vaults/${vaultId}/${item.path}` : `/vaults/${vaultId}`;
    return base + search;
}

export function isItemActive(currentPath: string, vaultId: string, item: NavItem): boolean {
    const href = item.path ? `/vaults/${vaultId}/${item.path}` : `/vaults/${vaultId}`;
    return item.exact
        ? currentPath === href
        : currentPath === href || currentPath.startsWith(href + '/');
}
