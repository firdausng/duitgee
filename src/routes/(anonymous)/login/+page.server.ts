import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from "@sveltejs/kit";
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/schemas/login';
import { authConfig } from '$lib/server/better-auth';

export const load: PageServerLoad = async ({ locals, platform }) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    if (!platform?.env?.DB) {
        throw new Error('Database not available');
    }

    if(locals.currentUser){
        redirect(302, '/');
    }

    const form = await superValidate(valibot(loginSchema));

    return {
        basePath: platform.env.BASE_PATH,
        callbackPath: platform.env.CALLBACK_PATH,
        form
    };
};

export const actions: Actions = {
    default: async ({ request, platform, cookies }) => {
        if (!platform?.env) {
            return fail(500, { message: 'Platform not available' });
        }

        const form = await superValidate(request, valibot(loginSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        const { email, password } = form.data;

        try {
            const auth = authConfig(platform.env);

            // Sign in user using Better Auth server API
            const result = await auth.api.signInEmail({
                body: {
                    email,
                    password
                }
            });

            if (!result) {
                return fail(400, {
                    form,
                    message: 'Invalid email or password'
                });
            }

            // Success - return with success flag
            return {
                form,
                message: { success: true }
            };
        } catch (error: any) {
            console.error('Login error:', error);

            // Better Auth might throw an error with details
            let errorMessage = 'Authentication failed';

            if (error?.status === 403) {
                errorMessage = 'Please verify your email address';
            } else if (error?.body?.message) {
                errorMessage = error.body.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            return fail(error?.status || 500, {
                form,
                message: errorMessage
            });
        }
    }
};