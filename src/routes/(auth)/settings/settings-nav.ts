import type { Component } from 'svelte';
import User from '@lucide/svelte/icons/user';
import Palette from '@lucide/svelte/icons/palette';
import Sparkles from '@lucide/svelte/icons/sparkles';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

export type SettingsSection = {
    id: string;
    label: string;
    icon: Component;
    href: string;
    description?: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
    {
        id: 'account',
        label: 'Account',
        icon: User,
        href: '/settings/account',
        description: 'Profile, email, password',
    },
    {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        href: '/settings/appearance',
        description: 'Theme and display preferences',
    },
    {
        id: 'plan',
        label: 'Plan & billing',
        icon: Sparkles,
        href: '/settings/plan',
        description: 'Your subscription and limits',
    },
    {
        id: 'danger',
        label: 'Danger zone',
        icon: AlertTriangle,
        href: '/settings/danger',
        description: 'Sign out or delete account',
    },
];
