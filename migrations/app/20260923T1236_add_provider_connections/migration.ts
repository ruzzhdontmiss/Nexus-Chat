#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/56b7fb1564325ccafc6e2ef09aacfd774f8f5adbfc1650aafd596f3a9d9c2fbd/contract';
import endContract from '../../snapshots/56b7fb1564325ccafc6e2ef09aacfd774f8f5adbfc1650aafd596f3a9d9c2fbd/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a4916e1c3d6a86a85354c2dbac7dc56edd408d03a004ab237d2ec976a4fae5f0/contract';
import startContract from '../../snapshots/a4916e1c3d6a86a85354c2dbac7dc56edd408d03a004ab237d2ec976a4fae5f0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@internal/postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'providerConnection',
        columns: [
          col('authType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('displayName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('encryptedCredential', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'providerConnection',
        constraint: 'providerConnection_userId_providerId_key',
        columns: ['userId', 'providerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'providerConnection',
        index: 'providerConnection_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'providerConnection',
        foreignKey: {
          name: 'providerConnection_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
