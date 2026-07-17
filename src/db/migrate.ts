/**
 * Apply pending migrations from `drizzle/` to the local database.
 * (Opening the database via createDb already migrates; this script exists as
 * the explicit `pnpm db:migrate` entry point.)
 */
import { pathToFileURL } from "node:url";
import { createDb, databasePath } from "./client";

function main(): void {
  createDb();
  console.log(`migrations applied to ${databasePath()}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
