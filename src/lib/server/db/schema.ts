import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, unique, uniqueIndex } from 'drizzle-orm/pg-core';

export const infisicalEnv = pgTable('infisical_env', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    environment: text('environment').notNull(),
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    unique('infisical_env_environment_unique').on(table.environment),
    index('infisical_env_activated_at_idx').on(table.activatedAt),
]);

export const project = pgTable('project', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    uniqueIndex('project_name_unique').on(sql`lower(${table.name})`),
    index('project_activated_at_idx').on(table.activatedAt),
]);

export const convexService = pgTable('convex_service', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    projectId: text('project_id')
        .notNull()
        .references(() => project.id, { onDelete: 'cascade' }),
    convexUrl: text('convex_url').notNull(),
    convexDeployKey: text('convex_deploy_key').notNull(),
    infisicalUrl: text('infisical_url').notNull(),
    infisicalClientId: text('infisical_client_id').notNull(),
    infisicalClientSecret: text('infisical_client_secret').notNull(),
    infisicalProjectId: text('infisical_project_id').notNull(),
    infisicalEnvId: text('infisical_env_id')
        .notNull()
        .references(() => infisicalEnv.id, { onDelete: 'restrict' }),
    infisicalSecretPath: text('infisical_secret_path').notNull().default('/'),
    webhookSecret: text('webhook_secret').notNull(),
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('convex_service_project_id_idx').on(table.projectId),
    index('convex_service_activated_at_idx').on(table.activatedAt),
    index('convex_service_infisical_project_id_idx').on(
        table.infisicalProjectId,
        table.infisicalEnvId,
        table.infisicalSecretPath
    ),
    unique('convex_service_infisical_project_env_path_unique').on(
        table.infisicalProjectId,
        table.infisicalEnvId,
        table.infisicalSecretPath
    ),
]);

export const dokployService = pgTable('dokploy_service', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    projectId: text('project_id')
        .notNull()
        .references(() => project.id, { onDelete: 'cascade' }),
    dokployUrl: text('dokploy_url').notNull(),
    dokployApiToken: text('dokploy_api_token').notNull(),
    dokployAppId: text('dokploy_app_id').notNull(),
    dokployAppType: text('dokploy_app_type').notNull().default('application'),
    infisicalUrl: text('infisical_url').notNull(),
    infisicalClientId: text('infisical_client_id').notNull(),
    infisicalClientSecret: text('infisical_client_secret').notNull(),
    infisicalProjectId: text('infisical_project_id').notNull(),
    infisicalEnvId: text('infisical_env_id')
        .notNull()
        .references(() => infisicalEnv.id, { onDelete: 'restrict' }),
    infisicalSecretPath: text('infisical_secret_path').notNull().default('/'),
    webhookSecret: text('webhook_secret').notNull(),
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('dokploy_service_project_id_idx').on(table.projectId),
    index('dokploy_service_activated_at_idx').on(table.activatedAt),
    index('dokploy_service_infisical_project_id_idx').on(
        table.infisicalProjectId,
        table.infisicalEnvId,
        table.infisicalSecretPath
    ),
    unique('dokploy_service_infisical_project_env_path_unique').on(
        table.infisicalProjectId,
        table.infisicalEnvId,
        table.infisicalSecretPath
    ),
]);

export * from './auth.schema';