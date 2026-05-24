import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';

export const statement = {
    ...defaultStatements,
    user: [...defaultStatements.user, 'view'],
    profile: ['view']
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
    ...adminAc.statements,
    user: [...adminAc.statements.user, ...statement.user],
    profile: [...statement.profile]
});

export const user = ac.newRole({
    ...userAc.statements,
    profile: ['view']
});

export const userRoleMap = {
    admin,
    user
} as const;

export type UserRole = keyof typeof userRoleMap;

export type UserResourceAction<T extends keyof typeof statement> = (typeof statement)[T][number];
