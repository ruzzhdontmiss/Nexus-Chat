import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.js';
import contractJson from './contract.json' with { type: 'json' };
import pgvector from '@prisma/orm-extension-pgvector/runtime';

export const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL,
  extensions: [pgvector],
});

let connected = false;
export async function initializeDatabase() {
  if (!connected) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in the environment");
    }
    await db.connect({ url: process.env.DATABASE_URL });
    connected = true;
  }
}

export async function closeDatabase() {
  if (connected) {
    await db.close();
    connected = false;
  }
}
