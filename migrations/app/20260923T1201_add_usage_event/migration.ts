#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a4916e1c3d6a86a85354c2dbac7dc56edd408d03a004ab237d2ec976a4fae5f0/contract';
import endContract from '../../snapshots/a4916e1c3d6a86a85354c2dbac7dc56edd408d03a004ab237d2ec976a4fae5f0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8426639229ca8bf870346bc60faa44ec73fb31aa19dc60af5a832383c69d26f/contract';
import startContract from '../../snapshots/f8426639229ca8bf870346bc60faa44ec73fb31aa19dc60af5a832383c69d26f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@internal/postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'usageEvent',
        columns: [
          col('accessType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inputTokens', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('modelId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('outputTokens', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('providerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalTokens', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'usageEvent',
        index: 'usageEvent_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usageEvent',
        foreignKey: {
          name: 'usageEvent_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
