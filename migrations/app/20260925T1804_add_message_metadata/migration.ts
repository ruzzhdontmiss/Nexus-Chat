#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/56b7fb1564325ccafc6e2ef09aacfd774f8f5adbfc1650aafd596f3a9d9c2fbd/contract';
import startContract from '../../snapshots/56b7fb1564325ccafc6e2ef09aacfd774f8f5adbfc1650aafd596f3a9d9c2fbd/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9c8e09ece4e91d0861bbfa28706a8f62a593fb69e74a78ecb98c501192ea882d/contract';
import endContract from '../../snapshots/9c8e09ece4e91d0861bbfa28706a8f62a593fb69e74a78ecb98c501192ea882d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@internal/postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'message',
        column: col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
