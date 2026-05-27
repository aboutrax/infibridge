import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project, convexService, dokployService, infisicalEnv } from '$lib/server/db/schema';
import { encrypt } from '$lib/server/crypto';
import { eq, isNotNull } from 'drizzle-orm';
import postgres from 'postgres';
import { hasPermission } from '$lib/permission-check';
import { listConvexEnvVars } from '$lib/server/convex';
import { verifyInfisicalCredentials } from '$lib/server/infisical';
import type { DokployAppType } from '$lib/dokploy';
import { verifyDokployCredentials } from '$lib/server/dokploy';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.user) return redirect(302, '/');

    const roles = locals.user.role ?? '';
    const canListConvex = hasPermission(roles, 'convexService', 'list');
    const canListDokploy = hasPermission(roles, 'dokployService', 'list');

    if (!canListConvex && !canListDokploy) {
        return redirect(302, '/workspace/dashboard');
    }

    const [projectRecord, convexServices, dokployServices, envs] = await Promise.all([
        db.select()
            .from(project)
            .where(eq(project.id, params.projectId))
            .limit(1)
            .then((r) => r[0]),

        canListConvex
            ? db.select({
                id: convexService.id,
                name: convexService.name,
                convexUrl: convexService.convexUrl,
                infisicalUrl: convexService.infisicalUrl,
                infisicalProjectId: convexService.infisicalProjectId,
                infisicalSecretPath: convexService.infisicalSecretPath,
                activatedAt: convexService.activatedAt,
                createdAt: convexService.createdAt,
                envName: infisicalEnv.name,
                envSlug: infisicalEnv.environment,
            })
                .from(convexService)
                .leftJoin(infisicalEnv, eq(convexService.infisicalEnvId, infisicalEnv.id))
                .where(eq(convexService.projectId, params.projectId))
                .orderBy(convexService.createdAt)
            : Promise.resolve([]),

        canListDokploy
            ? db.select({
                id: dokployService.id,
                name: dokployService.name,
                dokployUrl: dokployService.dokployUrl,
                dokployAppId: dokployService.dokployAppId,
                dokployAppType: dokployService.dokployAppType,
                infisicalUrl: dokployService.infisicalUrl,
                infisicalProjectId: dokployService.infisicalProjectId,
                infisicalSecretPath: dokployService.infisicalSecretPath,
                activatedAt: dokployService.activatedAt,
                createdAt: dokployService.createdAt,
                envName: infisicalEnv.name,
                envSlug: infisicalEnv.environment,
            })
                .from(dokployService)
                .leftJoin(infisicalEnv, eq(dokployService.infisicalEnvId, infisicalEnv.id))
                .where(eq(dokployService.projectId, params.projectId))
                .orderBy(dokployService.createdAt)
            : Promise.resolve([]),

        db.select({
            id: infisicalEnv.id,
            name: infisicalEnv.name,
            environment: infisicalEnv.environment,
        })
            .from(infisicalEnv)
            .where(isNotNull(infisicalEnv.activatedAt))
            .orderBy(infisicalEnv.name),
    ]);

    if (!projectRecord) return redirect(302, '/workspace/project');

    return { project: projectRecord, convexServices, dokployServices, envs };
};

export const actions: Actions = {
    createConvex: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'convexService', 'create')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const name = data.get('name')?.toString() ?? '';
        const convexUrl = data.get('convex_url')?.toString() ?? '';
        const convexDeployKey = data.get('convex_deploy_key')?.toString() ?? '';
        const infisicalUrl = data.get('infisical_url')?.toString() ?? '';
        const infisicalClientId = data.get('infisical_client_id')?.toString() ?? '';
        const infisicalClientSecret = data.get('infisical_client_secret')?.toString() ?? '';
        const infisicalProjectId = data.get('infisical_project_id')?.toString() ?? '';
        const infisicalSecretPath = data.get('infisical_secret_path')?.toString() || '/';
        const infisicalEnvId = data.get('infisical_env_id')?.toString() ?? '';
        const webhookSecret = data.get('webhook_secret')?.toString() ?? '';

        if (
            !name || !convexUrl || !convexDeployKey || !infisicalUrl ||
            !infisicalClientId || !infisicalClientSecret ||
            !infisicalProjectId || !infisicalEnvId || !webhookSecret
        ) {
            return fail(400, { action: 'createConvex', message: 'All fields are required.' });
        }

        const envRecord = await db
            .select({ environment: infisicalEnv.environment })
            .from(infisicalEnv)
            .where(eq(infisicalEnv.id, infisicalEnvId))
            .limit(1)
            .then((r) => r[0]);

        if (!envRecord) {
            return fail(400, { action: 'createConvex', message: 'Selected environment not found.' });
        }

        try {
            await verifyInfisicalCredentials(
                infisicalUrl, infisicalClientId, infisicalClientSecret,
                infisicalProjectId, envRecord.environment, infisicalSecretPath
            );
        } catch {
            return fail(422, {
                action: 'createConvex',
                message: 'Could not connect to Infisical. Please check your credentials.',
            });
        }

        try {
            await listConvexEnvVars(convexUrl, convexDeployKey);
        } catch {
            return fail(422, {
                action: 'createConvex',
                message: 'Could not connect to Convex. Please check your URL and deploy key.',
            });
        }

        try {
            await db.insert(convexService).values({
                name,
                projectId: params.projectId,
                convexUrl,
                convexDeployKey: encrypt(convexDeployKey),
                infisicalUrl,
                infisicalClientId: encrypt(infisicalClientId),
                infisicalClientSecret: encrypt(infisicalClientSecret),
                infisicalProjectId,
                infisicalSecretPath,
                infisicalEnvId,
                webhookSecret: encrypt(webhookSecret),
                activatedAt: new Date(),
            });
        } catch (e) {
            const cause = e instanceof Error ? e.cause : e;
            if (cause instanceof postgres.PostgresError && cause.code === '23505') {
                switch (cause.constraint_name) {
                    case 'convex_service_infisical_project_env_path_unique':
                        return fail(409, {
                            action: 'createConvex',
                            message: 'A bridge for this Infisical project, environment and secret path already exists.',
                        });
                    default:
                        return fail(409, { action: 'createConvex', message: 'A duplicate entry already exists.' });
                }
            }
            console.error('Unexpected error creating convex service:', e);
            return fail(500, { action: 'createConvex', message: 'An unexpected error occurred. Please try again.' });
        }

        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    deleteConvex: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'convexService', 'delete')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { action: '', message: 'Missing id.' });

        await db.delete(convexService).where(eq(convexService.id, id));
        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    activateConvex: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'convexService', 'update')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { action: '', message: 'Missing id.' });

        await db.update(convexService)
            .set({ activatedAt: new Date(), updatedAt: new Date() })
            .where(eq(convexService.id, id));
        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    deactivateConvex: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'convexService', 'update')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { action: '', message: 'Missing id.' });

        await db.update(convexService)
            .set({ activatedAt: null, updatedAt: new Date() })
            .where(eq(convexService.id, id));
        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    createDokploy: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'dokployService', 'create')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const name = data.get('name')?.toString() ?? '';
        const dokployUrl = data.get('dokploy_url')?.toString() ?? '';
        const dokployApiToken = data.get('dokploy_api_token')?.toString() ?? '';
        const dokployAppId = data.get('dokploy_app_id')?.toString() ?? '';
        const dokployAppType = (data.get('dokploy_app_type')?.toString() ?? 'application') as DokployAppType;
        const infisicalUrl = data.get('infisical_url')?.toString() ?? '';
        const infisicalClientId = data.get('infisical_client_id')?.toString() ?? '';
        const infisicalClientSecret = data.get('infisical_client_secret')?.toString() ?? '';
        const infisicalProjectId = data.get('infisical_project_id')?.toString() ?? '';
        const infisicalSecretPath = data.get('infisical_secret_path')?.toString() || '/';
        const infisicalEnvId = data.get('infisical_env_id')?.toString() ?? '';
        const webhookSecret = data.get('webhook_secret')?.toString() ?? '';

        if (
            !name || !dokployUrl || !dokployApiToken || !dokployAppId ||
            !infisicalUrl || !infisicalClientId || !infisicalClientSecret ||
            !infisicalProjectId || !infisicalEnvId || !webhookSecret
        ) {
            return fail(400, { action: 'createDokploy', message: 'All fields are required.' });
        }

        if (!['application', 'compose'].includes(dokployAppType)) {
            return fail(400, { action: 'createDokploy', message: 'Invalid app type.' });
        }

        const envRecord = await db
            .select({ environment: infisicalEnv.environment })
            .from(infisicalEnv)
            .where(eq(infisicalEnv.id, infisicalEnvId))
            .limit(1)
            .then((r) => r[0]);

        if (!envRecord) {
            return fail(400, { action: 'createDokploy', message: 'Selected environment not found.' });
        }

        try {
            await verifyInfisicalCredentials(
                infisicalUrl, infisicalClientId, infisicalClientSecret,
                infisicalProjectId, envRecord.environment, infisicalSecretPath
            );
        } catch {
            return fail(422, {
                action: 'createDokploy',
                message: 'Could not connect to Infisical. Please check your credentials.',
            });
        }

        try {
            await verifyDokployCredentials(dokployUrl, dokployApiToken, dokployAppId, dokployAppType);
        } catch (e) {
            const code = e instanceof Error ? e.message : 'UNKNOWN';
            const message =
                code === 'UNREACHABLE' ? 'Could not reach the Dokploy instance. Check the URL.' :
                    code === 'UNAUTHORIZED' ? 'Dokploy rejected the API token. Check your credentials.' :
                        code === 'NOT_FOUND' ? `No ${dokployAppType} found with that ID in Dokploy.` :
                            'Could not verify Dokploy credentials. Please try again.';
            return fail(422, { action: 'createDokploy', message });
        }

        try {
            await db.insert(dokployService).values({
                name,
                projectId: params.projectId,
                dokployUrl,
                dokployApiToken: encrypt(dokployApiToken),
                dokployAppId,
                dokployAppType,
                infisicalUrl,
                infisicalClientId: encrypt(infisicalClientId),
                infisicalClientSecret: encrypt(infisicalClientSecret),
                infisicalProjectId,
                infisicalSecretPath,
                infisicalEnvId,
                webhookSecret: encrypt(webhookSecret),
                activatedAt: new Date(),
            });
        } catch (e) {
            const cause = e instanceof Error ? e.cause : e;
            if (cause instanceof postgres.PostgresError && cause.code === '23505') {
                switch (cause.constraint_name) {
                    case 'dokploy_service_infisical_project_env_path_unique':
                        return fail(409, {
                            action: 'createDokploy',
                            message: 'A bridge for this Infisical project, environment and secret path already exists.',
                        });
                    default:
                        return fail(409, { action: 'createDokploy', message: 'A duplicate entry already exists.' });
                }
            }
            console.error('Unexpected error creating dokploy service:', e);
            return fail(500, { action: 'createDokploy', message: 'An unexpected error occurred. Please try again.' });
        }

        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    deleteDokploy: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'dokployService', 'delete')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { action: '', message: 'Missing id.' });

        await db.delete(dokployService).where(eq(dokployService.id, id));
        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    activateDokploy: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'dokployService', 'update')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { action: '', message: 'Missing id.' });

        await db.update(dokployService)
            .set({ activatedAt: new Date(), updatedAt: new Date() })
            .where(eq(dokployService.id, id));
        return redirect(302, `/workspace/project/${params.projectId}`);
    },

    deactivateDokploy: async ({ request, locals, params }) => {
        if (!locals.user) return fail(401, { action: '', message: 'Unauthorized' });
        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'dokployService', 'update')) {
            return fail(403, { action: '', message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { action: '', message: 'Missing id.' });

        await db.update(dokployService)
            .set({ activatedAt: null, updatedAt: new Date() })
            .where(eq(dokployService.id, id));
        return redirect(302, `/workspace/project/${params.projectId}`);
    },
};