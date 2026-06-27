import { proxyActivities, sleep } from '@temporalio/workflow';
import type { DatabaseActivities, StorageActivities } from '../activities/types';

const db = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });
const storage = proxyActivities<StorageActivities>({ startToCloseTimeout: '2m' });

export async function documentVaultPipelineWorkflow(params: {
  documentId: string; userId: string; category: string; displayName: string;
}): Promise<void> {
  await db.updateVaultDocumentStatus({ documentId: params.documentId, status: 'scanning' });
  await sleep('1s');
  const result = await storage.scanAndPromoteDocument({ documentId: params.documentId });
  await db.writeAuditLog({ userId: params.userId, action: 'vault_document_pipeline_completed', resourceType: 'document', resourceId: params.documentId, metadata: { category: params.category, status: result.status } });
}
