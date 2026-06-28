import { execFileSync } from "child_process";
import { Client, Connection } from "@temporalio/client";

const POSTGRES_CONTAINER = process.env.INSFORGE_POSTGRES_CONTAINER || "insforge-backend-postgres-1";

type EnrollmentRow = {
  id: string;
  user_id: string;
  service_type: "tax" | "formation" | "insurance" | "notary" | "bookkeeping";
  workflow_id: string | null;
};

const WORKFLOW_CONFIG: Record<EnrollmentRow["service_type"], { workflowType: string; taskQueue: string }> = {
  tax: { workflowType: "taxPreparationWorkflow", taskQueue: "dfg-tax" },
  formation: { workflowType: "businessFormationWorkflow", taskQueue: "dfg-formation" },
  insurance: { workflowType: "autoInsuranceWorkflow", taskQueue: "dfg-insurance" },
  notary: { workflowType: "notaryServicesWorkflow", taskQueue: "dfg-notary" },
  bookkeeping: { workflowType: "bookkeepingOnboardingWorkflow", taskQueue: "dfg-bookkeeping" },
};

function runSql(query: string) {
  return execFileSync("docker", [
    "exec",
    POSTGRES_CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    "insforge",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    query,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function jsonSql<T>(query: string): T[] {
  const output = execFileSync("docker", [
    "exec",
    POSTGRES_CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    "insforge",
    "-t",
    "-A",
    "-c",
    `SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json) FROM (${query}) q;`,
  ], { encoding: "utf8" }).trim();
  return JSON.parse(output || "[]") as T[];
}

function bootstrapSchema() {
  runSql(`
    ALTER TABLE service_enrollments
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
      ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS pod VARCHAR(50),
      ADD COLUMN IF NOT EXISTS client_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';

    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address VARCHAR(255),
      ADD COLUMN IF NOT EXISTS zip VARCHAR(20),
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

    ALTER TABLE case_deliverables
      ADD COLUMN IF NOT EXISTS sent_for_review_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS review_notes TEXT;

    CREATE TABLE IF NOT EXISTS user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
      email_on_message BOOLEAN DEFAULT TRUE,
      email_on_update BOOLEAN DEFAULT TRUE,
      email_on_complete BOOLEAN DEFAULT TRUE,
      sms_on_message BOOLEAN DEFAULT TRUE,
      sms_on_update BOOLEAN DEFAULT FALSE,
      timezone VARCHAR(50) DEFAULT 'America/New_York',
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
  `);
}

function backfillEnrollmentFields() {
  runSql(`
    UPDATE service_enrollments
    SET pod = CASE service_type
      WHEN 'tax' THEN 'tax-pod'
      WHEN 'formation' THEN 'formation-desk'
      WHEN 'insurance' THEN 'broker-station'
      WHEN 'notary' THEN 'notary-console'
      WHEN 'bookkeeping' THEN 'bookkeeping-pod'
      ELSE service_type
    END
    WHERE pod IS NULL OR pod = '';

    UPDATE service_enrollments
    SET priority = COALESCE(NULLIF(priority, ''), 'normal')
    WHERE priority IS NULL OR priority = '';

    UPDATE service_enrollments
    SET sla_deadline = CASE
      WHEN priority = 'urgent' THEN created_at + INTERVAL '4 hours'
      WHEN priority = 'high' THEN created_at + INTERVAL '24 hours'
      ELSE created_at + INTERVAL '48 hours'
    END
    WHERE sla_deadline IS NULL;

    INSERT INTO user_settings (user_id)
    SELECT id FROM user_profiles
    ON CONFLICT (user_id) DO NOTHING;
  `);
}

function seedMissingChecklists() {
  runSql(`
    WITH templates(service_type, display_order, label, visible_to_client) AS (
      VALUES
        ('tax', 1, 'Review client intake form', false),
        ('tax', 2, 'Verify all required documents received', true),
        ('tax', 3, 'W-2 forms collected', true),
        ('tax', 4, '1099 / freelance income docs', true),
        ('tax', 5, 'Prior year return reviewed', false),
        ('tax', 6, 'Deductions maximized', false),
        ('tax', 7, 'Draft return prepared', true),
        ('tax', 8, 'Senior review completed', false),
        ('tax', 9, 'Client review sent', true),
        ('tax', 10, 'Client approved return', true),
        ('tax', 11, 'Filed with IRS', true),
        ('formation', 1, 'Review entity intake', true),
        ('formation', 2, 'Collect owner details', true),
        ('formation', 3, 'Prepare formation documents', true),
        ('formation', 4, 'File with state', true),
        ('formation', 5, 'State approval received', true),
        ('formation', 6, 'EIN requested', true),
        ('formation', 7, 'Articles and EIN delivered', true),
        ('insurance', 1, 'Review intake and vehicle details', true),
        ('insurance', 2, 'Verify driver history', true),
        ('insurance', 3, 'Compare carrier quotes', true),
        ('insurance', 4, 'Send quote comparison', true),
        ('insurance', 5, 'Bind selected policy', true),
        ('insurance', 6, 'Deliver policy documents', true),
        ('notary', 1, 'Confirm appointment', true),
        ('notary', 2, 'Review uploaded document', true),
        ('notary', 3, 'Verify identity/KYC', true),
        ('notary', 4, 'Conduct notary session', true),
        ('notary', 5, 'Upload notarized document', true),
        ('notary', 6, 'Close notary record', true),
        ('bookkeeping', 1, 'Review bookkeeping intake', true),
        ('bookkeeping', 2, 'Collect bank statements or connection', true),
        ('bookkeeping', 3, 'Review prior accounting data', true),
        ('bookkeeping', 4, 'Set up Chart of Accounts', true),
        ('bookkeeping', 5, 'Enter opening balances', true),
        ('bookkeeping', 6, 'Categorize initial transactions', true),
        ('bookkeeping', 7, 'Generate first monthly report', true),
        ('bookkeeping', 8, 'Send report to client', true),
        ('bookkeeping', 9, 'Client confirmed ongoing service', true)
    )
    INSERT INTO case_checklist_items (enrollment_id, label, display_order, visible_to_client)
    SELECT e.id, t.label, t.display_order, t.visible_to_client
    FROM service_enrollments e
    JOIN templates t ON t.service_type = e.service_type
    WHERE NOT EXISTS (
      SELECT 1 FROM case_checklist_items c WHERE c.enrollment_id = e.id
    );
  `);
}

async function startMissingWorkflows() {
  const rows = jsonSql<EnrollmentRow>(`
    SELECT id, user_id, service_type, workflow_id
    FROM service_enrollments
    WHERE service_type IN ('tax','formation','insurance','notary','bookkeeping')
      AND (workflow_id IS NULL OR workflow_id = '')
      AND status IN ('pending','active')
  `);

  let started = 0;
  let marked = 0;
  let client: Client | null = null;
  for (const row of rows) {
    const deterministicId = `${row.service_type}-${row.id}`;
    try {
      if (!client) {
        const connection = await Connection.connect({
          address: (process.env.TEMPORAL_ADDRESS || "localhost:7233").trim(),
        });
        client = new Client({
          connection,
          namespace: (process.env.TEMPORAL_NAMESPACE || "divine-financial").trim(),
        });
      }
      const config = WORKFLOW_CONFIG[row.service_type];
      const handle = await client.workflow.start(config.workflowType, {
        taskQueue: config.taskQueue,
        workflowId: deterministicId,
        args: [{ enrollmentId: row.id, userId: row.user_id, serviceType: row.service_type }],
      });
      runSql(`UPDATE service_enrollments SET workflow_id = '${handle.workflowId.replace(/'/g, "''")}', updated_at = NOW() WHERE id = '${row.id}';`);
      started += 1;
    } catch {
      console.warn(`[backfill] Temporal start failed for ${row.id}; storing deterministic workflow id for retry visibility.`);
      runSql(`UPDATE service_enrollments SET workflow_id = '${deterministicId.replace(/'/g, "''")}', updated_at = NOW() WHERE id = '${row.id}';`);
      marked += 1;
    }
  }
  console.log(`[backfill] workflows started=${started}, marked_for_retry=${marked}`);
}

async function main() {
  bootstrapSchema();
  backfillEnrollmentFields();
  seedMissingChecklists();
  await startMissingWorkflows();

  const summary = jsonSql(`
    SELECT
      service_type,
      status,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE workflow_id IS NOT NULL AND workflow_id <> '')::int AS with_workflow,
      COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL)::int AS with_sla
    FROM service_enrollments
    GROUP BY service_type, status
    ORDER BY service_type, status
  `);
  console.log(JSON.stringify({ success: true, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
