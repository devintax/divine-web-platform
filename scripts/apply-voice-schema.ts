import { execFileSync } from "child_process";

const POSTGRES_CONTAINER = process.env.INSFORGE_POSTGRES_CONTAINER || "insforge-backend-postgres-1";

const SQL = `
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS dograh_call_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS recording_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS full_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ended_reason VARCHAR(100);

ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS call_source VARCHAR(50) DEFAULT 'human';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'call_logs'
      AND column_name = 'call_source'
      AND constraint_name LIKE '%call_source%'
  ) THEN
    ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_call_source_check;
  END IF;
END $$;

ALTER TABLE call_logs
  ADD CONSTRAINT call_logs_call_source_check
  CHECK (call_source IN ('human','ai_voice_agent','inbound','outbound','manual','web'));

CREATE INDEX IF NOT EXISTS idx_call_logs_dograh
  ON call_logs(dograh_call_id)
  WHERE dograh_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_source_created
  ON call_logs(call_source, created_at DESC);

NOTIFY pgrst, 'reload schema';
`;

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

function main() {
  console.log(`[voice-schema] applying to ${POSTGRES_CONTAINER}`);
  const output = runSql(SQL);
  console.log(output.trim());
  console.log("[voice-schema] complete");
}

main();
