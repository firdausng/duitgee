export { default as Sidebar } from './Sidebar.svelte';
export { default as MobileAppBar } from './MobileAppBar.svelte';
export { default as MobileBottomBar } from './MobileBottomBar.svelte';
export { default as MobileMoreSheet } from './MobileMoreSheet.svelte';
export { default as QuickAddSheet } from './QuickAddSheet.svelte';
export { default as VaultChip } from './VaultChip.svelte';
export { default as VaultSwitcherList } from './VaultSwitcherList.svelte';
export { default as UserMenu } from './UserMenu.svelte';

export { sidebarState } from './sidebar-state.svelte';
export { mapPathToVault } from './preserve-section';
export {
    VAULT_NAV,
    MOBILE_BOTTOM_PRIMARY,
    MOBILE_MORE_ITEMS,
    vaultItemHref,
    isItemActive,
} from './nav-config';

export type { SidebarProps, SidebarBadges } from './Sidebar.svelte';
export type { MobileAppBarProps } from './MobileAppBar.svelte';
export type { MobileBottomBarProps } from './MobileBottomBar.svelte';
export type { VaultSwitcherVault } from './VaultSwitcherList.svelte';
export type { NavItem, NavSection, BadgeKey } from './nav-config';
