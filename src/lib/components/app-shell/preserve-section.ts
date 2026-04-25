// Sections whose list/index page is safe to preserve when switching vaults.
// Excludes detail-id-bearing sub-paths (`expenses/123`, `funds/[id]/topup`)
// and vault-specific config (`edit`).
const VAULT_SECTION_ROOTS = new Set<string>([
    'expenses',
    'funds',
    'templates',
    'recurring',
    'statistics',
    'members',
    'reimbursements',
    'transfer',
    'calendar',
]);

/**
 * Map the current path to the equivalent path in a different vault.
 *
 * - `/vaults/A` → `/vaults/B`
 * - `/vaults/A/expenses` → `/vaults/B/expenses`
 * - `/vaults/A/expenses/123` → `/vaults/B/expenses` (drops the ID — different vault, different IDs)
 * - `/vaults/A/funds/xyz/topup` → `/vaults/B/funds` (drops the deep path)
 * - `/vaults/A/edit` → `/vaults/B` (don't carry vault-specific config across)
 * - non-vault paths → `/vaults/B` (vault home)
 */
export function mapPathToVault(currentPath: string, toVaultId: string): string {
    const match = currentPath.match(/^\/vaults\/[^/]+(?:\/([^/]+))?/);
    if (!match) return `/vaults/${toVaultId}`;

    const section = match[1];
    if (!section) return `/vaults/${toVaultId}`;
    if (VAULT_SECTION_ROOTS.has(section)) {
        return `/vaults/${toVaultId}/${section}`;
    }
    return `/vaults/${toVaultId}`;
}
