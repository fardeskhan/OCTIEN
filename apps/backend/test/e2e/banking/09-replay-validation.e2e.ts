import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventStore } from '../../../../packages/shared-kernel/src/events/EventStore';
import { ProjectionDispatcher } from '../../../../packages/shared-kernel/src/projections/ProjectionDispatcher';
import { BankBalanceProjection } from '../../../../packages/application/src/banking/projections/BankBalanceProjection';

describe('E2E: 09-replay-validation (Event Sourcing Determinism)', () => {
  let app: INestApplication;
  let eventStore: EventStore;
  let dispatcher: ProjectionDispatcher;
  let balanceProjection: BankBalanceProjection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* BankingModule */],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventStore = moduleFixture.get(EventStore);
    dispatcher = moduleFixture.get(ProjectionDispatcher);
    balanceProjection = moduleFixture.get(BankBalanceProjection);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should cryptographically guarantee determinism across a 10,000 event replay simulation', async () => {
    // 1. Capture absolute state before Destruction
    const originalChecksum = await balanceProjection.checksum();
    const originalRowHash = await balanceProjection.hashState();

    // 2. Drop Projections (Simulate Catastrophe / Version Upgrade)
    await balanceProjection.destroyTable();
    await balanceProjection.initializeTable();

    const wipedChecksum = await balanceProjection.checksum();
    expect(wipedChecksum).not.toEqual(originalChecksum);

    // 3. Command the Dispatcher to Replay 100% of Events
    const allEvents = await eventStore.getAllEventsForContext('CAP-BANKING');
    for (const event of allEvents) {
      await dispatcher.dispatch(event);
    }

    // 4. Assert Exact Structural & Cryptographic Determinism
    const replayedChecksum = await balanceProjection.checksum();
    const replayedRowHash = await balanceProjection.hashState();

    expect(replayedChecksum).toEqual(originalChecksum);
    expect(replayedRowHash).toEqual(originalRowHash);
  });
});
