import * as v from 'valibot';

export const filterSchema = v.object({
	filter: v.optional(v.string(), 'all'),
	startDate: v.optional(v.string(), ''),
	endDate: v.optional(v.string(), ''),
	// Server-side pagination — `page` is 1-based.
	page: v.optional(v.string(), '1'),
	// 'true' hides expense rows generated from income entries (salary
	// deductions). Useful when analysing discretionary spending.
	hideDeductions: v.optional(v.string(), ''),
});
