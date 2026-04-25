/**
 * Default tags seeded into every newly created vault.
 *
 * These give users a useful starter set so the WHO/WHY dimension feels populated
 * out of the box. They are marked `isSystem: true` but otherwise behave like
 * user tags — they can be renamed, recolored, or deleted.
 */
export const DEFAULT_VAULT_TAGS: ReadonlyArray<{ name: string; color: string }> = [
    { name: 'self',    color: '#3B82F6' }, // blue
    { name: 'shared',  color: '#10B981' }, // green
    { name: 'kids',    color: '#06B6D4' }, // cyan
    { name: 'partner', color: '#EC4899' }, // pink
    { name: 'work',    color: '#8B5CF6' }, // purple
    { name: 'gift',    color: '#F59E0B' }, // amber
];
