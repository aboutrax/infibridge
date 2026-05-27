import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { convexService, project } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import postgres from 'postgres';
import { hasPermission } from '$lib/permission-check';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) return redirect(302, '/');

    const roles = locals.user.role ?? '';
    if (!hasPermission(roles, 'project', 'list')) {
        return redirect(302, '/workspace/dashboard');
    }

    const projects = await db
        .select({
            id: project.id,
            name: project.name,
            activatedAt: project.activatedAt,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            serviceCount: count(convexService.id),
        })
        .from(project)
        .leftJoin(convexService, eq(convexService.projectId, project.id))
        .groupBy(project.id)
        .orderBy(project.createdAt);

    return { projects };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'project', 'create')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const name = data.get('name')?.toString() ?? '';

        if (!name) {
            return fail(400, { message: 'Name is required.' });
        }

        try {
            await db.insert(project).values({
                name,
                activatedAt: new Date(),
            });
        } catch (e) {
            const cause = e instanceof Error ? e.cause : e;
            if (cause instanceof postgres.PostgresError && cause.code === '23505') {
                switch (cause.constraint_name) {
                    case 'project_name_unique':
                        return fail(409, {
                            message: 'A project with this name already exists.'
                        });
                    default:
                        return fail(409, { message: 'A duplicate entry already exists.' });
                }
            }
            console.error('Unexpected error creating project:', e);
            return fail(500, { message: 'An unexpected error occurred. Please try again.' });
        }

        return redirect(302, '/workspace/project');
    },

    update: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'project', 'update')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        const name = data.get('name')?.toString() ?? '';

        if (!id || !name) {
            return fail(400, { message: 'All fields are required.' });
        }

        try {
            await db
                .update(project)
                .set({ name, updatedAt: new Date() })
                .where(eq(project.id, id));
        } catch (e) {
            const cause = e instanceof Error ? e.cause : e;
            if (cause instanceof postgres.PostgresError && cause.code === '23505') {
                switch (cause.constraint_name) {
                    case 'project_name_unique':
                        return fail(409, {
                            message: 'A project with this name already exists.'
                        });
                    default:
                        return fail(409, { message: 'A duplicate entry already exists.' });
                }
            }
            console.error('Unexpected error updating project:', e);
            return fail(500, { message: 'An unexpected error occurred. Please try again.' });
        }

        return redirect(302, '/workspace/project');
    },

    activate: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'project', 'update')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { message: 'Missing id.' });

        await db
            .update(project)
            .set({ activatedAt: new Date(), updatedAt: new Date() })
            .where(eq(project.id, id));

        return redirect(302, '/workspace/project');
    },

    deactivate: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'project', 'update')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { message: 'Missing id.' });

        await db
            .update(project)
            .set({ activatedAt: null, updatedAt: new Date() })
            .where(eq(project.id, id));

        return redirect(302, '/workspace/project');
    },

    delete: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: 'Unauthorized' });

        const roles = locals.user.role ?? '';
        if (!hasPermission(roles, 'project', 'delete')) {
            return fail(403, { message: 'Insufficient permissions.' });
        }

        const data = await request.formData();
        const id = data.get('id')?.toString() ?? '';
        if (!id) return fail(400, { message: 'Missing id.' });

        await db.delete(project).where(eq(project.id, id));

        return redirect(302, '/workspace/project');
    },
};