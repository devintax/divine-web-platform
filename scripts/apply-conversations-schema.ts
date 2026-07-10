import { execFileSync } from "child_process";

const POSTGRES_CONTAINER = process.env.INSFORGE_POSTGRES_CONTAINER || "insforge-backend-postgres-1";

const SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct','group','broadcast','case')),
  title VARCHAR(255),
  direct_key VARCHAR(255) UNIQUE,
  created_by UUID REFERENCES user_profiles(id),
  audience_type VARCHAR(100),
  audience_filter JSONB DEFAULT '{}'::jsonb,
  case_enrollment_id UUID REFERENCES service_enrollments(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id),
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  delivery_status VARCHAR(20) DEFAULT 'queued' CHECK (delivery_status IN ('queued','notified','failed')),
  error_message TEXT,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_targets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Users can view own conversations') THEN
    CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversation_participants' AND policyname = 'Users can view own conversation participants') THEN
    CREATE POLICY "Users can view own conversation participants" ON conversation_participants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversation_messages' AND policyname = 'Users can view own conversation messages') THEN
    CREATE POLICY "Users can view own conversation messages" ON conversation_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'broadcast_targets' AND policyname = 'Users can view own broadcast targets') THEN
    CREATE POLICY "Users can view own broadcast targets" ON broadcast_targets FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_direct_key ON conversations(direct_key) WHERE direct_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_targets_conversation ON broadcast_targets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_targets_user ON broadcast_targets(user_id, delivery_status);

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
  console.log(`[conversations-schema] applying to ${POSTGRES_CONTAINER}`);
  const output = runSql(SQL);
  console.log(output.trim());
  console.log("[conversations-schema] complete");
}

main();
