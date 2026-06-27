import { NativeConnection, Worker } from '@temporalio/worker';

async function run() {
  const temporalAddress = (process.env.TEMPORAL_ADDRESS ?? 'localhost:7233').trim();
  const namespace = (process.env.TEMPORAL_NAMESPACE ?? 'divine-financial').trim();

  console.log(`[Worker] Connecting to Temporal at: "${temporalAddress}"`);
  console.log(`[Worker] Namespace: "${namespace}"`);

  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  const queues = [
    'dfg-formation','dfg-tax','dfg-insurance','dfg-notary',
    'dfg-bookkeeping','dfg-vault','dfg-scheduled',
  ];

  const workers = await Promise.all(
    queues.map(taskQueue => Worker.create({
      connection,
      namespace,
      taskQueue,
      workflowsPath: require.resolve('./workflows/index'),
      activities: require('./activities'),
    }))
  );

  console.log(`[Worker] Running on ${queues.length} task queues: ${queues.join(', ')}`);

  await Promise.all(workers.map(w => w.run()));
}

run().catch(err => {
  console.error('[Worker] Fatal error:', err);
  console.error('[Worker] TEMPORAL_ADDRESS value:', JSON.stringify(process.env.TEMPORAL_ADDRESS));
  console.error('[Worker] Check .env.local for trailing spaces or incorrect values.');
  process.exit(1);
});
