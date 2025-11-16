import * as v from 'valibot';

export const registerSchema = v.object({
	firstName: v.pipe(
		v.string('First name is required'),
		v.minLength(1, 'First name is required'),
		v.maxLength(50, 'First name must be less than 50 characters')
	),
	lastName: v.pipe(
		v.string('Last name is required'),
		v.minLength(1, 'Last name is required'),
		v.maxLength(50, 'Last name must be less than 50 characters')
	),
	email: v.pipe(
		v.string('Email is required'),
		v.email('Please enter a valid email address')
	),
	password: v.pipe(
		v.string('Password is required'),
		v.minLength(8, 'Password must be at least 8 characters')
	),
	confirmPassword: v.pipe(
		v.string('Please confirm your password'),
		v.minLength(8, 'Password must be at least 8 characters')
	)
});

export type RegisterSchema = v.InferOutput<typeof registerSchema>;
