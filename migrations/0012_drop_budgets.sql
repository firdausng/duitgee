-- Drop budget indexes
DROP INDEX IF EXISTS `idx_budgets_vault`;
DROP INDEX IF EXISTS `idx_budgets_active`;

-- Drop budgets table
DROP TABLE IF EXISTS `budgets`;
