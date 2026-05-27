import { InfisicalSDK } from '@infisical/sdk';
import { createHmac, timingSafeEqual } from 'crypto';

const FIVE_MINUTES = 5 * 60 * 1000;

export async function verifyInfisicalCredentials(
    infisicalUrl: string,
    clientId: string,
    clientSecret: string,
    projectId: string,
    environment: string,
    secretPath: string
): Promise<void> {
    const client = new InfisicalSDK({ siteUrl: infisicalUrl });
    await client.auth().universalAuth.login({ clientId, clientSecret });
    await client.secrets().listSecrets({ projectId, environment, secretPath });
}

export function verifyInfisicalSignature(rawBody: string, signature: string, secret: string): boolean {
    const parts = signature.split(';');
    if (parts.length !== 2) return false;

    const timestamp = parts[0].substring(2);
    const receivedSig = parts[1];

    if (!timestamp || !receivedSig) return false;

    const age = Date.now() - Number(timestamp);
    if (age > FIVE_MINUTES) return false;

    const candidates = [
        `${timestamp}.${rawBody}`,
        rawBody,
        `${parts[0]}.${rawBody}`,
    ];

    for (const candidate of candidates) {
        const expected = createHmac('sha256', Buffer.from(secret, 'utf8'))
            .update(candidate, 'utf8')
            .digest('hex');

        const expectedBuf = Buffer.from(expected, 'utf8');
        const actualBuf = Buffer.from(receivedSig, 'utf8');

        if (expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf)) {
            return true;
        }
    }

    return false;
}