#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/264c7cbf2141154d01db98b936b68a232e218b05e98ea220aa97138af0d5def7/contract';
import startContract from '../../snapshots/264c7cbf2141154d01db98b936b68a232e218b05e98ea220aa97138af0d5def7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9506f6df0ad5087b22f7561805fa532819da440bc1dc84c228044e686fef7e48/contract';
import endContract from '../../snapshots/9506f6df0ad5087b22f7561805fa532819da440bc1dc84c228044e686fef7e48/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@internal/postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'document',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('filename', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('size', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'documentChunk',
        columns: [
          col('chunkIndex', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('documentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('embedding', 'vector(384)', {
            codecRef: { codecId: 'pg/vector@1', typeParams: { length: 384 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('pageEnd', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('pageStart', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('sectionTitle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tokenCount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentChunk',
        index: 'documentChunk_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentChunk',
        foreignKey: {
          name: 'documentChunk_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'document', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
