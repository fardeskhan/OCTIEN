import { PlatformBootSequence } from '@cosmy/platform-runtime/boot/PlatformBootSequence';

async function bootstrap() {
  const bootSequence = new PlatformBootSequence(/* di injection */);
  await bootSequence.start('API_RUNTIME');

  console.log('[Runtime: API] Listening for inbound synchronous HTTP/REST traffic on port 3000...');
  // Initialize NestJS HTTP Server
}

bootstrap();
