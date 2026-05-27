import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { db } from '$lib/server/db';
import { convexService, infisicalEnv } from '$lib/server/db/schema';
import { decrypt } from '$lib/server/crypto';
import { eq, and } from 'drizzle-orm';
import { InfisicalSDK } from '@infisical/sdk';
import { verifyInfisicalSignature } from '$lib/server/infisical';
import { listConvexEnvVars, updateConvexEnvVars, deleteConvexEnvVars } from '$lib/server/convex';

export const POST: RequestHandler = async ({ params, request }) => {
    // 1. Fetch the exact bridge matching projectId + environment + secretPath
    const secretPath = '/' + (params.secretPath ?? '');

    const result = await db
        .select({
            service: convexService,
            env: infisicalEnv,
        })
        .from(convexService)
        .leftJoin(infisicalEnv, eq(convexService.infisicalEnvId, infisicalEnv.id))
        .where(
            and(
                eq(convexService.infisicalProjectId, params.projectId),
                eq(infisicalEnv.environment, params.environment),
                eq(convexService.infisicalSecretPath, secretPath)
            )
        )
        .limit(1)
        .then((r) => r[0]);

    if (!result) {
        console.error(`[convex-webhook] Service not found for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(404, 'Service not found');
    }
    if (!result.env) {
        console.error(`[convex-webhook] Service has no environment configured for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(500, 'Service has no environment configured');
    }
    if (!result.service.activatedAt) {
        console.error(`[convex-webhook] Service is inactive for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(403, 'Service is not active');
    }

    const { service, env } = result;

    // 2. Verify signature
    const signature = request.headers.get('x-infisical-signature');
    if (!signature) {
        console.error(`[convex-webhook] Missing signature for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(401, 'Missing signature');
    }

    const rawBody = await request.text();
    const secret = decrypt(service.webhookSecret);

    if (!verifyInfisicalSignature(rawBody, signature, secret)) {
        console.error(`[convex-webhook] Invalid signature for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(401, 'Invalid signature');
    }

    // 3. Parse and validate payload
    const payload = JSON.parse(rawBody);

    if (payload.project?.projectId !== params.projectId) {
        console.error(`[convex-webhook] Project ID mismatch: expected="${params.projectId}" got="${payload.project?.projectId}"`);
        throw error(400, 'Project ID mismatch');
    }

    if (payload.project?.environment !== params.environment) {
        console.error(`[convex-webhook] Environment mismatch: expected="${params.environment}" got="${payload.project?.environment}"`);
        throw error(400, 'Environment mismatch');
    }

    if (payload.project?.secretPath !== secretPath) {
        console.error(`[convex-webhook] Secret path mismatch: expected="${secretPath}" got="${payload.project?.secretPath}"`);
        throw error(400, 'Secret path mismatch');
    }

    const deployKey = decrypt(service.convexDeployKey);

    // 4. Fetch secrets from Infisical + current Convex env vars in parallel
    const client = new InfisicalSDK({ siteUrl: service.infisicalUrl });
    await client.auth().universalAuth.login({
        clientId: decrypt(service.infisicalClientId),
        clientSecret: decrypt(service.infisicalClientSecret),
    });

    const [{ secrets }, existingVars] = await Promise.all([
        client.secrets().listSecrets({
            projectId: params.projectId,
            environment: env.environment,
            secretPath: service.infisicalSecretPath,
            expandSecretReferences: true,
        }),
        listConvexEnvVars(service.convexUrl, deployKey),
    ]);

    console.log(`[convex-webhook] Fetched ${secrets.length} secrets from Infisical env="${env.environment}" path="${service.infisicalSecretPath}" service="${service.name}"`);

    // 5. Build lookup maps
    const existingMap = new Map(existingVars.map((v) => [v.name, v.value]));
    const incomingMap = new Map(secrets.map((s) => [s.secretKey, s.secretValue]));

    const toUpsert = secrets
        .filter((s) => existingMap.get(s.secretKey) !== s.secretValue)
        .map((s) => ({ name: s.secretKey, value: s.secretValue }));

    const toDelete = existingVars
        .filter((v) => !incomingMap.has(v.name))
        .map((v) => v.name);

    // 6. Apply changes
    if (toUpsert.length > 0) {
        await updateConvexEnvVars(service.convexUrl, deployKey, toUpsert);
        console.log(`[convex-webhook] Upserted ${toUpsert.length} env vars: ${toUpsert.map((v) => v.name).join(', ')}`);
    } else {
        console.log('[convex-webhook] No env var changes to upsert');
    }

    if (toDelete.length > 0) {
        await deleteConvexEnvVars(service.convexUrl, deployKey, toDelete);
        console.log(`[convex-webhook] Deleted ${toDelete.length} env vars: ${toDelete.join(', ')}`);
    } else {
        console.log('[convex-webhook] No env vars to delete');
    }

    return json({
        ok: true,
        upserted: toUpsert.length,
        deleted: toDelete.length,
        unchanged: secrets.length - toUpsert.length,
    });
};