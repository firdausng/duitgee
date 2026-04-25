import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    spendTrendQuerySchema,
    categoryTrendQuerySchema,
    breakdownQuerySchema,
    memberBreakdownQuerySchema,
    dashboardQuerySchema,
} from '$lib/schemas/statistics';
import { getSpendTrend } from './getSpendTrendHandler';
import { getCategoryTrend } from './getCategoryTrendHandler';
import { getCategoryBreakdown } from './getCategoryBreakdownHandler';
import { getMemberBreakdown } from './getMemberBreakdownHandler';
import { getPaymentTypeBreakdown } from './getPaymentTypeBreakdownHandler';
import { getFundSpendTrend } from './getFundSpendTrendHandler';
import { getTemplateBreakdown } from './getTemplateBreakdownHandler';
import { getStatisticsDashboard } from './getStatisticsDashboardHandler';

const STATS_TAG = ['Statistics'];
const commonConfig = { tags: STATS_TAG };

const handle = async <T>(c: { json: (body: unknown, status?: number) => Response }, fn: () => Promise<T>) => {
    try {
        const data = await fn();
        return c.json({ success: true, data });
    } catch (error) {
        console.error({ message: 'Statistics handler error', error });
        const status = error instanceof Error && error.message.toLowerCase().includes('access') ? 403 : 400;
        return c.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            status,
        );
    }
};

export const statisticsApi = new Hono<App.Api>()
    .get(
        '/getStatisticsDashboard',
        describeRoute({
            ...commonConfig,
            description: 'Composite endpoint — returns every statistics section in one round-trip.',
            responses: {
                200: { description: 'Dashboard payload', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', dashboardQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () =>
                getStatisticsDashboard(query.vaultId, session, c.env, {
                    vaultId: query.vaultId,
                    start: query.start,
                    end: query.end,
                    compare: query.compare,
                    granularity: query.granularity,
                    includeNetPosition: query.includeNetPosition,
                    topN: query.topN,
                }),
            );
        },
    )
    .get(
        '/getSpendTrend',
        describeRoute({
            ...commonConfig,
            description: 'Spend trend over time, optionally with previous-period comparison.',
            responses: {
                200: { description: 'Trend data', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', spendTrendQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getSpendTrend(query.vaultId, session, c.env, query));
        },
    )
    .get(
        '/getCategoryTrend',
        describeRoute({
            ...commonConfig,
            description: 'Top-N category spending over time, with "Other" rollup.',
            responses: {
                200: { description: 'Category trend', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', categoryTrendQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getCategoryTrend(query.vaultId, session, c.env, query));
        },
    )
    .get(
        '/getCategoryBreakdown',
        describeRoute({
            ...commonConfig,
            description: 'Total spend per category for a date range.',
            responses: {
                200: { description: 'Category breakdown', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', breakdownQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getCategoryBreakdown(query.vaultId, session, c.env, query));
        },
    )
    .get(
        '/getMemberBreakdown',
        describeRoute({
            ...commonConfig,
            description: 'Total spend per member, optionally with net-position math (Pro).',
            responses: {
                200: { description: 'Member breakdown', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', memberBreakdownQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getMemberBreakdown(query.vaultId, session, c.env, query));
        },
    )
    .get(
        '/getPaymentTypeBreakdown',
        describeRoute({
            ...commonConfig,
            description: 'Total spend per payment type for a date range.',
            responses: {
                200: { description: 'Payment-type breakdown', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', breakdownQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getPaymentTypeBreakdown(query.vaultId, session, c.env, query));
        },
    )
    .get(
        '/getTemplateBreakdown',
        describeRoute({
            ...commonConfig,
            description: 'Total spend per expense template for a date range.',
            responses: {
                200: { description: 'Template breakdown', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', breakdownQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getTemplateBreakdown(query.vaultId, session, c.env, query));
        },
    )
    .get(
        '/getFundSpendTrend',
        describeRoute({
            ...commonConfig,
            description: 'Per-fund spend over time as small-multiples sparklines.',
            responses: {
                200: { description: 'Fund spend trend', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', spendTrendQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getFundSpendTrend(query.vaultId, session, c.env, query));
        },
    );
