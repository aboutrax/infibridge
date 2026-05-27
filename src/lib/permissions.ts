import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';

export const statement = {
    ...defaultStatements,
    user: [...defaultStatements.user, 'view'],
    profile: ['view'],
    infisicalEnv: ['view', 'list', 'create', 'get', 'update', 'delete'],
    project: ['view', 'list', 'list-service', 'create', 'get', 'update', 'delete'],
    convexService: ['view', 'list', 'create', 'get', 'update', 'delete'],
    dokployService: ['view', 'list', 'create', 'get', 'update', 'delete']
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
    ...adminAc.statements,
    user: [...adminAc.statements.user, ...statement.user],
    profile: [...statement.profile],
    infisicalEnv: [...statement.infisicalEnv],
    project: [...statement.project],
    convexService: [...statement.convexService],
    dokployService: [...statement.dokployService],
});

export const user = ac.newRole({
    ...userAc.statements,
    profile: ['view'],
    infisicalEnv: [],
    project: ['view', 'list-service'],
    convexService: ['view', 'list', 'get'],
    dokployService: ['view', 'list', 'get']
});

export const userRoleMap = {
    admin,
    user
} as const;

export type UserRole = keyof typeof userRoleMap;

export type UserResourceAction<T extends keyof typeof statement> = (typeof statement)[T][number];
