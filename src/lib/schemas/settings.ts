import * as v from 'valibot';

export const updateProfileSchema = v.object({
	name: v.pipe(
		v.string('Name is required'),
		v.minLength(1, 'Name is required'),
		v.maxLength(100, 'Name must be less than 100 characters')
	)
});

export type UpdateProfileSchema = v.InferOutput<typeof updateProfileSchema>;
