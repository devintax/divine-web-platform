import { proxyActivities, sleep } from '@temporalio/workflow';
import type { DatabaseActivities } from '../activities/types';

const db = proxyActivities<DatabaseActivities>({ startToCloseTimeout: '30s' });

export async function documentVaultPipelineWorkflow(params: {
  documentId: string; userId: string; category: string; displayName: string;
}): Promise<void> {
  await db.updateVaultDocumentStatus({ documentId: params.documentId, status: 'scanning' });
  await sleep('2s');
  await db.updateVaultDocumentStatus({ documentId: params.documentId, status: 'clean', virusClean: true });
  await db.writeAuditLog({ userId: params.userId, action: 'vault_document_promoted', resourceType: 'document', resourceId: params.documentId, metadata: { category: params.category } });
}
