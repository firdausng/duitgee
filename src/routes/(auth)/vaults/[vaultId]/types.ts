export type Expense = {
    id: string;
    vaultId: string;
    note: string | null;
    amount: number;
    category: {
        name: string;
        description: string;
        icon: string;
        iconType: string;
        color: string;
        isPublic: boolean;
        group: string;
    };
    paidBy: string | null;
    paidByName: string | null;
    templateId: string | null;
    date: string;
    createdAt: string | null;
    createdBy: string;
    updatedAt: string | null;
    updatedBy: string | null;
    deletedAt: string | null;
    deletedBy: string | null;
};

export type VaultStatistics = {
    total: {
        amount: number;
        count: number;
    };
    byTemplate: Array<{
        templateId: string | null;
        templateName: string;
        templateIcon: string;
        totalAmount: number;
        count: number;
    }>;
    byCategory: Array<{
        categoryName: string;
        categoryIcon?: string;
        categoryIconType?: string;
        totalAmount: number;
        count: number;
    }>;
    byMember: Array<{
        userId: string | null;
        displayName: string;
        totalAmount: number;
        count: number;
    }>;
};
