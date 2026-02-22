import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    createFundSchema,
    updateFundSchema,
    archiveFundSchema,
    topUpFundSchema,
    deductFundSchema,
    getFundsQuerySchema,
    getFundQuerySchema,
    getFundCyclesQuerySchema,
    getFundTransactionsQuerySchema,
    getPendingReimbursementsQuerySchema,
    getVaultPendingReimbursementsQuerySchema,
    settleReimbursementsSchema,
    settleVaultReimbursementsSchema,
    transferFundsSchema,
} from '$lib/schemas/funds';
import { getFunds } from './getFundsHandler';
import { getFund } from './getFundHandler';
import { createFund } from './createFundHandler';
import { updateFund } from './updateFundHandler';
import { archiveFund } from './archiveFundHandler';
import { topUpFund } from './topUpFundHandler';
import { deductFund } from './deductFundHandler';
import { getFundCycles } from './getFundCyclesHandler';
import { getFundTransactions } from './getFundTransactionsHandler';
import { getPendingReimbursements } from './getPendingReimbursementsHandler';
import { settleReimbursements } from './settleReimbursementsHandler';
import { getVaultPendingReimbursements } from './getVaultPendingReimbursementsHandler';
import { settleVaultReimbursements } from './settleVaultReimbursementsHandler';
import { transferFunds } from './transferFundsHandler';

const FUND_TAG = ['Fund'];
const commonFundConfig = { tags: FUND_TAG };

export const fundsApi = new Hono<App.Api>()
    // ── Queries ────────────────────────────────────────────────────────────

    .get(
        '/getFunds',
        describeRoute({
            ...commonFundConfig,
            description: 'List all funds in a vault',
            responses: {
                200: {
                    description: 'Successful response',
                    content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.array(v.any()) })) } },
                },
            },
        }),
        vValidator('query', getFundsQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId } = c.req.valid('query');
            try {
                const data = await getFunds(vaultId, session, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get funds' }, status);
            }
        },
    )

    .get(
        '/getFund',
        describeRoute({
            ...commonFundConfig,
            description: 'Get a single fund by id',
            responses: {
                200: { description: 'Successful response', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('query', getFundQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, id } = c.req.valid('query');
            try {
                const data = await getFund(vaultId, id, session, c.env);
                if (!data) return c.json({ success: false, error: 'Fund not found' }, 404);
                return c.json({ success: true, data });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get fund' }, status);
            }
        },
    )

    .get(
        '/getFundCycles',
        describeRoute({
            ...commonFundConfig,
            description: 'List cycles for a fund. Past cycles require the fund:cycle_history entitlement.',
            responses: {
                200: { description: 'Successful response', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
            },
        }),
        vValidator('query', getFundCyclesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { fundId, vaultId, page, limit } = c.req.valid('query');
            try {
                const data = await getFundCycles(fundId, vaultId, session, c.env, { page, limit });
                return c.json({ success: true, data });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get cycles' }, status);
            }
        },
    )

    .get(
        '/getFundTransactions',
        describeRoute({
            ...commonFundConfig,
            description: 'List transactions for a fund with optional type filter.',
            responses: {
                200: { description: 'Successful response', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('query', getFundTransactionsQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, fundId, page, limit, types } = c.req.valid('query');
            const typesArray = types ? types.split(',').filter(Boolean) : undefined;
            try {
                const data = await getFundTransactions(vaultId, fundId, session, c.env, { page, limit, types: typesArray });
                return c.json({ success: true, data });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404
                    : error instanceof Error && error.message.includes('denied') ? 403
                    : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get transactions' }, status);
            }
        },
    )

    // ── Commands ───────────────────────────────────────────────────────────

    .post(
        '/createFund',
        describeRoute({
            ...commonFundConfig,
            description: 'Create a fund with its policy. First cycle is opened immediately.',
            responses: {
                201: { description: 'Fund created', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
            },
        }),
        vValidator('json', createFundSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await createFund(session, data, c.env);
                return c.json({ success: true, data: result }, 201);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('denied') ? 403 : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create fund' }, status);
            }
        },
    )

    .post(
        '/updateFund',
        describeRoute({
            ...commonFundConfig,
            description: 'Update fund name, description, or appearance',
            responses: {
                200: { description: 'Fund updated', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('json', updateFundSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await updateFund(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404
                    : error instanceof Error && error.message.includes('denied') ? 403
                    : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update fund' }, status);
            }
        },
    )

    .post(
        '/archiveFund',
        describeRoute({
            ...commonFundConfig,
            description: 'Archive a fund. Closes the active cycle. Existing expenses are preserved.',
            responses: {
                200: { description: 'Fund archived', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('json', archiveFundSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await archiveFund(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404
                    : error instanceof Error && error.message.includes('denied') ? 403
                    : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to archive fund' }, status);
            }
        },
    )

    .post(
        '/topUpFund',
        describeRoute({
            ...commonFundConfig,
            description: 'Add money to a fund. Lazily rolls over the cycle if expired.',
            responses: {
                200: { description: 'Top-up recorded', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('json', topUpFundSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await topUpFund(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404
                    : error instanceof Error && error.message.includes('denied') ? 403
                    : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to top up fund' }, status);
            }
        },
    )

    .post(
        '/deductFund',
        describeRoute({
            ...commonFundConfig,
            description: 'Deduct money from a fund balance. Blocked if it would result in a negative balance.',
            responses: {
                200: { description: 'Deduction recorded', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('json', deductFundSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await deductFund(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404
                    : error instanceof Error && error.message.includes('denied') ? 403
                    : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to deduct from fund' }, status);
            }
        },
    )

    // ── Reimbursements ─────────────────────────────────────────────────────

    .get(
        '/getPendingReimbursements',
        describeRoute({
            ...commonFundConfig,
            description: 'List pending reimbursements for a single fund',
            responses: {
                200: { description: 'Successful response', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                404: { description: 'Fund not found' },
            },
        }),
        vValidator('query', getPendingReimbursementsQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { fundId, vaultId } = c.req.valid('query');
            try {
                const data = await getPendingReimbursements(fundId, vaultId, session, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404
                    : error instanceof Error && error.message.includes('denied') ? 403
                    : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get pending reimbursements' }, status);
            }
        },
    )

    .get(
        '/getVaultPendingReimbursements',
        describeRoute({
            ...commonFundConfig,
            description: 'List pending reimbursements across all funds in a vault. Requires fund:cross_fund_reimbursement entitlement.',
            responses: {
                200: { description: 'Successful response', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                403: { description: 'Entitlement denied' },
            },
        }),
        vValidator('query', getVaultPendingReimbursementsQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId } = c.req.valid('query');
            try {
                const data = await getVaultPendingReimbursements(vaultId, session, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const status = error instanceof Error && error.message.includes('denied') ? 403 : 500;
                return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get vault pending reimbursements' }, status);
            }
        },
    )

    .post(
        '/settleReimbursements',
        describeRoute({
            ...commonFundConfig,
            description: 'Bulk settle pending reimbursements within a single fund. Pre-validates balance before committing.',
            responses: {
                200: { description: 'Settled', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                400: { description: 'Validation failed (insufficient balance or invalid transactions)' },
                403: { description: 'Permission denied' },
            },
        }),
        vValidator('json', settleReimbursementsSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await settleReimbursements(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to settle reimbursements';
                const status = msg.includes('denied') ? 403
                    : msg.includes('Insufficient') || msg.includes('not found') || msg.includes('Some transactions') ? 400
                    : 500;
                return c.json({ success: false, error: msg }, status);
            }
        },
    )

    .post(
        '/settleVaultReimbursements',
        describeRoute({
            ...commonFundConfig,
            description: 'Bulk settle pending reimbursements across multiple funds. Requires fund:cross_fund_reimbursement entitlement. All succeed or all fail.',
            responses: {
                200: { description: 'Settled', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                400: { description: 'Validation failed (insufficient balance in one or more funds)' },
                403: { description: 'Entitlement or permission denied' },
            },
        }),
        vValidator('json', settleVaultReimbursementsSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await settleVaultReimbursements(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to settle vault reimbursements';
                const status = msg.includes('denied') ? 403
                    : msg.includes('validation failed') || msg.includes('Insufficient') || msg.includes('Some transactions') ? 400
                    : 500;
                return c.json({ success: false, error: msg }, status);
            }
        },
    )

    // ── Transfers ──────────────────────────────────────────────────────────

    .post(
        '/transferFunds',
        describeRoute({
            ...commonFundConfig,
            description: 'Transfer balance between two funds in the same vault. Requires fund:transfer entitlement. Atomic via D1 batch.',
            responses: {
                200: { description: 'Transfer completed', content: { 'application/json': { schema: resolver(v.object({ success: v.boolean(), data: v.any() })) } } },
                400: { description: 'Validation failed (same fund, insufficient balance, archived source)' },
                403: { description: 'Entitlement or permission denied' },
                404: { description: 'Source or destination fund not found' },
            },
        }),
        vValidator('json', transferFundsSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await transferFunds(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Failed to transfer funds';
                const status = msg.includes('denied') ? 403
                    : msg.includes('not found') ? 404
                    : msg.includes('Insufficient') || msg.includes('different') || msg.includes('archived') ? 400
                    : 500;
                return c.json({ success: false, error: msg }, status);
            }
        },
    );
