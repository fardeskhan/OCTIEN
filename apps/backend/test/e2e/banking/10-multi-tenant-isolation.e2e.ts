import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('E2E: 10-multi-tenant-isolation (Security Gate)', () => {
  let app: INestApplication;

  const TENANT_A = 'tenant-a-001';
  const TENANT_B = 'tenant-b-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* BankingModule */],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('MUST reject cross-tenant Balance Queries (IDOR Simulation)', async () => {
    // Attempting to query Tenant A's account while authenticating as Tenant B
    const targetAccountId = 'acc-belonging-to-tenant-a';

    const response = await request(app.getHttpServer())
      .get(`/api/v1/banking/accounts/${targetAccountId}/balances`)
      .set('x-tenant-id', TENANT_B)
      .expect(404); // Specifically 404, not 403, to prevent Account Enumeration attacks

    expect(response.body.message).toMatch(/not found/i);
  });

  it('MUST strictly segregate webhooks destined for Tenant B away from Tenant A', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/banking/webhooks/icici')
      .set('x-tenant-id', TENANT_A)
      .send({
        // Payload referencing Tenant B's internal connection ID
        connectionId: 'conn-belonging-to-tenant-b',
        type: 'STATEMENT_READY'
      })
      .expect(400); // Bad Request, webhook signature validation tied to Tenant A's keys fails

    expect(response.body.message).toMatch(/signature/i);
  });
});
