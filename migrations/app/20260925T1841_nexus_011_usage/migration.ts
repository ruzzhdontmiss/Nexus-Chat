#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/264c7cbf2141154d01db98b936b68a232e218b05e98ea220aa97138af0d5def7/contract';
import endContract from '../../snapshots/264c7cbf2141154d01db98b936b68a232e218b05e98ea220aa97138af0d5def7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9c8e09ece4e91d0861bbfa28706a8f62a593fb69e74a78ecb98c501192ea882d/contract';
import startContract from '../../snapshots/9c8e09ece4e91d0861bbfa28706a8f62a593fb69e74a78ecb98c501192ea882d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'rateLimit',
        columns: [
          col('count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('endpoint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('windowStart', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'usageQuota',
        columns: [
          col('chatRequests', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('searchRequests', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tokens', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'usageEvent',
        column: col('conversationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'usageEvent',
        column: col('durationMs', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'usageEvent',
        column: col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'usageEvent',
        column: col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'usageEvent',
        column: col('kind', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.setNotNull({ schema: 'public', table: 'usageEvent', column: 'kind' }),

      this.dropNotNull({ schema: 'public', table: 'usageEvent', column: 'accessType' }),
      this.dropNotNull({ schema: 'public', table: 'usageEvent', column: 'modelId' }),
      this.dropNotNull({ schema: 'public', table: 'usageEvent', column: 'providerId' }),
      this.addUnique({
        schema: 'public',
        table: 'rateLimit',
        constraint: 'rateLimit_userId_endpoint_windowStart_key',
        columns: ['userId', 'endpoint', 'windowStart'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usageQuota',
        constraint: 'usageQuota_userId_date_key',
        columns: ['userId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rateLimit',
        index: 'rateLimit_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'usageQuota',
        index: 'usageQuota_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rateLimit',
        foreignKey: {
          name: 'rateLimit_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'usageQuota',
        foreignKey: {
          name: 'usageQuota_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
