import * as v from 'valibot';

export const loginSchema = v.object({
	email: v.pipe(
		v.string('Email is required'),
		v.email('Please enter a valid email address')
	),
	password: v.pipe(
		v.string('Password is required'),
		v.minLength(1, 'Password is required')
	)
});

export type LoginSchema = v.InferOutput<typeof loginSchema>;
