import { PlatformBootSequence } from '@cosmy/platform-runtime/boot/PlatformBootSequence';

async function bootstrap() {
  const bootSequence = new PlatformBootSequence(/* di injection */);
  await bootSequence.start('PROJECTION_RUNTIME');

  console.log('[Runtime: Projection] Tailing Event Store and rebuilding Read Models...');
  // Initialize Projection Dispatcher
}

bootstrap();
