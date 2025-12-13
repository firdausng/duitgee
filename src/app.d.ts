declare global {
	namespace App {
        interface Platform {
            env: Env
            cf: CfProperties
            ctx: ExecutionContext
        }

        interface Api {
            Bindings: Cloudflare.Env,
            Variables: RequestIdVariables & {
                currentSession: AuthSession
                [PUBLIC_CATEGORIES_KEY]: CategoryData
            }
        }
        interface Locals {
            error: Error
            currentSession: AuthSession
            currentUser: User
            isVaultLimitReach: boolean
        }

        interface AuthSession {
            user:User
            session:Session
        }

        interface User {
            id: string
            createdAt: Date
            updatedAt: Date
            email: string
            emailVerified: boolean
            name: string
            role?: 'user'| 'admin' | null | undefined
            image?: string | null | undefined
            banned: boolean | null | undefined,
            banReason?: string | null | undefined,
            banExpires?: Date | null | undefined,
        }

        interface Session {
            id: string
            createdAt: Date
            updatedAt: Date
            userId: string
            expiresAt: Date
            token: string
            ipAddress?: string | null | undefined
            userAgent?: string | null | undefined
            activeOrganizationId?: string | null | undefined,
            activeTeamId?: string | null | undefined,
            impersonatedBy?: string | null | undefined ,
        }

        interface GetVaultExpensesOptions {
            page?: number;
            limit?: number;
            categoryId?: string;
            startDate?: string;
            endDate?: string;
            memberIds?: string[];
        }
    }

    namespace Client {
        interface AppResponse<T> {
            success: boolean,
            data: T
        }

        interface ExpenseTemplateData {
            templates: ExpenseTemplate[]
        }

        interface ExpenseTemplate {
            id: string;
            vaultId: string;
            name: string;
            description: string | null;
            icon: string | null;
            iconType: string | null;
            defaultNote: string | null;
            defaultAmount: number | null;
            defaultCategoryName: string | null;
            defaultPaidBy: string | null;
            usageCount: number;
            lastUsedAt: string | null;
        }
    }

}

export {};