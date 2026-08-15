import "server-only";

export type DograhAgent = {
  id: string | number;
  name?: string;
  voice?: string;
  status?: "active" | "inactive" | string;
  created_at?: string;
  workflow_uuid?: string;
};

export type DograhCall = {
  id: string;
  name?: string;
  status?: "queued" | "ringing" | "in-progress" | "completed" | "failed" | string;
  direction?: "inbound" | "outbound" | string;
  from?: string;
  to?: string;
  duration?: number;
  recording_url?: string;
  transcript?: string;
  summary?: string;
  ended_reason?: string;
  started_at?: string;
  ended_at?: string;
  agent_id?: string;
  metadata?: Record<string, unknown>;
};

type TriggerWorkflowResponse = {
  id?: string;
  run_id?: string;
  workflow_run_id?: string;
  workflow_run_name?: string;
  status?: string;
  data?: any;
  run?: any;
  workflow_run?: any;
  call?: any;
};

export type DograhTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type CreateAgentParams = {
  name: string;
  firstMessage: string;
  systemPrompt: string;
  voice?: string;
  webhookUrl?: string;
  tools?: DograhTool[];
  transferPhoneNumber?: string;
};

function baseUrl() {
  return (process.env.DOGRAH_BASE_URL || "https://dograh.dfgworld.net").trim().replace(/\/+$/, "");
}

function apiKey() {
  return process.env.DOGRAH_API_KEY || "";
}

function configured() {
  return Boolean(baseUrl() && apiKey());
}

function triggerPath() {
  return (process.env.DOGRAH_TRIGGER_NODE_ID || process.env.DOGRAH_TRIGGER_PATH || "").trim();
}

function triggerMode() {
  return process.env.DOGRAH_TRIGGER_MODE === "production" ? "production" : "test";
}

function telephonyConfigurationId() {
  return (process.env.DOGRAH_TELEPHONY_CONFIG_ID || "").trim();
}

function headers() {
  const key = apiKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { "X-API-Key": key } : {}),
  };
}

function apiPath(path: string) {
  if (path.startsWith("/api/v1/")) return path;
  if (path.startsWith("/api/")) return `/api/v1/${path.slice(5)}`;
  return `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}

async function dograh<T>(path: string, init?: RequestInit): Promise<T> {
  if (!configured()) throw new Error("Dograh is not configured");
  const resolvedPath = apiPath(path);
  const res = await fetch(`${baseUrl()}${resolvedPath}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  const payload = text ? safeJson(text) : {};
  if (!res.ok) {
    const message = sanitizeDograhMessage(payload?.detail || payload?.message || payload?.error || text || `HTTP ${res.status}`);
    throw new Error(`Dograh ${resolvedPath}: ${message}`);
  }
  return payload as T;
}

export async function listAgents(): Promise<DograhAgent[]> {
  const data: any = await dograh("/workflow/fetch");
  return data.agents || data.data?.agents || data.data || data || [];
}

export async function createAgent(params: CreateAgentParams): Promise<DograhAgent> {
  const data: any = await dograh("/workflow/create/template", {
    method: "POST",
    body: JSON.stringify({
      call_type: "outbound",
      use_case: params.name,
      activity_description: `${params.firstMessage}\n\n${params.systemPrompt}\n\nWebhook URL: ${params.webhookUrl || ""}\nTransfer phone: ${params.transferPhoneNumber || ""}`,
    }),
  });
  return data.agent || data.workflow || data.data || data;
}

export async function updateAgent(agentId: string, params: Partial<CreateAgentParams>): Promise<DograhAgent> {
  const data: any = await dograh(`/workflow/${encodeURIComponent(agentId)}`, {
    method: "PUT",
    body: JSON.stringify({
      name: params.name,
      first_message: params.firstMessage,
      system_prompt: params.systemPrompt,
      voice: params.voice,
      webhook_url: params.webhookUrl,
      tools: params.tools,
      transfer_phone_number: params.transferPhoneNumber,
    }),
  });
  return data.agent || data.data || data;
}

export async function makeOutboundCall(params: {
  to: string;
  agentId?: string | null;
  staffId?: string;
  metadata?: Record<string, unknown>;
}): Promise<DograhCall> {
  const agentId = params.agentId || process.env.DOGRAH_AGENT_ID;
  if (!agentId) {
    throw new Error("DOGRAH_AGENT_ID is not configured. Run npm run voice:setup, then add the printed DOGRAH_AGENT_ID to .env.local and restart Next.js.");
  }
  const path = triggerPath();
  if (!path) {
    throw new Error("DOGRAH_TRIGGER_NODE_ID is not configured. Add an API Trigger node in Dograh, then set DOGRAH_TRIGGER_NODE_ID to its trigger path.");
  }

  const payload = {
    agent_id: agentId,
    agent_uuid: agentId,
    to: params.to,
    phone_number: params.to,
    recipient_phone: params.to,
    from: process.env.DFG_PHONE_NUMBER || "+13023225515",
    metadata: { staff_id: params.staffId, ...(params.metadata || {}) },
  };

  const triggerEndpoint = triggerMode() === "production" ? `/public/agent/${encodeURIComponent(path)}` : `/public/agent/test/${encodeURIComponent(path)}`;
  const workflowEndpoint = triggerMode() === "production"
    ? `/public/agent/workflow/${encodeURIComponent(agentId)}`
    : `/public/agent/test/workflow/${encodeURIComponent(agentId)}`;
  const telephonyConfigId = telephonyConfigurationId();
  const data = await dograh<TriggerWorkflowResponse>(triggerEndpoint, {
    method: "POST",
    body: JSON.stringify({
      phone_number: params.to,
      ...(telephonyConfigId ? { telephony_configuration_id: /^\d+$/.test(telephonyConfigId) ? Number(telephonyConfigId) : telephonyConfigId } : {}),
      initial_context: payload,
    }),
  }).catch((error) => {
    const message = String(error?.message || "");
    if (!message.includes("Agent trigger not found")) throw error;
    return dograh<TriggerWorkflowResponse>(workflowEndpoint, {
      method: "POST",
      body: JSON.stringify({
        phone_number: params.to,
        ...(telephonyConfigId ? { telephony_configuration_id: /^\d+$/.test(telephonyConfigId) ? Number(telephonyConfigId) : telephonyConfigId } : {}),
        initial_context: payload,
      }),
    });
  });

  const call = data.call || data.run || data.workflow_run || data.data || data;
  const id = call.id || call.run_id || call.workflow_run_id || data.id || data.run_id || data.workflow_run_id;
  if (!id) {
    throw new Error("Dograh accepted the request but did not return a run ID.");
  }

  return {
    ...call,
    id,
    name: call.name || data.workflow_run_name,
    status: call.status || data.status || "queued",
    direction: call.direction || "outbound",
    to: call.to || params.to,
    from: call.from || process.env.DFG_PHONE_NUMBER || "+13023225515",
    agent_id: call.agent_id || agentId,
    metadata: call.metadata || payload.metadata,
  };
}

export async function listCalls(params?: { limit?: number; before?: string; direction?: "inbound" | "outbound" }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.before) qs.set("before", params.before);
  if (params?.direction) qs.set("direction", params.direction);
  const data: any = await dograh(`/calls${qs.size ? `?${qs}` : ""}`);
  return (data.calls || data.data?.calls || data.data || data || []) as DograhCall[];
}

export async function getCall(callId: string): Promise<DograhCall> {
  const data: any = await dograh(`/calls/${encodeURIComponent(callId)}`);
  return data.call || data.data || data;
}

export async function getRecordingUrl(callId: string): Promise<string | null> {
  try {
    const data: any = await dograh(`/calls/${encodeURIComponent(callId)}/recording`);
    return data.url || data.recording_url || data.data?.url || null;
  } catch {
    return null;
  }
}

export async function checkDograhHealth() {
  if (!configured()) {
    return { online: false, configured: false, version: "1.41.0", agents: 0, detail: "DOGRAH_API_KEY is not configured" };
  }
  try {
    const [health, agents] = await Promise.allSettled([
      dograh<any>("/health"),
      listAgents(),
    ]);
    const healthValue = health.status === "fulfilled" ? health.value : {};
    return {
      online: health.status === "fulfilled",
      configured: true,
      version: normalizeVersion(healthValue.version || healthValue.data?.version || "1.41.0"),
      agents: agents.status === "fulfilled" ? agents.value.length : 0,
      agentId: process.env.DOGRAH_AGENT_ID || null,
      telephonyConfigurationId: telephonyConfigurationId() || null,
      detail: health.status === "fulfilled" ? "Dograh API reachable" : sanitizeDograhMessage(health.reason?.message || "Dograh API unavailable"),
    };
  } catch (error: any) {
    return { online: false, configured: true, version: "1.41.0", agents: 0, detail: sanitizeDograhMessage(error?.message || "Dograh API unavailable") };
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sanitizeDograhMessage(message: unknown) {
  const text = typeof message === "string" ? message : "Dograh API unavailable";
  if (/<\/?[a-z][\s\S]*>/i.test(text) || text.includes("<!DOCTYPE")) {
    return "Dograh returned an HTML page instead of API JSON. Check the API path and X-API-Key header.";
  }
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function normalizeVersion(version: unknown) {
  const text = typeof version === "string" ? version : "1.41.0";
  return text.trim().replace(/^v+/i, "") || "1.41.0";
}
