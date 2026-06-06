-- Divine Financial Group — Database Schema
-- Run this in your Supabase SQL Editor

-- Users and Auth (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  legal_name VARCHAR(255),
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  role VARCHAR(50) DEFAULT 'client',
  health_score INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Service Enrollments
CREATE TABLE service_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  service_type VARCHAR(50) CHECK (service_type IN ('tax','bookkeeping','formation','insurance','notary')),
  status VARCHAR(50) CHECK (status IN ('draft','pending','active','completed','cancelled')),
  progress INTEGER DEFAULT 0,
  intake_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document Vault
CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  file_name VARCHAR(255),
  display_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  storage_path VARCHAR(500),
  category VARCHAR(50) CHECK (category IN ('tax','formation','insurance','notary','bookkeeping','general')),
  status VARCHAR(50) CHECK (status IN ('quarantine','scanning','clean','flagged','archived')),
  uploaded_via VARCHAR(50) CHECK (uploaded_via IN ('direct','share_link','staff_upload')),
  share_link_token UUID UNIQUE,
  share_link_expires TIMESTAMP,
  virus_scanned BOOLEAN DEFAULT FALSE,
  virus_clean BOOLEAN,
  ocr_tags TEXT[],
  routed_to VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Secure Upload Links
CREATE TABLE upload_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES user_profiles(id),
  recipient_email VARCHAR(255),
  purpose VARCHAR(255),
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log (Append-Only)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  staff_id UUID REFERENCES user_profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business Formations
CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  business_name VARCHAR(255),
  entity_type VARCHAR(50) CHECK (entity_type IN ('llc','s-corp','c-corp','nonprofit','sole-prop')),
  state_of_formation VARCHAR(2),
  use_divine_agent BOOLEAN DEFAULT FALSE,
  filing_status VARCHAR(50) CHECK (filing_status IN ('draft','submitted','processing','approved','rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insurance Quotes
CREATE TABLE insurance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  zip_code VARCHAR(10),
  vehicle_usage VARCHAR(50),
  driver_history VARCHAR(50),
  status VARCHAR(50) CHECK (status IN ('pending','quoted','accepted','declined','expired')),
  monthly_premium DECIMAL(10,2),
  carrier VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notary Sessions
CREATE TABLE notary_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  document_type VARCHAR(100),
  signer_count INTEGER,
  session_status VARCHAR(50) CHECK (session_status IN ('scheduled','id_pending','ready','in_progress','completed','cancelled')),
  scheduled_time TIMESTAMP,
  kyc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contact Form Submissions
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  service_interest VARCHAR(100),
  message TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS: clients see their own data
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own enrollments" ON service_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON service_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own vault files" ON vault_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own formations" ON formations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own quotes" ON insurance_quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notary sessions" ON notary_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can submit contact form" ON contact_submissions FOR INSERT WITH CHECK (true);
