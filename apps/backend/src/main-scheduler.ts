import { PlatformBootSequence } from '@cosmy/platform-runtime/boot/PlatformBootSequence';

async function bootstrap() {
  const bootSequence = new PlatformBootSequence(/* di injection */);
  await bootSequence.start('SCHEDULER_RUNTIME');

  console.log('[Runtime: Scheduler] Initializing distributed CRON execution...');
  // Initialize cron dispatchers
}

bootstrap();
