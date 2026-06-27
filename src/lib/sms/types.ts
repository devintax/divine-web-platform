export type SmsProviderName = "vendel" | "textbee";

export interface SmsSendResult {
  success: boolean;
  provider: SmsProviderName;
  messageId?: string;
  status?: string;
  error?: string;
}

export interface SmsHealthResult {
  online: boolean;
  detail?: string;
}

export interface SmsProvider {
  name: SmsProviderName;
  send(to: string, body: string): Promise<SmsSendResult>;
  checkHealth(): Promise<SmsHealthResult>;
}
