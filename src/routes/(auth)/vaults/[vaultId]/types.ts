export type Expense = {
    id: string;
    vaultId: string;
    note: string | null;
    amount: number;
    paymentType: string;
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
    fundId: string | null;
    fundName: string | null;
    fundIcon: string | null;
    templateId: string | null;
    recurringExpenseId: string | null;
    date: string;
    createdAt: string | null;
    createdBy: string;
    updatedAt: string | null;
    updatedBy: string | null;
    deletedAt: string | null;
    deletedBy: string | null;
    tags?: Array<{ id: string; name: string; color: string | null }>;
    attachments?: Array<{ id: string; fileName: string; mimeType: string; fileSize: number }>;
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
    byTag: Array<{
        tagId: string;
        tagName: string;
        tagColor: string | null;
        totalAmount: number;
        count: number;
    }>;
    // Present when the request asked for includePrior — drives the
    // SpendHeroCard "vs. last period" delta caption.
    prior?: {
        total: { amount: number; count: number };
    } | null;
    // Present when the request asked for includeAllTimeCount — drives the
    // empty-vault welcome checklist visibility.
    allTimeCount?: number | null;
    // Present when the request asked for recentExpensesLimit — replaces a
    // separate /getExpenses round-trip for the home dashboard.
    recentExpenses?: {
        expenses: Expense[];
        pagination: { page: number; limit: number; total: number; pages: number };
    } | null;
};
