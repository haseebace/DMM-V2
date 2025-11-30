**Supabase MCP Tools**
- `supabase_apply_migration(name, query)` — run DDL migrations.
- `supabase_create_branch(confirm_cost_id, name?)`, `supabase_delete_branch(branch_id)`, `supabase_list_branches()`, `supabase_merge_branch(branch_id)`, `supabase_rebase_branch(branch_id)`, `supabase_reset_branch(branch_id, migration_version?)`.
- `supabase_deploy_edge_function(name, entrypoint_path?, files[], import_map_path?)`, `supabase_get_edge_function(function_slug)`, `supabase_list_edge_functions()`.
- `supabase_execute_sql(query)` — arbitrary SQL (used below).
- `supabase_apply_migration`, `supabase_list_migrations()`.
- `supabase_get_project_url()`, `supabase_get_anon_key()`.
- `supabase_generate_typescript_types()`.
- `supabase_list_extensions(schemas?)`, `supabase_list_tables(schemas?)`.
- `supabase_get_logs(service)`.
- `supabase_get_advisors(type)` (advisor/lint-style feedback).
- `supabase_search_docs(graphql_query)` (docs lookup).

**Table Definitions**
- `public.files`
  - Columns: `id uuid not null default gen_random_uuid()`, `user_id uuid not null`, `real_debrid_id varchar not null`, `filename varchar not null`, `file_size bigint`, `mime_type varchar`, `download_url text`, `hoster varchar`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `sha1_hash varchar`, `hash_computed_at timestamptz`, `hash_algorithm varchar default 'sha1'`, `virtual_filename varchar`, `original_filename varchar not null default ''`.
  - Constraints: `files_pkey` (PK id), unique on `real_debrid_id` and on `sha1_hash`, `user_id` FK → `public.users(id)` ON DELETE CASCADE.
- `public.oauth_tokens`
  - Columns: `id uuid not null default gen_random_uuid()`, `access_token text not null`, `refresh_token text`, `token_type text not null default 'Bearer'`, `expires_in integer not null`, `scope text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `real_debrid_id varchar default ''`, `expires_at timestamptz default now()+1h`, `user_id uuid`, `client_secret text`.
  - Constraints: `oauth_tokens_pkey` (PK id), `oauth_tokens_user_id_key` (unique user_id), FK `user_id` → `public.users(id)` ON DELETE CASCADE, checks `length(access_token) > 0` and `expires_in > 0`.

**Indexes**
- `files`: `files_pkey`, `files_real_debrid_id_key`, `files_sha1_hash_key`, plus non-unique `idx_files_filename`, `idx_files_real_debrid_id`, `idx_files_sha1_hash`, `idx_files_user_filename`, `idx_files_user_id`, `idx_files_virtual_filename`.
- `oauth_tokens`: `oauth_tokens_pkey`, `oauth_tokens_user_id_key`, `idx_oauth_tokens_expires_at`, `idx_oauth_tokens_real_debrid_id`, `idx_oauth_tokens_updated_at`.

**RLS on `files`**
- Four permissive policies (`SELECT/INSERT/UPDATE/DELETE`) allowing access when `auth.uid() = user_id` or the JWT role is `service_role`. Insert policy enforces the check; others use row filters. These align with Story 2.3’s “per-user isolation + service role override” requirement.

**Health + Stats**
- `files` row counts: exact `0`; live tuples 0, dead tuples 10 (vacuum once data arrives). Storage: total 160 KB, heap 8 KB, indexes 144 KB.
- Index activity (`files`):
  - `files_pkey`: 15 scans, 15 tuples returned, 8 fetched.
  - `idx_files_real_debrid_id`: 4 scans (4 returned, 2 fetched).
  - `idx_files_user_filename`: 3 scans (1 returned/fetched).
  - Other indexes currently unused (0 scans), indicating future optimization opportunities once data is ingested.
- Migration status (`supabase_list_migrations` installed newest last):
  `003_rls_policies`, `create-oauth-tokens-table`, `004_metadata_schema`, `005_metadata_rls`, `006_metadata_rls_policies`, `fix_oauth_tokens_table_structure_step1`, `add_real_debrid_id_to_oauth_tokens_step2`, `add_file_folders_user_id_and_virtual_filename`, `add_sha1_hash_fields_to_files_table`, `check_existing_rls_policies`, `fix_oauth_tokens_rls_policy`, `disable_rls_oauth_tokens`, `add_virtual_filename_column`, `add_path_column_to_folders`, `add_oauth_tokens_columns`, `create_performance_indexes`, `create_folder_path_function`, `add_real_debrid_id_to_users`, `align_story_1_2_schema`, `clean_rls_policies_story_1_2`, `add_service_role_policy_support`, `add_client_secret_to_oauth_tokens`, `relax_oauth_token_constraints`. No dedicated lint tool exposed; only advisors (`supabase_get_advisors`) are available if we need checks.

**Project Info**
- `supabase_get_project_url` → `https://sqygkzsjmpwjuhbvvsht.supabase.co`. No project ref surfaced via the available tools.

Next steps you might consider: 1) run `supabase_get_advisors` for any pending database warnings; 2) populate fixture data to validate the Story 2.3 flows once code is ready.
