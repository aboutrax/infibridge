import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { db } from '$lib/server/db';
import { dokployService, infisicalEnv } from '$lib/server/db/schema';
import { decrypt } from '$lib/server/crypto';
import { eq, and } from 'drizzle-orm';
import { InfisicalSDK } from '@infisical/sdk';
import { verifyInfisicalSignature } from '$lib/server/infisical';
import { getDokployEnv, saveDokployEnv, parseDotenv, serializeDotenv } from '$lib/server/dokploy';

export const POST: RequestHandler = async ({ params, request }) => {
    // 1. Fetch the exact bridge matching projectId + environment + secretPath
    const secretPath = '/' + (params.secretPath ?? '');

    const result = await db
        .select({
            service: dokployService,
            env: infisicalEnv,
        })
        .from(dokployService)
        .leftJoin(infisicalEnv, eq(dokployService.infisicalEnvId, infisicalEnv.id))
        .where(
            and(
                eq(dokployService.infisicalProjectId, params.projectId),
                eq(infisicalEnv.environment, params.environment),
                eq(dokployService.infisicalSecretPath, secretPath)
            )
        )
        .limit(1)
        .then((r) => r[0]);

    if (!result) {
        console.error(`[dokploy-webhook] Service not found for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(404, 'Service not found');
    }
    if (!result.env) {
        console.error(`[dokploy-webhook] Service has no environment configured for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(500, 'Service has no environment configured');
    }
    if (!result.service.activatedAt) {
        console.error(`[dokploy-webhook] Service is inactive for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(403, 'Service is not active');
    }

    const { service, env } = result;

    // 2. Verify signature
    const signature = request.headers.get('x-infisical-signature');
    if (!signature) {
        console.error(`[dokploy-webhook] Missing signature for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(401, 'Missing signature');
    }

    const rawBody = await request.text();
    const secret = decrypt(service.webhookSecret);

    if (!verifyInfisicalSignature(rawBody, signature, secret)) {
        console.error(`[dokploy-webhook] Invalid signature for project="${params.projectId}" env="${params.environment}" secretPath="${secretPath}"`);
        throw error(401, 'Invalid signature');
    }

    // 3. Parse and validate payload
    const payload = JSON.parse(rawBody);

    if (payload.project?.projectId !== params.projectId) {
        console.error(`[dokploy-webhook] Project ID mismatch: expected="${params.projectId}" got="${payload.project?.projectId}"`);
        throw error(400, 'Project ID mismatch');
    }

    if (payload.project?.environment !== params.environment) {
        console.error(`[dokploy-webhook] Environment mismatch: expected="${params.environment}" got="${payload.project?.environment}"`);
        throw error(400, 'Environment mismatch');
    }

    if (payload.project?.secretPath !== secretPath) {
        console.error(`[dokploy-webhook] Secret path mismatch: expected="${secretPath}" got="${payload.project?.secretPath}"`);
        throw error(400, 'Secret path mismatch');
    }

    const apiToken = decrypt(service.dokployApiToken);
    const appType = service.dokployAppType as 'application' | 'compose';

    // 4. Fetch secrets from Infisical + current Dokploy env blob in parallel
    const client = new InfisicalSDK({ siteUrl: service.infisicalUrl });
    await client.auth().universalAuth.login({
        clientId: decrypt(service.infisicalClientId),
        clientSecret: decrypt(service.infisicalClientSecret),
    });

    const [{ secrets }, currentEnvRaw] = await Promise.all([
        client.secrets().listSecrets({
            projectId: params.projectId,
            environment: env.environment,
            secretPath: service.infisicalSecretPath,
            expandSecretReferences: true,
        }),
        getDokployEnv(service.dokployUrl, apiToken, service.dokployAppId, appType),
    ]);

    console.log(`[dokploy-webhook] Fetched ${secrets.length} secrets from Infisical env="${env.environment}" path="${service.infisicalSecretPath}" service="${service.name}"`);

    // 5. Merge: start from current Dokploy env, apply Infisical as source of truth
    const currentMap = parseDotenv(currentEnvRaw);
    const incomingMap = new Map(secrets.map((s) => [s.secretKey, s.secretValue]));

    // Track changes for logging
    let upserted = 0;
    let deleted = 0;
    let unchanged = 0;

    // Upsert from Infisical
    for (const [key, value] of incomingMap) {
        if (currentMap.get(key) !== value) {
            currentMap.set(key, value);
            upserted++;
        } else {
            unchanged++;
        }
    }

    // Delete keys that exist in Dokploy but are no longer in Infisical
    for (const key of currentMap.keys()) {
        if (!incomingMap.has(key)) {
            currentMap.delete(key);
            deleted++;
        }
    }

    // 6. Only write back if something changed
    if (upserted > 0 || deleted > 0) {
        const newEnvRaw = serializeDotenv(currentMap);
        await saveDokployEnv(service.dokployUrl, apiToken, service.dokployAppId, appType, newEnvRaw);

        if (upserted > 0) console.log(`[dokploy-webhook] Upserted ${upserted} env vars`);
        if (deleted > 0) console.log(`[dokploy-webhook] Deleted ${deleted} env vars`);
    } else {
        console.log('[dokploy-webhook] No env var changes');
    }

    return json({
        ok: true,
        upserted,
        deleted,
        unchanged,
    });
};