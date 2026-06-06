import { NativeConnection, Worker } from '@temporalio/worker';

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const queues = [
    'dfg-formation','dfg-tax','dfg-insurance','dfg-notary',
    'dfg-bookkeeping','dfg-vault','dfg-scheduled',
  ];

  const workers = await Promise.all(
    queues.map(taskQueue => Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      taskQueue,
      workflowsPath: require.resolve('./workflows/index'),
      activities: require('./activities'),
    }))
  );

  console.log('Divine Financial Group Temporal Workers running:');
  console.log('  Namespace:', process.env.TEMPORAL_NAMESPACE || 'divine-financial');
  console.log('  Queues:', queues.join(', '));

  await Promise.all(workers.map(w => w.run()));
}

run().catch(err => { console.error('Worker fatal:', err); process.exit(1); });
