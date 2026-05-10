<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { sharedExpenseDefaultsSchema } from '$lib/schemas/expenses';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Eyebrow, Rule } from '$lib/components/almanac';
	import { DateTimePicker } from '$lib/components/ui/date-time-picker';
	import { ExpenseRow } from '$lib/components/ui/expense-row';
	import type { ExpenseRowData } from '$lib/components/ui/expense-row/expense-row.svelte';
	import { TagPicker, type TagOption } from '$lib/components/ui/tag-picker';
	import { hasEntitlement } from '$lib/configurations/plans';
	import { getAttachmentLimitPerExpense, ATTACHMENT_MAX_PER_EXPENSE_FREE } from '$lib/schemas/attachments';
	import { page as pageState } from '$app/state';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
	import { categoryData } from '$lib/configurations/categories';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';
	import { ofetch } from 'ofetch';
	import { localDatetimeToUtcIso, formatDatetimeLocal } from '$lib/utils';
	import { resolve } from '$app/paths';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Plus from '@lucide/svelte/icons/plus';
	import Copy from '@lucide/svelte/icons/copy';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { ScanScreenshotModal, type ScanReviewItem } from '$lib/components/expense-form';
	import X from '@lucide/svelte/icons/x';
	import type { ScanAttachmentMultiResponse } from '$lib/schemas/scanAttachment';
	import { ATTACHMENT_MAX_SIZE_BYTES } from '$lib/schemas/attachments';
	import { shallowModal } from '$lib/utils/shallow-modal.svelte';

	// Shallow-routed modals — back button closes them instead of leaving the page.
	const scanModal = shallowModal('scanModal');
	const duplicatePrompt = shallowModal('duplicatePrompt');

	let { data } = $props();
	let isLoading = $state(false);

	// --- Unidentified duplicate prompt state ---
	type DuplicateMatch = {
		id: string;
		amount: number;
		date: string;
		paidBy: string | null;
		paidByName: string | null;
		createdAt: string;
		createdBy: string;
	};
	let duplicateMatches = $state<DuplicateMatch[]>([]);
	/** Snapshot of what we'd POST if user picks "Create new". */
	let pendingPayload = $state<Record<string, unknown> | null>(null);

	// --- Shared defaults managed by superForm ---
	const { form, errors, delayed } = superForm(data.form, {
		validators: valibotClient(sharedExpenseDefaultsSchema),
	});

	// Set default date to current local time
	if (!$form.date) {
		$form.date = formatDatetimeLocal(new Date());
	}

	// --- Shared tags ---
	let availableTags = $state<TagOption[]>(data.tags ?? []);
	let sharedTagIds = $state<string[]>(($form.tagIds as string[] | undefined) ?? []);

	$effect(() => {
		$form.tagIds = sharedTagIds;
	});

	// Plan-gate: receipt scan is Pro-only. planId comes from the auth layout's vault list.
	const currentVaultRow = $derived(
		((pageState.data as { vaults?: Array<{ vaults: { id: string; planId?: string | null } }> })
			.vaults ?? []
		).find((v) => v.vaults?.id === data.vaultId),
	);
	const canScan = $derived(
		hasEntitlement(currentVaultRow?.vaults?.planId ?? 'plan_free', 'attachment:scan'),
	);
	const maxAttachments = $derived(
		getAttachmentLimitPerExpense(currentVaultRow?.vaults?.planId ?? 'plan_free'),
	);
	const hasAttachmentMultiple = $derived(maxAttachments > ATTACHMENT_MAX_PER_EXPENSE_FREE);


	async function handleCreateTag(name: string): Promise<TagOption> {
		const response: any = await ofetch('/api/createTag', {
			method: 'POST',
			body: { vaultId: data.vaultId, name },
			headers: { 'Content-Type': 'application/json' },
		});
		if (!response.success) throw new Error(response.error || 'Could not create tag');
		const created: TagOption = {
			id: response.data.id,
			name: response.data.name,
			color: response.data.color,
		};
		availableTags = [...availableTags, created];
		return created;
	}

	// --- Expense rows managed by $state ---
	const MAX_ROWS = 20;

	function createEmptyRow(): ExpenseRowData {
		return {
			id: crypto.randomUUID(),
			amount: data.template?.defaultAmount || undefined,
			categoryName: data.template?.defaultCategoryName || '',
			note: data.template?.defaultNote || '',
			expanded: false,
			// Default to current local time so the date input is pre-filled when the row is expanded.
			date: formatDatetimeLocal(new Date()),
			attachmentIds: [],
			errors: {},
		};
	}

	let rows = $state<ExpenseRowData[]>([createEmptyRow()]);

	// --- Multi-scan (screenshot → multiple rows) state ---
	let scanLoading = $state(false);
	let scanResult = $state<ScanAttachmentMultiResponse | null>(null);
	/** Screenshot attachment ID — applied to every row generated from this scan. */
	let scanAttachmentId = $state<string | null>(null);
	/** Per-item review state — kept across cancel→reopen so the user's untick decisions stick. */
	let scanReviewItems = $state<ScanReviewItem[]>([]);
	let scanFileInputEl: HTMLInputElement | null = $state(null);

	// Deep-link entry: when arriving via /expenses/new/form?scan=1 (from the
	// picker tile, QuickAddSheet, or AddExpenseMenu "Scan a screenshot"
	// option), open the file picker as soon as the input element is wired up.
	// Routed through openScanPicker so non-entitled users get the same toast
	// they'd see clicking the in-form button. Fires once.
	let autoScanFired = $state(false);
	$effect(() => {
		if (autoScanFired) return;
		if (!scanFileInputEl) return;
		if (pageState.url.searchParams.get('scan') !== '1') return;
		autoScanFired = true;
		openScanPicker();
	});

	const hasPendingScan = $derived(scanResult !== null && scanAttachmentId !== null);
	const pendingSelectedCount = $derived(
		scanReviewItems.filter((i) => i.selected && i.amount !== null).length,
	);

	function clearScan() {
		scanResult = null;
		scanAttachmentId = null;
		scanReviewItems = [];
	}

	const vaultCurrency = $derived(data.vault?.currency ?? 'USD');
	const vaultLocale = $derived(data.vault?.locale ?? 'en-US');
	const scanFormatter = $derived(
		new Intl.NumberFormat(vaultLocale, { style: 'currency', currency: vaultCurrency }),
	);

	function isEmptyStarterRow(): boolean {
		// True when the form has exactly one row that's untouched — safe to replace
		// rather than leave a blank row above the scanned items.
		if (rows.length !== 1) return false;
		const r = rows[0];
		return (
			!r.amount &&
			!r.note &&
			!r.categoryName &&
			(r.attachmentIds?.length ?? 0) === 0
		);
	}

	const scanAvailableSlots = $derived(
		isEmptyStarterRow() ? MAX_ROWS : MAX_ROWS - rows.length,
	);

	function openScanPicker() {
		if (!canScan) {
			toast.error('Receipt scanning is a Pro feature.');
			return;
		}
		if (scanAvailableSlots <= 0) {
			toast.error(`Form is full (${MAX_ROWS} items max).`);
			return;
		}
		scanFileInputEl?.click();
	}

	async function handleScanFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		// Reset the input so the same file can be re-picked later.
		input.value = '';
		if (!file) return;

		if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
			toast.error(`File too large: max ${ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)} MB`);
			return;
		}

		scanModal.push();
		scanLoading = true;
		// Replace any prior pending scan — picking a new file is intent-clear.
		clearScan();

		try {
			// 1. Upload to R2 (orphaned attachment record).
			const uploadParams = new URLSearchParams({
				vaultId: data.vaultId,
				fileName: file.name,
				mimeType: file.type,
			});
			const uploadResp = await ofetch<{
				success: boolean;
				data?: { id: string };
				error?: string;
			}>(`/api/uploadAttachment?${uploadParams.toString()}`, {
				method: 'POST',
				body: file,
				headers: {
					'Content-Type': file.type,
					'Content-Length': String(file.size),
				},
			});
			if (!uploadResp.success || !uploadResp.data?.id) {
				throw new Error(uploadResp.error || 'Upload failed');
			}
			const attachmentId = uploadResp.data.id;
			scanAttachmentId = attachmentId;

			// 2. Multi-scan the uploaded file.
			const scanResp = await ofetch<{
				success: boolean;
				data?: ScanAttachmentMultiResponse;
				error?: string;
			}>('/api/scanAttachmentMulti', {
				method: 'POST',
				body: { vaultId: data.vaultId, attachmentId },
				headers: { 'Content-Type': 'application/json' },
			});
			if (!scanResp.success || !scanResp.data) {
				throw new Error(scanResp.error || 'Scan failed');
			}
			scanResult = scanResp.data;
			// Seed per-item review state — selection survives cancel→reopen.
			// Per-row template defaults to the form's batch template (or null when
			// "Start from scratch"); user can override per row in the modal.
			scanReviewItems = scanResp.data.items.map((it, i) => ({
				...it,
				selected: it.amount !== null && i < scanAvailableSlots,
				templateId: data.templateId ?? null,
			}));
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Scan failed';
			toast.error(message);
			scanModal.close();
			clearScan();
		} finally {
			scanLoading = false;
		}
	}

	function applyScannedItems(items: ScanReviewItem[], applySharedDate: boolean) {
		if (!scanAttachmentId || items.length === 0) {
			scanModal.close();
			return;
		}

		// If the screenshot's date should be the form's shared date and the user
		// hasn't manually changed it (still equals the page-load default), apply.
		// Note: we can't reliably detect "user touched it" without extra state, so
		// we always honor the user's checkbox choice and overwrite $form.date.
		if (applySharedDate && scanResult?.sourceDate) {
			$form.date = scanResult.sourceDate;
		}

		const newRows: ExpenseRowData[] = items.map((it) => ({
			id: crypto.randomUUID(),
			amount: it.amount ?? undefined,
			categoryName: it.suggestedCategory,
			note: it.note ?? '',
			expanded: false,
			date: it.datetime ?? formatDatetimeLocal(new Date()),
			// Per-row template (set in the review modal). Carried into createExpenses
			// payload so a single batch can span multiple templates.
			templateId: it.templateId ?? null,
			// Same screenshot linked to every generated row — preserves audit trail
			// per the design decision in the plan.
			attachmentIds: [scanAttachmentId!],
			errors: {},
		}));

		// Replace the empty starter row if present; otherwise append.
		if (isEmptyStarterRow()) {
			rows = newRows;
		} else {
			rows = [...rows, ...newRows].slice(0, MAX_ROWS);
		}

		toast.success(`Added ${newRows.length} item${newRows.length === 1 ? '' : 's'} from screenshot`);
		scanModal.close();
		// Apply consumes the scan — clear so the pending pill goes away.
		clearScan();
	}

	function cancelScanModal() {
		// Just close — keep scanResult, scanAttachmentId, and scanReviewItems so
		// the pending-scan pill can offer a way back in.
		scanModal.close();
	}

	function reopenScanModal() {
		if (!hasPendingScan) return;
		scanModal.push();
	}

	function discardPendingScan() {
		// Orphan R2 attachment is left behind; the project's existing cleanup catches it.
		clearScan();
	}

	function addRow() {
		if (rows.length >= MAX_ROWS) return;
		rows = [...rows, createEmptyRow()];
	}

	function removeRow(rowId: string) {
		if (rows.length <= 1) return;
		rows = rows.filter((r) => r.id !== rowId);
	}

	function duplicateRow(rowId: string) {
		if (rows.length >= MAX_ROWS) return;
		const source = rows.find((r) => r.id === rowId);
		if (!source) return;
		const copy: ExpenseRowData = {
			id: crypto.randomUUID(),
			amount: source.amount,
			categoryName: source.categoryName,
			note: source.note,
			expanded: source.expanded,
			paymentType: source.paymentType,
			paidBy: source.paidBy,
			date: source.date,
			fundId: source.fundId,
			fundPaymentMode: source.fundPaymentMode,
			// Attachments are NOT copied — duplicating typically means
			// "another similar item", not "same receipt twice".
			attachmentIds: [],
			errors: {},
		};
		const idx = rows.findIndex((r) => r.id === rowId);
		rows = [...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)];
	}

	// --- Navigation ---
	// returnTo is server-validated (scoped to this vault, same-origin). If the
	// user didn't come via a returnTo-aware link, the server falls back to
	// /vaults/[vaultId]. We prefer this over afterNavigate's `from` because
	// that captures arbitrary pages (e.g. the picker) the user doesn't want
	// to end up on after save.
	const returnTo = $derived(data.returnTo ?? resolve(`/vaults/${data.vaultId}`));

	function handleBack() {
		goto(returnTo);
	}

	// --- Disclosure + compact payment chips ---
	const primaryPaymentValues = ['cash', 'debit', 'credit'];
	const primaryPayments = paymentTypes.filter((p) => primaryPaymentValues.includes(p.value));
	const morePayments = paymentTypes.filter((p) => !primaryPaymentValues.includes(p.value));

	// Auto-show More when the active selection isn't one of the primary chips
	// (e.g. template sets fundId + ewallet — we want the user to see ewallet selected).
	let showMorePayments = $state(false);
	$effect(() => {
		if ($form.paymentType && !primaryPaymentValues.includes($form.paymentType)) {
			showMorePayments = true;
		}
	});

	// Auto-expand "More details" when template pre-filled fund/paid-by/payment
	// that the user would want to see, OR when there's a validation error there.
	const shouldExpandDetails = $derived(
		!!data.template ||
			!!$form.fundId ||
			!!$form.paidBy ||
			!primaryPaymentValues.includes($form.paymentType) ||
			!!$errors.paymentType ||
			!!$errors.paidBy ||
			!!$errors.date,
	);

	const hasMultipleMembers = $derived((data.members?.length ?? 0) > 1);

	// --- Submit ---
	async function handleSubmit() {
		// Validate rows client-side
		let hasErrors = false;
		rows = rows.map((row) => {
			const rowErrors: ExpenseRowData['errors'] = {};
			if (!row.amount || row.amount < 0.01) {
				rowErrors.amount = 'Amount must be greater than 0';
				hasErrors = true;
			}
			if (!row.categoryName) {
				rowErrors.categoryName = 'Category is required';
				hasErrors = true;
			}
			return { ...row, errors: rowErrors };
		});

		if (!$form.date) {
			toast.error('Date is required');
			return;
		}

		if (hasErrors) {
			toast.error('Please fix errors in the expense items');
			return;
		}

		// Duplicate-check guard: only when submitting a single expense and only
		// for confirmed (non-templated) entries. Multi-row batches skip the check
		// — bulk submission isn't where dedup matters.
		if (rows.length === 1 && !data.templateId) {
			const onlyRow = rows[0];
			const candidateAmount = onlyRow.amount!;
			const candidateDate = localDatetimeToUtcIso(
				(onlyRow.expanded && onlyRow.date) || $form.date,
			);
			try {
				const params = new URLSearchParams({
					vaultId: data.vaultId,
					amount: String(candidateAmount),
					date: candidateDate,
				});
				const r = await ofetch<{ success: boolean; data: DuplicateMatch[] }>(
					`/api/findUnidentifiedDuplicates?${params.toString()}`,
				);
				if (r.success && r.data.length > 0) {
					duplicateMatches = r.data;
					duplicatePrompt.push();
					return; // Pause submission until user picks an action.
				}
			} catch (err) {
				// Duplicate check is best-effort — never block create on its failure.
				console.warn('Duplicate check failed:', err);
			}
		}

		await submitCreate();
	}

	async function submitCreate() {
		isLoading = true;

		try {
			const payload = {
				vaultId: data.vaultId,
				templateId: data.templateId ?? undefined,
				shared: {
					paymentType: $form.paymentType,
					date: localDatetimeToUtcIso($form.date),
					paidBy: $form.paidBy,
					fundId: $form.fundId,
					fundPaymentMode: $form.fundId ? $form.fundPaymentMode : null,
					tagIds: sharedTagIds,
				},
				items: rows.map((row) => ({
					amount: row.amount!,
					categoryName: row.categoryName,
					note: row.note || undefined,
					...(row.expanded && row.paymentType !== undefined
						? { paymentType: row.paymentType }
						: {}),
					...(row.expanded && row.paidBy !== undefined
						? { paidBy: row.paidBy }
						: {}),
					...(row.expanded && row.date
						? { date: localDatetimeToUtcIso(row.date) }
						: {}),
					...(row.expanded && row.fundId !== undefined
						? { fundId: row.fundId }
						: {}),
					...(row.expanded && row.fundPaymentMode !== undefined
						? { fundPaymentMode: row.fundPaymentMode }
						: {}),
					// Per-row template — only sent when explicitly set on the row
					// (typically from the scan-modal picker). Server falls back
					// to data.templateId otherwise.
					...(row.templateId !== undefined
						? { templateId: row.templateId }
						: {}),
					// Per-row attachments — each row's own receipts
					...(row.attachmentIds && row.attachmentIds.length > 0
						? { attachmentIds: row.attachmentIds }
						: {}),
				})),
			};

			const response = await ofetch('/api/createExpenses', {
				method: 'POST',
				body: payload,
				headers: { 'Content-Type': 'application/json' },
			});

			if (response.success === false) {
				toast.error(response.error || 'Failed to create expenses');
				return;
			}

			const count = response.data?.created ?? rows.length;
			toast.success(
				count === 1
					? 'Expense created successfully'
					: `${count} expenses created successfully`,
			);

			await goto(returnTo);
		} catch (error: any) {
			console.error({
				...error,
				message: '[expense:new:action] Failed to create expenses',
			});
			const errorMessage =
				error?.data?.error ||
				error?.message ||
				'Failed to create expenses. Please try again.';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	function dismissDuplicatePrompt() {
		duplicatePrompt.close();
		duplicateMatches = [];
	}

	async function proceedAsNewFromPrompt() {
		dismissDuplicatePrompt();
		await submitCreate();
	}

	async function claimMatch(match: DuplicateMatch) {
		// Single-row form is the only path that reaches this prompt — claim with
		// row[0]'s details, mapped to claimUnidentifiedExpense's contract.
		const row = rows[0];
		isLoading = true;
		try {
			const payload = {
				id: match.id,
				vaultId: data.vaultId,
				amount: row.amount!,
				categoryName: row.categoryName,
				note: row.note || undefined,
				paymentType: (row.expanded && row.paymentType) || $form.paymentType,
				date: localDatetimeToUtcIso((row.expanded && row.date) || $form.date),
				paidBy: (row.expanded ? row.paidBy : $form.paidBy) ?? null,
				fundId: (row.expanded ? row.fundId : $form.fundId) ?? null,
				fundPaymentMode:
					((row.expanded ? row.fundPaymentMode : $form.fundPaymentMode) as
						| 'paid_by_fund'
						| 'pending_reimbursement'
						| null
						| undefined) ?? null,
				tagIds: sharedTagIds,
				attachmentIds:
					row.attachmentIds && row.attachmentIds.length > 0 ? row.attachmentIds : undefined,
			};

			const response = await ofetch<{ success: boolean; data?: { id: string }; error?: string }>(
				'/api/claimUnidentifiedExpense',
				{
					method: 'POST',
					body: payload,
					headers: { 'Content-Type': 'application/json' },
				},
			);

			if (!response.success) {
				toast.error(response.error || 'Failed to claim expense');
				return;
			}

			toast.success('Unidentified charge claimed');
			dismissDuplicatePrompt();
			await goto(returnTo);
		} catch (error: unknown) {
			console.error('Failed to claim unidentified expense:', error);
			const errorMessage =
				(error as { data?: { error?: string }; message?: string })?.data?.error ||
				(error as { message?: string })?.message ||
				'Failed to claim expense';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>New Expenses - DuitGee</title>
</svelte:head>

<div class="relative min-h-screen flex flex-col">
	<div class="container mx-auto py-6 px-4 flex-1 pb-28">
		<!-- Almanac masthead -->
		<header class="mb-2">
			<Eyebrow tone="muted">— New entry —</Eyebrow>
			<h1 class="dg-page-title">
				{#if data.template}
					From <em><a href="/vaults/{data.vaultId}/templates/{data.template.id}/edit">{data.template.icon} {data.template.name}</a></em>
				{:else}
					A new <em>entry</em>.
				{/if}
			</h1>
			{#if data.template?.description}
				<p class="dg-page-sub">{data.template.description}</p>
			{/if}
		</header>
		<Rule variant="double" />
		<div class="mb-4"></div>

		<!-- Multi-scan entrypoint — uploads one screenshot, AI extracts N items -->
		{#if canScan}
			<div class="mb-3 space-y-2">
				<button
					type="button"
					onclick={openScanPicker}
					disabled={isLoading || scanLoading || scanAvailableSlots <= 0}
					class="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if scanLoading}
						<Loader2 class="size-4 animate-spin" />
						Scanning…
					{:else if hasPendingScan}
						<Sparkles class="size-4" />
						Scan another screenshot
					{:else}
						<Sparkles class="size-4" />
						Scan a screenshot for multiple items
					{/if}
				</button>

				{#if hasPendingScan && !scanModal.open && !scanLoading}
					<div class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-muted/40 px-3 py-2 text-sm">
						<div class="flex items-center gap-2 min-w-0">
							<Sparkles class="size-3.5 text-primary shrink-0" />
							<span class="truncate">
								<span class="font-medium">Scan ready</span>
								<span class="text-muted-foreground">
									· {pendingSelectedCount} of {scanReviewItems.length} selected
								</span>
							</span>
						</div>
						<div class="flex items-center gap-1 shrink-0">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onclick={reopenScanModal}
								disabled={isLoading}
							>
								Review
							</Button>
							<button
								type="button"
								onclick={discardPendingScan}
								disabled={isLoading}
								aria-label="Discard scan result"
								title="Discard scan result"
								class="rounded-[var(--radius-sm)] p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
							>
								<X class="size-3.5" />
							</button>
						</div>
					</div>
				{/if}

				<input
					bind:this={scanFileInputEl}
					type="file"
					accept="image/jpeg,image/png,image/webp,application/pdf"
					class="hidden"
					onchange={handleScanFileSelected}
				/>
			</div>
		{/if}

		<!-- Expense Items (primary content) -->
		<div class="space-y-3 mb-4">
			{#if rows.length > 1}
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-medium text-muted-foreground">Items</h2>
					<span class="text-xs text-muted-foreground">{rows.length}/{MAX_ROWS}</span>
				</div>
			{/if}

			{#each rows as row, i (row.id)}
				<ExpenseRow
					bind:row={rows[i]}
					index={i}
					canRemove={rows.length > 1}
					disabled={isLoading}
					vaultId={data.vaultId}
					categories={categoryData.categories}
					categoryGroups={categoryData.categoryGroups}
					members={data.members}
					funds={data.funds}
					{paymentTypes}
					allowedCategoryNames={data.template?.categoryNames ?? undefined}
					{canScan}
					scanProHint={!canScan}
					attachmentLimitProHint={!hasAttachmentMultiple}
					maxAttachments={maxAttachments}
					onremove={() => removeRow(row.id)}
					onduplicate={() => duplicateRow(row.id)}
					canDuplicate={rows.length < MAX_ROWS}
				/>
			{/each}

			<div class="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="flex-1"
					onclick={addRow}
					disabled={isLoading || rows.length >= MAX_ROWS}
				>
					<Plus class="size-3.5" />
					Add item
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => duplicateRow(rows[rows.length - 1].id)}
					disabled={isLoading || rows.length >= MAX_ROWS}
				>
					<Copy class="size-3.5" />
					Duplicate
				</Button>
			</div>
		</div>

		<!-- Shared details (collapsed disclosure) -->
		<details class="group rounded-[var(--radius-md)] border bg-card mb-4" open={shouldExpandDetails}>
			<summary class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none">
				<div class="min-w-0">
					<span class="text-sm font-semibold">More details</span>
					<p class="text-xs text-muted-foreground mt-0.5 truncate">
						{#if $form.fundId}Fund · {/if}
						{#if hasMultipleMembers && $form.paidBy}Paid by · {/if}
						{paymentTypes.find((p) => p.value === $form.paymentType)?.label ?? $form.paymentType}
						· {$form.date ? new Date($form.date).toLocaleString(undefined, { month: 'short', day: 'numeric' }) : 'now'}
					</p>
				</div>
				<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>

			<div class="px-4 pb-4 space-y-5 border-t pt-4">
				<!-- Payment Type (compact) -->
				<div class="space-y-2">
					<Label>Payment</Label>
					<div class="flex flex-wrap gap-1.5">
						{#each primaryPayments as pt}
							{@const active = $form.paymentType === pt.value}
							<button
								type="button"
								onclick={() => ($form.paymentType = pt.value)}
								disabled={isLoading}
								class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
							>
								<span>{pt.icon}</span>
								{pt.label}
							</button>
						{/each}
						{#if !showMorePayments}
							<button
								type="button"
								onclick={() => (showMorePayments = true)}
								disabled={isLoading}
								class="inline-flex items-center gap-1 px-3 h-9 rounded-[var(--radius-sm)] border border-dashed border-border text-sm text-muted-foreground hover:bg-muted"
							>
								<ChevronDown class="size-3.5" />
								More
							</button>
						{:else}
							{#each morePayments as pt}
								{@const active = $form.paymentType === pt.value}
								<button
									type="button"
									onclick={() => ($form.paymentType = pt.value)}
									disabled={isLoading}
									class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
								>
									<span>{pt.icon}</span>
									{pt.label}
								</button>
							{/each}
						{/if}
					</div>
					{#if $errors.paymentType}
						<p class="text-sm text-destructive">{$errors.paymentType}</p>
					{/if}
				</div>

				<!-- Paid By (hidden for solo vaults) -->
				{#if hasMultipleMembers}
					<div class="space-y-2">
						<Label>Paid by</Label>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => ($form.paidBy = '')}
								disabled={isLoading}
								class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {!$form.paidBy ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
							>
								— None
							</button>
							{#each data.members as member}
								{@const active = $form.paidBy === member.userId}
								<button
									type="button"
									onclick={() => ($form.paidBy = member.userId)}
									disabled={isLoading}
									class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 max-w-[12rem] {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
									title={member.displayName}
								>
									<span class="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold shrink-0">
										{member.displayName.charAt(0).toUpperCase()}
									</span>
									<span class="truncate">{member.displayName}</span>
								</button>
							{/each}
						</div>
						{#if $errors.paidBy}
							<p class="text-sm text-destructive">{$errors.paidBy}</p>
						{/if}
					</div>
				{/if}

				<!-- Date -->
				<div class="space-y-2">
					<Label for="date">Date &amp; time</Label>
					<DateTimePicker
						id="date"
						name="date"
						bind:value={$form.date}
						disabled={isLoading}
						class={$errors.date ? 'border border-destructive rounded-md' : ''}
					/>
					{#if $errors.date}
						<p class="text-sm text-destructive">{$errors.date}</p>
					{/if}
				</div>

				<!-- Fund -->
				{#if data.funds && data.funds.length > 0}
					<div class="space-y-2">
						<Label>Fund <span class="text-xs text-muted-foreground font-normal">(optional)</span></Label>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => ($form.fundId = null)}
								disabled={isLoading}
								class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors {!$form.fundId ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
							>
								None
							</button>
							{#each data.funds as fund}
								{@const active = $form.fundId === fund.id}
								<button
									type="button"
									onclick={() => ($form.fundId = fund.id)}
									disabled={isLoading}
									class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors max-w-[14rem] {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
									title={fund.name}
								>
									<span>{fund.icon ?? '💰'}</span>
									<span class="truncate">{fund.name}</span>
								</button>
							{/each}
						</div>
					</div>

					{#if $form.fundId}
						<div class="space-y-2">
							<Label>Fund payment mode</Label>
							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									onclick={() => ($form.fundPaymentMode = 'paid_by_fund')}
									disabled={isLoading}
									class="rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors {$form.fundPaymentMode === 'paid_by_fund' ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}"
								>
									Paid by fund
								</button>
								<button
									type="button"
									onclick={() => ($form.fundPaymentMode = 'pending_reimbursement')}
									disabled={isLoading}
									class="rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors {$form.fundPaymentMode === 'pending_reimbursement' ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}"
								>
									Pending reimbursement
								</button>
							</div>
						</div>
					{/if}
				{/if}

				<!-- Shared tags — applied to every expense in this batch -->
				<TagPicker
					label="Tags (applied to all items)"
					tags={availableTags}
					bind:value={sharedTagIds}
					onCreate={handleCreateTag}
					disabled={isLoading}
				/>
			</div>
		</details>
	</div>

	<!-- Sticky bottom action bar -->
	<div class="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-30">
		<div class="container mx-auto px-4 py-3 flex gap-2">
			<Button type="button" variant="outline" onclick={handleBack} disabled={isLoading}>
				Cancel
			</Button>
			<Button type="button" onclick={handleSubmit} disabled={isLoading} class="flex-1">
				{#if isLoading}
					<Loader2 class="size-4 animate-spin" />
					Saving...
				{:else if rows.length === 1}
					Save
				{:else}
					Save {rows.length} items
				{/if}
			</Button>
		</div>
	</div>
</div>

<ScanScreenshotModal
	open={scanModal.open}
	loading={scanLoading}
	result={scanResult}
	bind:items={scanReviewItems}
	vaultCurrency={vaultCurrency}
	availableSlots={scanAvailableSlots}
	templates={data.templates ?? []}
	defaultTemplateId={data.templateId ?? null}
	formatCurrency={(n) => scanFormatter.format(n)}
	onApply={applyScannedItems}
	onCancel={cancelScanModal}
/>

{#if duplicatePrompt.open}
	<div
		class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
		role="dialog"
		aria-modal="true"
		aria-labelledby="dup-prompt-title"
	>
		<div class="w-full max-w-md rounded-[var(--radius-md)] bg-popover text-popover-foreground border shadow-lg p-5 space-y-4">
			<div>
				<h2 id="dup-prompt-title" class="text-base font-semibold">Looks like a duplicate?</h2>
				<p class="text-sm text-muted-foreground mt-1">
					{#if duplicateMatches.length === 1}
						An unidentified charge with the same amount was logged near this date. Claim it instead of creating a new one?
					{:else}
						Several unidentified charges with the same amount were logged near this date. Claim one of them?
					{/if}
				</p>
			</div>

			<ul class="space-y-2">
				{#each duplicateMatches as match (match.id)}
					<li class="border rounded-[var(--radius-sm)] p-3 flex items-center justify-between gap-3">
						<div class="text-sm min-w-0">
							<p class="font-mono">
								{new Intl.NumberFormat(undefined, {
									style: 'currency',
									currency: data.vault?.currency || 'USD',
								}).format(match.amount)}
							</p>
							<p class="text-xs text-muted-foreground">
								{new Date(match.date).toLocaleDateString(undefined, {
									month: 'short',
									day: 'numeric',
									year: 'numeric',
								})}
								{#if match.paidByName}· {match.paidByName}{/if}
							</p>
						</div>
						<Button size="sm" onclick={() => claimMatch(match)} disabled={isLoading}>
							Claim
						</Button>
					</li>
				{/each}
			</ul>

			<div class="flex items-center justify-end gap-2 pt-1">
				<Button variant="ghost" onclick={dismissDuplicatePrompt} disabled={isLoading}>
					Cancel
				</Button>
				<Button variant="outline" onclick={proceedAsNewFromPrompt} disabled={isLoading}>
					Create new
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	details > summary::-webkit-details-marker {
		display: none;
	}
</style>

<Toaster />
