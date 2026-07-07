import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BankConnectionRepository } from '../../../../packages/infrastructure/src/banking/repositories/PostgresBankConnectionRepository';
import { EventStore } from '../../../../packages/shared-kernel/src/events/EventStore';
import { TelemetryService } from '../../../../packages/shared-kernel/src/telemetry/TelemetryService';

describe('E2E: 01-connect-bank (Golden Path)', () => {
  let app: INestApplication;
  let connectionRepo: BankConnectionRepository;
  let eventStore: EventStore;
  let telemetry: TelemetryService;

  const TENANT_ID = 'tenant-001';
  const INSTITUTION_ID = 'account-aggregator';

  beforeAll(async () => {
    // Standard NestJS E2E Bootstrap overriding adapters with strict mocks
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* BankingModule */],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connectionRepo = moduleFixture.get(BankConnectionRepository);
    eventStore = moduleFixture.get(EventStore);
    telemetry = moduleFixture.get(TelemetryService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully establish an Account Aggregator connection, emit events, persist aggregate state, and log telemetry', async () => {
    
    // 1. Fire the Command
    const response = await request(app.getHttpServer())
      .post('/api/v1/banking/connections')
      .set('x-tenant-id', TENANT_ID)
      .send({
        institutionId: INSTITUTION_ID,
        consentToken: 'mock-aa-consent-token-12345'
      })
      .expect(201);

    const connectionId = response.body.id;

    // 2. Validate API Response Contract
    expect(response.body).toMatchObject({
      tenantId: TENANT_ID,
      institutionId: INSTITUTION_ID,
      status: 'AUTHENTICATING'
    });

    // 3. Validate Aggregate State Persistence (No raw SQL)
    const persistedState = await connectionRepo.findById(connectionId, TENANT_ID);
    expect(persistedState).toBeDefined();
    expect(persistedState.getStatus()).toEqual('AUTHENTICATING');
    expect(persistedState.getTenantId()).toEqual(TENANT_ID);

    // 4. Validate Domain Event Sourcing & Outbox (Crucial CQRS validation)
    const events = await eventStore.getEventsForAggregate(connectionId);
    expect(events.length).toBeGreaterThan(0);
    const createdEvent = events.find(e => e.eventType === 'BankConnectionRequested');
    expect(createdEvent).toBeDefined();
    expect(createdEvent.payload.institutionId).toEqual(INSTITUTION_ID);

    // 5. Validate Platform Telemetry (Observability guard)
    const metrics = telemetry.getMetricsForTrace(response.header['x-trace-id']);
    expect(metrics).toContainEqual(
      expect.objectContaining({ name: 'banking.connection.attempt', tenantId: TENANT_ID })
    );
  });

  it('should cryptographically reject connections missing correct tenant isolation headers', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/banking/connections')
      .send({
        institutionId: INSTITUTION_ID,
        consentToken: 'mock-aa-consent-token-12345'
      })
      .expect(401); // Requires x-tenant-id middleware
  });
});
