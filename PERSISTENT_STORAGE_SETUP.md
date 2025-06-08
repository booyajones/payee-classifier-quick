
# Persistent Batch Job Storage Setup

This application now supports persistent storage for batch jobs using Supabase. Jobs will never be lost and will sync across devices.

## Quick Setup (Recommended)

1. **Click the green Supabase button** in the top right of the Lovable interface
2. **Connect to Supabase** - this will automatically configure everything for you
3. Your batch jobs will now persist permanently!

## Manual Setup (Advanced)

If you need to set up Supabase manually:

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Note your project URL and anon key

### 2. Create Database Table
Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE batch_jobs (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  job_data jsonb NOT NULL,
  payee_names text[] NOT NULL,
  original_file_data jsonb NOT NULL,
  status text NOT NULL,
  is_archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage their own jobs
CREATE POLICY "Users can manage their own batch jobs" ON batch_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Policy for anonymous users (if not using auth)
CREATE POLICY "Anonymous users can manage batch jobs" ON batch_jobs
  FOR ALL USING (user_id IS NULL);

-- Create index for performance
CREATE INDEX idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at);
```

### 3. Set Environment Variables
Add these to your environment:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Features

✅ **Never Lose Jobs**: Jobs persist permanently until you delete them  
✅ **Cross-Device Sync**: Access your jobs from any browser/device  
✅ **Offline Support**: Works offline with automatic sync when reconnected  
✅ **Conflict Resolution**: Smart merging of local and remote changes  
✅ **Archive Instead of Delete**: Jobs are archived, not permanently deleted  

## Usage

- **Automatic Sync**: Jobs automatically sync in the background
- **Manual Sync**: Click the sync button to force synchronization
- **Status Indicator**: Green cloud icon = Supabase connected, Yellow = local only
- **No Configuration Required**: Falls back to localStorage if Supabase not configured

## Migration

Existing jobs in localStorage will be automatically synced to Supabase when you first connect. No data will be lost!
