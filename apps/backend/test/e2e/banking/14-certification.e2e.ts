import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CertificationEngine } from '../../../../packages/platform-runtime/src/certification/CertificationEngine';

describe('E2E: 14-certification (Adapter Certification Protocol)', () => {
  let app: INestApplication;
  let engine: CertificationEngine;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* PlatformRuntimeModule */],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    engine = moduleFixture.get(CertificationEngine);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should rigorously execute the 6-stage certification pipeline for Account Aggregator', async () => {
    const report = await engine.certify('account-aggregator', '1.1.0', '1.0.0');

    // Asserts that the Engine ran its mathematical checks
    expect(report.scores.functional).toEqual(100);
    expect(report.scores.security).toEqual(100);
    expect(report.status).toEqual('Certified');
    expect(report.checksum).toBeDefined();
  });

  it('should fiercely reject an adapter simulating a failed MTLS handshake', async () => {
    // Mock the ICICI adapter to fail the security suite
    jest.spyOn(engine['runner'], 'runSecurityTests').mockResolvedValue(50);
    
    const report = await engine.certify('icici-corporate-sandbox', '1.0.0', '1.0.0');

    expect(report.scores.security).toEqual(50);
    expect(report.status).toEqual('Rejected'); // Security failure guarantees immediate rejection
  });
});
