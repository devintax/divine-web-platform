export interface EmailActivities {
  sendWelcomeEmail(params: { to: string; name: string; service: string }): Promise<void>;
  sendStaffNotificationEmail(params: { service: string; clientName: string; clientEmail: string; pod: string; enrollmentId: string; intakeSummary: Record<string, unknown> }): Promise<void>;
  sendStatusUpdateEmail(params: { to: string; name: string; service: string; status: string; message: string }): Promise<void>;
  sendMissingDocumentEmail(params: { to: string; name: string; service: string; missingItems: string[]; uploadLink: string }): Promise<void>;
  sendComplianceAlertEmail(params: { to: string; businessName: string; alertType: string; dueDate: string; message: string }): Promise<void>;
  sendCallbackConfirmationEmail(params: { to: string; name: string; callbackTime: string; service: string }): Promise<void>;
}

export interface DatabaseActivities {
  updateEnrollmentStatus(params: { enrollmentId: string; status: string; progress: number }): Promise<void>;
  updateFormationStatus(params: { formationId: string; status: string; sosConfirmationNumber?: string }): Promise<void>;
  updateVaultDocumentStatus(params: { documentId: string; status: string; virusClean?: boolean; storagePath?: string }): Promise<void>;
  writeAuditLog(params: { userId?: string; staffId?: string; action: string; resourceType?: string; resourceId?: string; metadata?: Record<string, unknown> }): Promise<void>;
  getEnrollmentById(enrollmentId: string): Promise<any>;
  softDeleteEnrollment(enrollmentId: string): Promise<void>;
  getExpiredLeads(): Promise<any[]>;
  getFormationsDueForCompliance(): Promise<any[]>;
  getPendingCallbacks(): Promise<any[]>;
}

export interface StorageActivities {
  generateUploadLink(params: { userId: string; recipientEmail: string; purpose: string; expiresInHours: number }): Promise<string>;
  simulateMalwareScan(documentId: string): Promise<boolean>;
}

export interface PaymentActivities {
  createStripePaymentLink(params: { service: string; amount: number; userId: string; enrollmentId: string; description: string }): Promise<string>;
}
