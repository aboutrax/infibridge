import { type UserResourceAction, type UserRole, userRoleMap, statement as userStatement } from '$lib/permissions';

export function hasPermission<T extends keyof typeof userStatement>(
    roles: string,
    resource: T,
    action: UserResourceAction<T>
): boolean {
    return roles
        .split(',')
        .map(r => r.trim() as UserRole)
        .some(r => {
            const role = userRoleMap[r];
            const statements = role?.statements as Record<string, readonly string[]> | undefined;
            return statements?.[resource]?.includes(action as string);
        });
}

export function requirePermission<T extends keyof typeof userStatement>(
    roles: string,
    resource: T,
    action: UserResourceAction<T>
) {
    if (!hasPermission(roles, resource, action)) {
        throw new Error(`Insufficient permission: requires ${resource}:${action}`);
    }
}