-- Add model column to gemini_usage_logs table to track which model was used
alter table public.gemini_usage_logs
  add column if not exists model text not null default 'gemini-3-pro-preview';

-- Add index for model filtering
create index if not exists idx_gemini_usage_logs_model
  on public.gemini_usage_logs (model);

-- Add composite index for querying by model and date
create index if not exists idx_gemini_usage_logs_model_used_at
  on public.gemini_usage_logs (model, used_at);
