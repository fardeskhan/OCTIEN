import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SyncTransactionsHandler } from '../../../../packages/application/src/banking/handlers/SyncTransactionsHandler';
import { EventStore } from '../../../../packages/shared-kernel/src/events/EventStore';
import { performance } from 'perf_hooks';

describe('E2E: 11-performance (Baseline & Degradation Watcher)', () => {
  let app: INestApplication;
  let syncHandler: SyncTransactionsHandler;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* BankingModule */],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    syncHandler = moduleFixture.get(SyncTransactionsHandler);
  });

  afterAll(async () => {
    await app.close();
  });

  it('MUST process 10,000 raw incoming transactions under 1500ms P95', async () => {
    // Generate 10k mock payloads
    const payloads = Array.from({ length: 10000 }).map((_, i) => ({
      accountId: 'perf-acc',
      amount: Math.random() * 1000,
      currency: 'INR',
      date: new Date(),
      reference: `PERF_TX_${i}`,
      type: i % 2 === 0 ? 'CREDIT' : 'DEBIT'
    }));

    const start = performance.now();
    
    // Simulate Background Worker Execution
    await Promise.all(payloads.map(tx => syncHandler.handle(tx)));

    const end = performance.now();
    const duration = end - start;

    // Export absolute metrics to performance.json (Consumed by CRR Generator)
    const metrics = {
      test: '10k_transaction_ingest',
      durationMs: duration,
      p95TargetMs: 1500,
      status: duration <= 1500 ? 'PASS' : 'FAIL'
    };

    console.log(JSON.stringify(metrics)); // Caught by CI

    expect(duration).toBeLessThanOrEqual(1500);
  });
});
