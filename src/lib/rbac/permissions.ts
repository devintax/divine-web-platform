import type { UserRole } from './roles'

export type Permission =
  | 'view_own_data'
  | 'view_any_client_basic_pii'
  | 'view_any_client_full_pii'
  | 'view_ssn_ein_unmasked'
  | 'edit_any_client_profile'
  | 'impersonate_client'
  | 'delete_client_account'
  | 'create_any_account'
  | 'reset_any_password'
  | 'reset_any_mfa'
  | 'disable_any_account'
  | 'manage_staff_accounts'
  | 'assign_any_role'
  | 'create_super_admin'
  | 'approve_new_user'
  | 'vault_see_file_exists'
  | 'vault_open_tax_files'
  | 'vault_open_insurance_files'
  | 'vault_open_legal_files'
  | 'vault_open_any_file'
  | 'vault_upload_to_any_client'
  | 'vault_soft_delete'
  | 'vault_restore_deleted'
  | 'vault_hard_delete'
  | 'vault_generate_upload_link'
  | 'vault_view_file_audit'
  | 'access_tax_module'
  | 'approve_tax_filing'
  | 'access_bookkeeping_module'
  | 'access_insurance_module'
  | 'bind_insurance_policy'
  | 'access_formation_module'
  | 'submit_sos_filing'
  | 'access_notary_module'
  | 'conduct_notary_session'
  | 'approve_kyc'
  | 'trigger_new_workflow'
  | 'signal_workflow'
  | 'terminate_workflow'
  | 'view_workflow_status'
  | 'view_case_queue'
  | 'assign_cases_to_staff'
  | 'view_all_audit_logs'
  | 'export_audit_logs'
  | 'break_glass_override'
  | 'generate_analytics_reports'
  | 'manage_client_billing'
  | 'issue_refunds'
  | 'manage_service_bundles'
  | 'send_bulk_notifications'
  | 'manage_platform_settings'
  | 'manage_api_integrations'
  | 'view_system_health_dashboard'
  | 'edit_public_website_content'
  | 'enable_maintenance_mode'
  | 'full_unrestricted_data_access'
  | 'permanent_data_deletion'
  | 'view_encryption_key_metadata'
  | 'send_email_to_client'
  | 'send_sms_to_client'
  | 'view_any_chat_history'
  | 'join_any_live_chat'
  // Backwards-compatible aliases used by earlier admin code.
  | 'view_client_contact'
  | 'view_client_documents'
  | 'view_client_financials'
  | 'view_any_client_data'
  | 'edit_client_data'
  | 'edit_any_account'
  | 'reset_user_password'
  | 'assign_roles'
  | 'view_staff_accounts'
  | 'vault_download_file'
  | 'vault_upload_file'
  | 'vault_delete_file'
  | 'vault_view_file_metadata'
  | 'assign_case'
  | 'view_audit_logs'
  | 'view_insurance_quotes'
  | 'approve_insurance_quote'
  | 'toggle_maintenance_mode'

const Y = true
const N = false

type RoleMatrix = Record<UserRole, boolean>

const matrix = (values: RoleMatrix) => values

export const PERMISSIONS: Record<Permission, RoleMatrix> = {
  view_own_data:                  matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),
  view_any_client_basic_pii:      matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),
  view_any_client_full_pii:       matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:N, support:N, client:N }),
  view_ssn_ein_unmasked:          matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:N, support:N, client:N }),
  edit_any_client_profile:        matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  impersonate_client:             matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  delete_client_account:          matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),

  create_any_account:             matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  reset_any_password:             matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  reset_any_mfa:                  matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  disable_any_account:            matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  manage_staff_accounts:          matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  assign_any_role:                matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  create_super_admin:             matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  approve_new_user:               matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),

  vault_see_file_exists:          matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),
  vault_open_tax_files:           matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:Y, support:N, client:Y }),
  vault_open_insurance_files:     matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:Y, notary:N, tax_intern:N, support:N, client:Y }),
  vault_open_legal_files:         matrix({ super_admin:Y, manager:Y, accountant:N, specialist:Y, broker:N, notary:Y, tax_intern:N, support:N, client:Y }),
  vault_open_any_file:            matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  vault_upload_to_any_client:     matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),
  vault_soft_delete:              matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  vault_restore_deleted:          matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  vault_hard_delete:              matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  vault_generate_upload_link:     matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),
  vault_view_file_audit:          matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:Y }),

  access_tax_module:              matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:Y, support:N, client:N }),
  approve_tax_filing:             matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  access_bookkeeping_module:      matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  access_insurance_module:        matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:Y, notary:N, tax_intern:N, support:N, client:N }),
  bind_insurance_policy:          matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:Y, notary:N, tax_intern:N, support:N, client:N }),
  access_formation_module:        matrix({ super_admin:Y, manager:Y, accountant:N, specialist:Y, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  submit_sos_filing:              matrix({ super_admin:Y, manager:Y, accountant:N, specialist:Y, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  access_notary_module:           matrix({ super_admin:Y, manager:Y, accountant:N, specialist:Y, broker:N, notary:Y, tax_intern:N, support:N, client:N }),
  conduct_notary_session:         matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:Y, tax_intern:N, support:N, client:N }),
  approve_kyc:                    matrix({ super_admin:Y, manager:Y, accountant:N, specialist:Y, broker:N, notary:Y, tax_intern:N, support:N, client:N }),

  trigger_new_workflow:           matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:N, support:N, client:N }),
  signal_workflow:                matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:N, support:N, client:N }),
  terminate_workflow:             matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  view_workflow_status:           matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),

  view_case_queue:                matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),
  assign_cases_to_staff:          matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  view_all_audit_logs:            matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  export_audit_logs:              matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  break_glass_override:           matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  generate_analytics_reports:     matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  manage_client_billing:          matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  issue_refunds:                  matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  manage_service_bundles:         matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  send_bulk_notifications:        matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),

  manage_platform_settings:       matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  manage_api_integrations:        matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  view_system_health_dashboard:   matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  edit_public_website_content:    matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  enable_maintenance_mode:        matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  full_unrestricted_data_access:  matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  permanent_data_deletion:        matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  view_encryption_key_metadata:   matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),

  send_email_to_client:           matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),
  send_sms_to_client:             matrix({ super_admin:Y, manager:Y, accountant:N, specialist:Y, broker:Y, notary:Y, tax_intern:N, support:Y, client:N }),
  view_any_chat_history:          matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  join_any_live_chat:             matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),

  view_client_contact:            matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),
  view_client_documents:          matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),
  view_client_financials:         matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:Y, support:N, client:Y }),
  view_any_client_data:           matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:N }),
  edit_client_data:               matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  edit_any_account:               matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  reset_user_password:            matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  assign_roles:                   matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  view_staff_accounts:            matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  vault_download_file:            matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:N, client:Y }),
  vault_upload_file:              matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),
  vault_delete_file:              matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  vault_view_file_metadata:       matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:Y, broker:Y, notary:Y, tax_intern:Y, support:Y, client:Y }),
  assign_case:                    matrix({ super_admin:Y, manager:Y, accountant:Y, specialist:N, broker:N, notary:N, tax_intern:N, support:Y, client:N }),
  view_audit_logs:                matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
  view_insurance_quotes:          matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:Y, notary:N, tax_intern:N, support:N, client:N }),
  approve_insurance_quote:        matrix({ super_admin:Y, manager:Y, accountant:N, specialist:N, broker:Y, notary:N, tax_intern:N, support:N, client:N }),
  toggle_maintenance_mode:        matrix({ super_admin:Y, manager:N, accountant:N, specialist:N, broker:N, notary:N, tax_intern:N, support:N, client:N }),
}
