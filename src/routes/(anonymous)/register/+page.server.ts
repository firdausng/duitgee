import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { registerSchema } from '$lib/schemas/register';
import { fail } from '@sveltejs/kit';
import { authConfig } from '$lib/server/better-auth';

export const load: PageServerLoad = async ({ locals, platform }) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    if (!platform?.env?.DB) {
        throw new Error('Database not available');
    }

    const form = await superValidate(valibot(registerSchema));

    return {
        basePath: platform.env.BASE_PATH,
        callbackPath: platform.env.CALLBACK_PATH,
        form
    };
};

export const actions: Actions = {
    default: async ({ request, platform }) => {
        if (!platform?.env) {
            return fail(500, { message: 'Platform not available' });
        }

        const form = await superValidate(request, valibot(registerSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const { firstName, lastName, email, password, confirmPassword } = form.data;

        // Validate passwords match
        if (password !== confirmPassword) {
            return fail(400, {
                form,
                message: 'Passwords do not match'
            });
        }

        try {
            const auth = authConfig(platform.env);

            // Create user using Better Auth server API
            const result = await auth.api.signUpEmail({
                body: {
                    email,
                    password,
                    name: `${firstName} ${lastName}`
                }
            });

            if (!result) {
                return fail(400, {
                    form,
                    message: 'Failed to create account'
                });
            }

            // Success - return with success flag
            return {
                form,
                message: { success: true }
            };
        } catch (error: any) {
            console.error('Registration error:', error);

            // Better Auth might throw an error with details
            const errorMessage = error?.body?.message || error?.message || 'Registration failed';

            return fail(500, {
                form,
                message: errorMessage
            });
        }
    }
};
