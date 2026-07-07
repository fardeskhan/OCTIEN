import { PlatformBootSequence } from '@cosmy/platform-runtime/boot/PlatformBootSequence';

async function bootstrap() {
  const bootSequence = new PlatformBootSequence(/* di injection */);
  await bootSequence.start('WORKER_RUNTIME');

  console.log('[Runtime: Worker] Consuming asynchronous queues (Outbox, Documents, Notifications)...');
  // Initialize BullMQ / RabbitMQ consumers
}

bootstrap();
