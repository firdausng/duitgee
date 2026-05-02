export type DocsNavItem = {
	title: string;
	slug: string;
};

export type DocsNavGroup = {
	title: string;
	items: DocsNavItem[];
};

export const docsNav: DocsNavGroup[] = [
	{
		title: 'Getting Started',
		items: [
			{ title: 'Overview', slug: 'overview' },
			{ title: 'Getting Started', slug: 'getting-started' },
		],
	},
	{
		title: 'Core',
		items: [
			{ title: 'Expenses', slug: 'expenses' },
			{ title: 'Recurring Expenses', slug: 'recurring' },
			{ title: 'Templates', slug: 'templates' },
			{ title: 'AI Receipt Scan', slug: 'ai-receipt-scan' },
			{ title: 'Calendar', slug: 'calendar' },
		],
	},
	{
		title: 'Funds',
		items: [
			{ title: 'Funds', slug: 'funds' },
			{ title: 'Cycles', slug: 'fund-cycles' },
			{ title: 'Reimbursements', slug: 'reimbursements' },
			{ title: 'Transfers', slug: 'transfers' },
		],
	},
	{
		title: 'Collaboration',
		items: [
			{ title: 'Members & Invitations', slug: 'members' },
			{ title: 'Roles & Permissions', slug: 'permissions' },
			{ title: 'Notifications', slug: 'notifications' },
		],
	},
	{
		title: 'Insights',
		items: [
			{ title: 'Statistics', slug: 'statistics' },
			{ title: 'AI Period Insights', slug: 'ai-insights' },
			{ title: 'Tags', slug: 'tags' },
		],
	},
	{
		title: 'Data',
		items: [
			{ title: 'Import & Export', slug: 'import-export' },
			{ title: 'Attachments', slug: 'attachments' },
			{ title: 'Unidentified Expenses', slug: 'unidentified-expenses' },
		],
	},
	{
		title: 'Account',
		items: [
			{ title: 'Plans & Billing', slug: 'plans-billing' },
			{ title: 'Settings', slug: 'settings' },
			{ title: 'Support', slug: 'support' },
			{ title: 'Danger Zone', slug: 'danger-zone' },
		],
	},
];
