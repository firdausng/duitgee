-- Fix invalid JSON data in budgets table
-- Replace literal string values with NULL for JSON fields

UPDATE budgets
SET category_names = NULL
WHERE category_names IN ('category_names', 'null', '');

UPDATE budgets
SET template_ids = NULL
WHERE template_ids IN ('template_ids', 'null', '');

UPDATE budgets
SET user_ids = NULL
WHERE user_ids IN ('user_ids', 'null', '');
