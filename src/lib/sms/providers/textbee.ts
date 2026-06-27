import type { SmsHealthResult, SmsProvider, SmsSendResult } from "../types";

export class TextBeeProvider implements SmsProvider {
  name = "textbee" as const;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly deviceId: string;
  private readonly apiRoot: string;

  constructor() {
    const apiUrl = process.env.TEXTBEE_API_URL;
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;
    if (!apiUrl || !apiKey || !deviceId) {
      const missing = [
        !apiUrl && "TEXTBEE_API_URL",
        !apiKey && "TEXTBEE_API_KEY",
        !deviceId && "TEXTBEE_DEVICE_ID",
      ].filter(Boolean).join(", ");
      throw new Error(`TextBee not configured - missing: ${missing}`);
    }
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiRoot = this.apiUrl.endsWith("/api/v1") ? this.apiUrl : `${this.apiUrl}/api/v1`;
    this.apiKey = apiKey;
    this.deviceId = deviceId;
  }

  async send(to: string, body: string): Promise<SmsSendResult> {
    try {
      const response = await fetch(`${this.apiRoot}/gateway/devices/${this.deviceId}/send-sms`, {
        method: "POST",
        headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: [to], message: body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, provider: this.name, error: data.message || data.error || `TextBee HTTP ${response.status}` };
      }
      const messageId = data?.data?.id || data?.id;
      return {
        success: true,
        provider: this.name,
        messageId: messageId ? String(messageId) : undefined,
        status: data?.data?.status || data?.status || "sent",
      };
    } catch (error) {
      return { success: false, provider: this.name, error: error instanceof Error ? error.message : "TextBee network error" };
    }
  }

  async checkHealth(): Promise<SmsHealthResult> {
    try {
      const response = await fetch(`${this.apiRoot}/gateway/devices`, {
        headers: { "x-api-key": this.apiKey },
      });
      if (!response.ok) return { online: false, detail: `HTTP ${response.status}` };
      const data = await response.json().catch(() => ({}));
      const devices = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const device = devices.find((item: any) => item?._id === this.deviceId || item?.id === this.deviceId) || devices[0] || {};
      const online = device?.isOnline === true || device?.online === true || device?.status === "online" || (device?.enabled !== false && device?.status !== "offline");
      const hasFcmToken = Boolean(device?.fcmToken || device?.fcm_token || device?.pushToken || device?.push_token || device?.firebaseToken);
      const label = [device?.brand, device?.model].filter(Boolean).join(" ") || device?.name || device?.deviceName || device?.manufacturer || "FOXXD C10";
      if (!device?._id && !device?.id) return { online: false, detail: "No TextBee devices returned" };
      const fcmDetail = hasFcmToken ? "FCM token registered" : "No FCM token - reinstall TextBee app with project textbee-gateway-2410a";
      return { online, detail: `${label} - ${online ? "Online" : "Offline"} - ${fcmDetail}` };
    } catch (error) {
      return { online: false, detail: error instanceof Error ? error.message : "TextBee unreachable" };
    }
  }
}
