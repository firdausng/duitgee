import * as v from 'valibot';

export const filterSchema = v.object({
    filter: v.optional(v.string(), "month"),
    startDate: v.optional(v.string(), ""),
    endDate: v.optional(v.string(), ""),
    fundId: v.optional(v.string(), ""),
});