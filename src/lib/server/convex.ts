interface EnvVar {
    name: string;
    value: string;
}

export async function listConvexEnvVars(
    convexUrl: string,
    deployKey: string
): Promise<{ name: string; value: string }[]> {
    const response = await fetch(`${convexUrl}/api/v1/list_environment_variables`, {
        headers: { 'Authorization': `Convex ${deployKey}` },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Convex API error ${response.status}: ${body}`);
    }

    const data = await response.json();

    return Object.entries(data.environmentVariables as Record<string, string>).map(
        ([name, value]) => ({ name, value })
    );
}

export async function updateConvexEnvVars(
    convexUrl: string,
    deployKey: string,
    vars: EnvVar[]
): Promise<void> {
    const url = `${convexUrl}/api/v1/update_environment_variables`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Convex ${deployKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ changes: vars.map((v) => ({ name: v.name, value: v.value })) }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Convex API error ${response.status}: ${body}`);
    }
}

export async function deleteConvexEnvVars(
    convexUrl: string,
    deployKey: string,
    names: string[]
): Promise<void> {
    if (names.length === 0) return;

    const response = await fetch(`${convexUrl}/api/v1/update_environment_variables`, {
        method: 'POST',
        headers: {
            'Authorization': `Convex ${deployKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            changes: names.map((name) => ({ name, unset: true }))
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Convex API error ${response.status}: ${body}`);
    }
}