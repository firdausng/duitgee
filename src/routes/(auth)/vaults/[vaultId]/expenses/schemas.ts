import * as v from 'valibot';

export const filterSchema = v.object({
	filter: v.optional(v.string(), 'all'),
	startDate: v.optional(v.string(), ''),
	endDate: v.optional(v.string(), '')
});
