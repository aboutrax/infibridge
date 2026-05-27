import type { DokployAppType } from '$lib/dokploy';

export async function verifyDokployCredentials(
    dokployUrl: string,
    apiToken: string,
    appId: string,
    appType: DokployAppType
): Promise<void> {
    const base = dokployUrl.replace(/\/$/, '');
    const endpoint =
        appType === 'compose'
            ? `${base}/api/compose.one?composeId=${encodeURIComponent(appId)}`
            : `${base}/api/application.one?applicationId=${encodeURIComponent(appId)}`;

    let res: Response;
    try {
        res = await fetch(endpoint, {
            headers: { 'x-api-key': apiToken, accept: 'application/json' },
        });
    } catch {
        throw new Error('UNREACHABLE');
    }

    if (res.status === 401 || res.status === 403) throw new Error('UNAUTHORIZED');
    if (res.status === 404) throw new Error('NOT_FOUND');
    if (!res.ok) throw new Error('UNKNOWN');
}

/** Parse a dotenv-format string into a key→value map. Ignores comments and blank lines. */
export function parseDotenv(raw: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
        }
        map.set(key, value);
    }
    return map;
}

/** Serialize a key→value map back to a dotenv-format string. */
// export function serializeDotenv(map: Map<string, string>): string {
//     return [...map.entries()].map(([k, v]) => `${k}='${v.replace(/'/g, "\\'")}'`).join('\n');
// }
export function serializeDotenv(map: Map<string, string>): string {
    return [...map.entries()].map(([k, v]) => `${k}='${v}'`).join('\n');
}

export async function getDokployEnv(
    dokployUrl: string,
    apiToken: string,
    appId: string,
    appType: DokployAppType
): Promise<string> {
    const base = dokployUrl.replace(/\/$/, '');
    const endpoint =
        appType === 'compose'
            ? `${base}/api/compose.one?composeId=${encodeURIComponent(appId)}`
            : `${base}/api/application.one?applicationId=${encodeURIComponent(appId)}`;

    const res = await fetch(endpoint, {
        headers: { 'x-api-key': apiToken, accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`Dokploy fetch failed: ${res.status}`);

    const body = await res.json();
    return (body.env as string | null | undefined) ?? '';
}

export async function saveDokployEnv(
    dokployUrl: string,
    apiToken: string,
    appId: string,
    appType: DokployAppType,
    env: string
): Promise<void> {
    const base = dokployUrl.replace(/\/$/, '');

    if (appType === 'compose') {
        const res = await fetch(`${base}/api/compose.saveEnvironment`, {
            method: 'POST',
            headers: { 'x-api-key': apiToken, 'content-type': 'application/json' },
            body: JSON.stringify({ composeId: appId, env }),
        });
        if (!res.ok) throw new Error(`Dokploy saveEnvironment failed: ${res.status}`);
        return;
    }

    // For application, fetch current values first so we don't wipe buildArgs/buildSecrets
    const current = await fetch(
        `${base}/api/application.one?applicationId=${encodeURIComponent(appId)}`,
        { headers: { 'x-api-key': apiToken, accept: 'application/json' } }
    ).then((r) => r.json());

    const res = await fetch(`${base}/api/application.saveEnvironment`, {
        method: 'POST',
        headers: { 'x-api-key': apiToken, 'content-type': 'application/json' },
        body: JSON.stringify({
            applicationId: appId,
            env,
            buildArgs: current.buildArgs ?? '',
            buildSecrets: current.buildSecrets ?? '',
            createEnvFile: current.createEnvFile ?? false,
        }),
    });

    if (!res.ok) throw new Error(`Dokploy saveEnvironment failed: ${res.status}`);
}