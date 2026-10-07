// @ts-ignore - TS Node moduleResolution does not support package.json exports
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json';
// @ts-ignore - TS Node moduleResolution does not support package.json exports
import pgvector from '@prisma/orm-extension-pgvector/runtime';

export const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL!,
  extensions: [pgvector],
});
