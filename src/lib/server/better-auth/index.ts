import {drizzle} from "drizzle-orm/d1";
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import { betterAuth} from 'better-auth';
import {betterAuthOptions, plugins} from './options';
import * as schema from "../db/better-auth-schema";
import {admin, bearer, organization, anonymous, type UserWithRole} from "better-auth/plugins";
import MailService from "$lib/server/mail/mailService";

export const authConfig = (env: Cloudflare.Env) => {
    const db = drizzle(env.AUTH_DB, {schema});

    return betterAuth({
        database: drizzleAdapter(db, {provider: 'sqlite'}),
        ...betterAuthOptions,
        plugins: plugins,
        baseURL: env.BETTER_AUTH_URL,
        secret: env.BETTER_AUTH_SECRET,
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            sendResetPassword: async ({user, url, token}, request) => {
                const emailService = new MailService(env);

                await emailService.sendEmail({
                    to: user.email,
                    subject: "Reset your password",
                    text: `Click the link to reset your password: ${url}`,
                });
            },
            onPasswordReset: async ({ user }, request) => {
                // your logic here
                console.log(`Password for user ${user.email} has been reset.`);
            },
        },
        socialProviders: {
            google: {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
        },
        trustedOrigins: [
            env.BASE_PATH,
        ],
        emailVerification: {
            sendOnSignUp: true,
            sendVerificationEmail: async ({user, url, token}, request) => {
                console.log("Sending verification email to", user.email);

                const emailService = new MailService(env);

                await emailService.sendEmail({
                    to: user.email,
                    subject: "Verify your email address",
                    text: `Click the link to verify your email: ${url}`,
                });
            },
            async afterEmailVerification(user, request) {
                // Your custom logic here, e.g., grant access to premium features
                console.log(`${user.email} has been successfully verified!`);
            }
        },
        logger: {
            disabled: false,
            disableColors: false,
            level: "info",
            log: (level, message, ...args) => {
                // Custom logging implementation
                console.log(`[${level}] ${message}`, ...args);
            }
        }
    });
};