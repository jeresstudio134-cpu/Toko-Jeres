import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.ts";

const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
export { schema };