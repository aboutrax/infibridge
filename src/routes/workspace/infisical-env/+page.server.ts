import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { infisicalEnv } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { hasPermission } from '$lib/permission-check';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return redirect(302, '/');

    const roles = locals.user.role ?? '';
    if (!hasPermission(roles, 'infisicalEnv', 'list')) {
        return redirect(302, '/workspace/dashboard');
    }

    const envs = await db
        .select()
        .from(infisicalEnv)
        .orderBy(infisicalEnv.createdAt);

    return { envs };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'infisicalEnv', 'create')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const name = data.get('name')?.toString() ?? '';
        const environment = data.get('environment')?.toString() ?? '';

        if (!name || !environment) {
            return fail(400, { message: 'All fields are required' });
        }

        try {
            await db.insert(infisicalEnv).values({ name, environment, activatedAt: new Date() });
        } catch (e) {
            const cause = e instanceof Error ? e.cause : e;
            if (cause instanceof postgres.PostgresError && cause.code === '23505') {
                switch (cause.constraint_name) {
                    case 'infisical_env_environment_unique':
                        return fail(409, {
                            message: `An environment with slug "${environment}" already exists.`
                        });
                    default:
                        return fail(409, { message: 'A duplicate entry already exists.' });
                }
            }
            console.error('Unexpected error creating infisical env:', e);
            return fail(500, { message: 'An unexpected error occurred. Please try again.' });
        }

        return redirect(302, '/workspace/infisical-env');
    },

    update: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'infisicalEnv', 'create')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        const name = data.get('name')?.toString() ?? '';
        const environment = data.get('environment')?.toString() ?? '';

        if (!id || !name || !environment) {
            return fail(400, { message: 'All fields are required' });
        }

        try {
            await db
                .update(infisicalEnv)
                .set({ name, environment, updatedAt: new Date() })
                .where(eq(infisicalEnv.id, id));
        } catch (e) {
            const cause = e instanceof Error ? e.cause : e;
            if (cause instanceof postgres.PostgresError && cause.code === '23505') {
                switch (cause.constraint_name) {
                    case 'infisical_env_environment_unique':
                        return fail(409, {
                            message: `An environment with slug "${environment}" already exists.`
                        });
                    default:
                        return fail(409, { message: 'A duplicate entry already exists.' });
                }
            }
            console.error('Unexpected error updating infisical env:', e);
            return fail(500, { message: 'An unexpected error occurred. Please try again.' });
        }

        return redirect(302, '/workspace/infisical-env');
    },

    delete: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'infisicalEnv', 'delete')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';

        if (!id) return fail(400, { message: 'Missing id' });

        try {
            await db.delete(infisicalEnv).where(eq(infisicalEnv.id, id));
        } catch {
            // onDelete: restrict — env is in use
            console.error("Environment is in use by a project and cannot be deleted");
            return fail(409, { message: 'Environment is in use by a project and cannot be deleted' });
        }

        return redirect(302, '/workspace/infisical-env');
    },

    activate: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'infisicalEnv', 'update')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { message: 'Missing id' });
        await db.update(infisicalEnv).set({ activatedAt: new Date() }).where(eq(infisicalEnv.id, id));
        return redirect(302, '/workspace/infisical-env');
    },

    deactivate: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'infisicalEnv', 'update')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { message: 'Missing id' });
        await db.update(infisicalEnv).set({ activatedAt: null }).where(eq(infisicalEnv.id, id));
        return redirect(302, '/workspace/infisical-env');
    },
};