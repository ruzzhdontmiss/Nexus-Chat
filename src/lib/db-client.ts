import { db, initializeDatabase } from "@nexus/database";

export async function getDb() {
  await initializeDatabase();
  return db;
}
