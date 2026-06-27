export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: { action: string; created_at: string | null; event_id: string | null; id: number; ip_address: unknown; metadata: Json | null; resource_id: string | null; resource_type: string | null; staff_id: string | null; user_agent: string | null; user_id: string | null }
        Insert: { action: string; created_at?: string | null; event_id?: string | null; id?: number; ip_address?: unknown; metadata?: Json | null; resource_id?: string | null; resource_type?: string | null; staff_id?: string | null; user_agent?: string | null; user_id?: string | null }
        Update: { action?: string; created_at?: string | null; event_id?: string | null; id?: number; ip_address?: unknown; metadata?: Json | null; resource_id?: string | null; resource_type?: string | null; staff_id?: string | null; user_agent?: string | null; user_id?: string | null }
        Relationships: []
      }
      chat_messages: {
        Row: { content: string; created_at: string | null; id: string; role: string; user_id: string | null }
        Insert: { content: string; created_at?: string | null; id?: string; role: string; user_id?: string | null }
        Update: { content?: string; created_at?: string | null; id?: string; role?: string; user_id?: string | null }
        Relationships: []
      }
      contact_submissions: {
        Row: { created_at: string | null; email: string; full_name: string; id: string; message: string | null; phone: string | null; service_interest: string | null; status: string | null }
        Insert: { created_at?: string | null; email: string; full_name: string; id?: string; message?: string | null; phone?: string | null; service_interest?: string | null; status?: string | null }
        Update: { created_at?: string | null; email?: string; full_name?: string; id?: string; message?: string | null; phone?: string | null; service_interest?: string | null; status?: string | null }
        Relationships: []
      }
      formations: {
        Row: { business_name: string | null; created_at: string | null; entity_type: string | null; filing_status: string | null; id: string; state_of_formation: string | null; use_divine_agent: boolean | null; user_id: string | null }
        Insert: { business_name?: string | null; created_at?: string | null; entity_type?: string | null; filing_status?: string | null; id?: string; state_of_formation?: string | null; use_divine_agent?: boolean | null; user_id?: string | null }
        Update: { business_name?: string | null; created_at?: string | null; entity_type?: string | null; filing_status?: string | null; id?: string; state_of_formation?: string | null; use_divine_agent?: boolean | null; user_id?: string | null }
        Relationships: []
      }
      insurance_quotes: {
        Row: { carrier: string | null; created_at: string | null; driver_history: string | null; id: string; monthly_premium: number | null; status: string | null; user_id: string | null; vehicle_usage: string | null; zip_code: string | null }
        Insert: { carrier?: string | null; created_at?: string | null; driver_history?: string | null; id?: string; monthly_premium?: number | null; status?: string | null; user_id?: string | null; vehicle_usage?: string | null; zip_code?: string | null }
        Update: { carrier?: string | null; created_at?: string | null; driver_history?: string | null; id?: string; monthly_premium?: number | null; status?: string | null; user_id?: string | null; vehicle_usage?: string | null; zip_code?: string | null }
        Relationships: []
      }
      notary_sessions: {
        Row: { created_at: string | null; document_type: string | null; id: string; kyc_verified: boolean | null; scheduled_time: string | null; session_status: string | null; signer_count: number | null; user_id: string | null }
        Insert: { created_at?: string | null; document_type?: string | null; id?: string; kyc_verified?: boolean | null; scheduled_time?: string | null; session_status?: string | null; signer_count?: number | null; user_id?: string | null }
        Update: { created_at?: string | null; document_type?: string | null; id?: string; kyc_verified?: boolean | null; scheduled_time?: string | null; session_status?: string | null; signer_count?: number | null; user_id?: string | null }
        Relationships: []
      }
      service_enrollments: {
        Row: { created_at: string | null; id: string; intake_data: Json | null; progress: number | null; service_type: string | null; status: string | null; updated_at: string | null; user_id: string | null }
        Insert: { created_at?: string | null; id?: string; intake_data?: Json | null; progress?: number | null; service_type?: string | null; status?: string | null; updated_at?: string | null; user_id?: string | null }
        Update: { created_at?: string | null; id?: string; intake_data?: Json | null; progress?: number | null; service_type?: string | null; status?: string | null; updated_at?: string | null; user_id?: string | null }
        Relationships: []
      }
      upload_links: {
        Row: { client_user_id: string | null; created_at: string | null; created_by: string | null; email_sent_at: string | null; enrollment_id: string | null; expires_at: string | null; id: string; is_active: boolean | null; max_uses: number | null; purpose: string | null; recipient_email: string | null; sms_sent_at: string | null; token: string | null; used_at: string | null; used_count: number | null }
        Insert: { client_user_id?: string | null; created_at?: string | null; created_by?: string | null; email_sent_at?: string | null; enrollment_id?: string | null; expires_at?: string | null; id?: string; is_active?: boolean | null; max_uses?: number | null; purpose?: string | null; recipient_email?: string | null; sms_sent_at?: string | null; token?: string | null; used_at?: string | null; used_count?: number | null }
        Update: { client_user_id?: string | null; created_at?: string | null; created_by?: string | null; email_sent_at?: string | null; enrollment_id?: string | null; expires_at?: string | null; id?: string; is_active?: boolean | null; max_uses?: number | null; purpose?: string | null; recipient_email?: string | null; sms_sent_at?: string | null; token?: string | null; used_at?: string | null; used_count?: number | null }
        Relationships: []
      }
      user_profiles: {
        Row: { address_line1: string | null; address_line2: string | null; city: string | null; created_at: string | null; health_score: number | null; id: string; legal_name: string | null; phone: string | null; role: string | null; state: string | null; updated_at: string | null; zip_code: string | null }
        Insert: { address_line1?: string | null; address_line2?: string | null; city?: string | null; created_at?: string | null; health_score?: number | null; id: string; legal_name?: string | null; phone?: string | null; role?: string | null; state?: string | null; updated_at?: string | null; zip_code?: string | null }
        Update: { address_line1?: string | null; address_line2?: string | null; city?: string | null; created_at?: string | null; health_score?: number | null; id?: string; legal_name?: string | null; phone?: string | null; role?: string | null; state?: string | null; updated_at?: string | null; zip_code?: string | null }
        Relationships: []
      }
      vault_documents: {
        Row: { category: string | null; content_md5: string | null; content_sha256: string | null; created_at: string | null; deleted_at: string | null; display_name: string | null; document_version: number | null; enrollment_id: string | null; file_name: string | null; file_size: number | null; id: string; is_deleted: boolean | null; mime_type: string | null; ocr_tags: string[] | null; original_document_id: string | null; pii_flags: Json | null; routed_to: string | null; scan_notes: string | null; share_link_expires: string | null; share_link_token: string | null; status: string | null; storage_bucket: string | null; storage_key: string | null; storage_path: string | null; storage_url: string | null; uploaded_via: string | null; user_id: string | null; virus_clean: boolean | null; virus_scanned: boolean | null }
        Insert: { category?: string | null; content_md5?: string | null; content_sha256?: string | null; created_at?: string | null; deleted_at?: string | null; display_name?: string | null; document_version?: number | null; enrollment_id?: string | null; file_name?: string | null; file_size?: number | null; id?: string; is_deleted?: boolean | null; mime_type?: string | null; ocr_tags?: string[] | null; original_document_id?: string | null; pii_flags?: Json | null; routed_to?: string | null; scan_notes?: string | null; share_link_expires?: string | null; share_link_token?: string | null; status?: string | null; storage_bucket?: string | null; storage_key?: string | null; storage_path?: string | null; storage_url?: string | null; uploaded_via?: string | null; user_id?: string | null; virus_clean?: boolean | null; virus_scanned?: boolean | null }
        Update: { category?: string | null; content_md5?: string | null; content_sha256?: string | null; created_at?: string | null; deleted_at?: string | null; display_name?: string | null; document_version?: number | null; enrollment_id?: string | null; file_name?: string | null; file_size?: number | null; id?: string; is_deleted?: boolean | null; mime_type?: string | null; ocr_tags?: string[] | null; original_document_id?: string | null; pii_flags?: Json | null; routed_to?: string | null; scan_notes?: string | null; share_link_expires?: string | null; share_link_token?: string | null; status?: string | null; storage_bucket?: string | null; storage_key?: string | null; storage_path?: string | null; storage_url?: string | null; uploaded_via?: string | null; user_id?: string | null; virus_clean?: boolean | null; virus_scanned?: boolean | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
