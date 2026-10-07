import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.js';
import contractJson from './contract.json' with { type: 'json' };
import pgvector from '@prisma/orm-extension-pgvector/runtime';

export const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL!,
  extensions: [pgvector],
});
