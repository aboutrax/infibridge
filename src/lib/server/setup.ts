import { db } from "$lib/server/db";
import { user } from "$lib/server/db/auth.schema";
import { eq } from "drizzle-orm";

let adminExists: boolean | null = null

export async function checkAdminExists() {
    if (adminExists) return true;

    const result = await db
        .select()
        .from(user)
        .where(eq(user.role, 'admin'))
        .limit(1);

    if (result.length) adminExists = true;

    return adminExists ?? false;
}