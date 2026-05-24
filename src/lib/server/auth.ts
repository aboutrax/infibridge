import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { admin as adminPlugin } from 'better-auth/plugins';
import { ac, admin, user } from '$lib/permissions';
import { checkAdminExists } from './setup';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	databaseHooks: {
		user: {
			create: {
				async before(user) {
					const exists = await checkAdminExists();

					return {
						data: {
							...user,
							role: !exists ? 'admin' : user.role || 'user'
						}
					};
				}
			}
		},
	},
	plugins: [
		adminPlugin({
			ac,
			roles: {
				admin,
				user
			}
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
