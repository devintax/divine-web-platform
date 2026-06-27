import { VendelClient } from "vendel-sdk";
import type { SmsHealthResult, SmsProvider, SmsSendResult } from "../types";

export class VendelProvider implements SmsProvider {
  name = "vendel" as const;
  private client: VendelClient;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly deviceId?: string;

  constructor() {
    const apiUrl = process.env.VENDEL_API_URL;
    const apiKey = process.env.VENDEL_API_KEY;
    if (!apiUrl || !apiKey) throw new Error("Vendel not configured - missing VENDEL_API_URL or VENDEL_API_KEY");
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.deviceId = process.env.VENDEL_DEVICE_ID || undefined;
    this.client = new VendelClient({ baseUrl: this.apiUrl, apiKey });
  }

  async send(to: string, body: string): Promise<SmsSendResult> {
    try {
      const result = await this.client.sendSms([to], body, this.deviceId ? { deviceId: this.deviceId } : undefined);
      const data = unwrapEnvelope(result);
      const messageId = messageIdFrom(data) || messageIdFrom(result);
      return {
        success: true,
        provider: this.name,
        messageId: messageId ? String(messageId) : undefined,
        status: (data as any)?.status || (result as any)?.message || "accepted",
      };
    } catch (error) {
      console.warn("[vendel] SDK send failed, trying REST fallback:", error instanceof Error ? error.message : error);
      return this.restSend(to, body);
    }
  }

  private async restSend(to: string, body: string): Promise<SmsSendResult> {
    const basePayload: Record<string, unknown> = { recipients: [to], body };
    if (this.deviceId) basePayload.device_id = this.deviceId;

    const attempts = this.restAuthAttempts(basePayload);
    const failures: string[] = [];

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url, {
          method: "POST",
          headers: attempt.headers,
          body: JSON.stringify(attempt.payload),
        });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
          const text = await response.text().catch(() => "");
          failures.push(`${attempt.name}: non-JSON HTTP ${response.status} ${text.slice(0, 80)}`);
          continue;
        }

        const envelope = await response.json().catch(() => ({}));
        const data = unwrapEnvelope(envelope);
        const envelopeCode = Number((envelope as any)?.code || (envelope as any)?.status || response.status);
        const isSuccess = response.ok || (envelopeCode >= 200 && envelopeCode < 300);
        if (!isSuccess) {
          failures.push(`${attempt.name}: ${(envelope as any)?.message || (data as any)?.error || `HTTP ${response.status}`}`);
          continue;
        }

        const messageId = messageIdFrom(data) || messageIdFrom(envelope);
        return {
          success: true,
          provider: this.name,
          messageId: messageId ? String(messageId) : undefined,
          status: (data as any)?.status || (envelope as any)?.message || "accepted",
        };
      } catch (error) {
        failures.push(`${attempt.name}: ${error instanceof Error ? error.message : "request failed"}`);
      }
    }

    return {
      success: false,
      provider: this.name,
      error: failures.length ? `Vendel auth/send failed (${failures.join("; ")})` : "Vendel REST send failed",
    };
  }

  private restAuthAttempts(payload: Record<string, unknown>) {
    const mode = process.env.VENDEL_AUTH_MODE?.toLowerCase();
    const attempts: Array<{ name: string; url: string; headers: Record<string, string>; payload: Record<string, unknown> }> = [
      {
        name: "x-api-key",
        url: `${this.apiUrl}/api/sms/send`,
        headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json" },
        payload,
      },
      {
        name: "bearer",
        url: `${this.apiUrl}/api/sms/send`,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        payload,
      },
      {
        name: "body-apiKey",
        url: `${this.apiUrl}/api/sms/send`,
        headers: { "Content-Type": "application/json" },
        payload: { ...payload, apiKey: this.apiKey },
      },
      {
        name: "query-api-key",
        url: `${this.apiUrl}/api/sms/send?api_key=${encodeURIComponent(this.apiKey)}`,
        headers: { "Content-Type": "application/json" },
        payload,
      },
    ];
    return mode ? attempts.filter((attempt) => attempt.name === mode) : attempts;
  }

  async checkHealth(): Promise<SmsHealthResult> {
    try {
      const healthResponse = await fetch(`${this.apiUrl}/api/health`, {
        headers: { "X-API-Key": this.apiKey },
      });
      if (!healthResponse.ok) return { online: false, detail: `Health check failed: HTTP ${healthResponse.status}` };

      const devicesResponse = await fetch(`${this.apiUrl}/api/devices`, {
        headers: { "X-API-Key": this.apiKey },
      });
      if (!devicesResponse.ok) return { online: true, detail: `API healthy - FOXXD C10 (${this.deviceId || "device id not set"})` };

      const envelope = await devicesResponse.json().catch(() => ({}));
      const data = unwrapEnvelope(envelope);
      const devices = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
      const onlineCount = devices.filter((device: any) => device.status === "online" || device.online === true || device.isOnline === true).length;
      const foxxd = devices.find((device: any) => device.id === this.deviceId || device._id === this.deviceId || device.name === "FOXXD C10");
      return {
        online: true,
        detail: foxxd ? `FOXXD C10 registered (${foxxd.phone_number || foxxd.phone || "+13025226002"})` : `${devices.length} device(s), ${onlineCount} online`,
      };
    } catch (error) {
      return { online: false, detail: error instanceof Error ? error.message : "Vendel unreachable" };
    }
  }
}

function firstString(value: unknown) {
  return Array.isArray(value) && value.length ? String(value[0]) : undefined;
}

function unwrapEnvelope(value: unknown) {
  const data = (value as any)?.data;
  return data === undefined ? value : data;
}

function messageIdFrom(value: unknown) {
  return firstString((value as any)?.message_ids) || (value as any)?.messageId || (value as any)?.id || (value as any)?.batch_id;
}
