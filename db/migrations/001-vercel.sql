CREATE TABLE IF NOT EXISTS profiles (
 user_id text PRIMARY KEY, clerk_user_id text UNIQUE, email text NOT NULL, name text,
 business_name text, role text NOT NULL DEFAULT 'client', brand_json text NOT NULL DEFAULT '{}',
 created_at text NOT NULL, updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES profiles(user_id), business_name text NOT NULL,
 title text NOT NULL, service text NOT NULL, status text NOT NULL DEFAULT 'awaiting_payment',
 payment_status text NOT NULL DEFAULT 'pending', amount_cents integer, brief_json text NOT NULL DEFAULT '{}',
 due_start text, due_end text, client_note text, internal_note text, stage_updated_at text,
 created_at text NOT NULL, updated_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
 id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), user_id text NOT NULL REFERENCES profiles(user_id),
 kind text NOT NULL DEFAULT 'client_upload', file_key text NOT NULL, file_name text NOT NULL,
 content_type text, size bigint NOT NULL DEFAULT 0, created_at text NOT NULL
);
CREATE TABLE IF NOT EXISTS upload_intents (
 id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), user_id text NOT NULL,
 uploader_id text NOT NULL, kind text NOT NULL, file_key text UNIQUE NOT NULL, file_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_user_created ON projects(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
