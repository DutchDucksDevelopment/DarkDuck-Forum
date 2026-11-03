-- ============================================================
-- DARK DUCK FORUM — COMPLETE DATABASE SETUP
-- Run this entire script in the Supabase SQL Editor.
-- Safe to re-run: existing functions, policies, and the
-- publication are replaced/dropped before being recreated.
-- ============================================================

-- Hierarchical paths for the comment tree
CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path       LTREE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_contents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_score (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  score   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id)
);

CREATE TABLE IF NOT EXISTS post_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type  TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ---- user_profiles ----
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to user_profiles" ON user_profiles;
CREATE POLICY "Public read access to user_profiles"
  ON user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- posts ----
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to posts" ON posts;
CREATE POLICY "Public read access to posts"
  ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- post_contents ----
ALTER TABLE post_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to post_contents" ON post_contents;
CREATE POLICY "Public read access to post_contents"
  ON post_contents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create post_contents" ON post_contents;
CREATE POLICY "Authenticated users can create post_contents"
  ON post_contents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- post_score ----
ALTER TABLE post_score ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to post_score" ON post_score;
CREATE POLICY "Public read access to post_score"
  ON post_score FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can update post_score" ON post_score;
CREATE POLICY "Public can update post_score"
  ON post_score FOR UPDATE USING (true);

-- ---- post_votes ----
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to post_votes" ON post_votes;
CREATE POLICY "Public read access to post_votes"
  ON post_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own votes" ON post_votes;
CREATE POLICY "Users can insert own votes"
  ON post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON post_votes;
CREATE POLICY "Users can update own votes"
  ON post_votes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REALTIME CONFIGURATION
-- ============================================================

DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE
  user_profiles,
  posts,
  post_contents,
  post_score,
  post_votes;

ALTER TABLE user_profiles   SET (realtime.enable = true);
ALTER TABLE posts           SET (realtime.enable = true);
ALTER TABLE post_contents   SET (realtime.enable = true);
ALTER TABLE post_score      SET (realtime.enable = true);
ALTER TABLE post_votes      SET (realtime.enable = true);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Replace the old create_new_post(userId, ...) with the new
-- lowercase-parameter signature. Dropping first is required:
-- CREATE OR REPLACE cannot change argument names.
DROP FUNCTION IF EXISTS create_new_post(UUID, TEXT, TEXT);

-- Get posts (paginated, 25 per page, ordered by score then date)
CREATE OR REPLACE FUNCTION get_posts(page_number INTEGER)
RETURNS TABLE (
  id         UUID,
  created_at TIMESTAMPTZ,
  score      INTEGER,
  title      TEXT,
  user_id    UUID,
  username   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.created_at,
    COALESCE(ps.score, 0) AS score,
    pc.title,
    p.user_id,
    up.username
  FROM posts p
  JOIN post_contents pc ON pc.post_id = p.id
  LEFT JOIN post_score ps ON ps.post_id = p.id
  LEFT JOIN user_profiles up ON up.user_id = p.user_id
  ORDER BY ps.score DESC NULLS LAST, p.created_at DESC
  LIMIT 25
  OFFSET (page_number - 1) * 25;
END;
$$;

-- Get a single post together with all of its comments
CREATE OR REPLACE FUNCTION get_single_post_with_comments(post_id UUID)
RETURNS TABLE (
  id         UUID,
  created_at TIMESTAMPTZ,
  score      INTEGER,
  title      TEXT,
  content    TEXT,
  user_id    UUID,
  author_name TEXT,
  path       LTREE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.created_at,
    COALESCE(ps.score, 0) AS score,
    pc.title,
    pc.content,
    p.user_id,
    up.username AS author_name,
    p.path
  FROM posts p
  JOIN post_contents pc ON pc.post_id = p.id
  LEFT JOIN post_score ps ON ps.post_id = p.id
  LEFT JOIN user_profiles up ON up.user_id = p.user_id
  WHERE p.path <@ (SELECT path FROM posts WHERE id = get_single_post_with_comments.post_id)
     OR p.path @> (SELECT path FROM posts WHERE id = get_single_post_with_comments.post_id)
  ORDER BY p.path;
END;
$$;

-- Create a new top-level post.
-- NOTE: parameter must be lowercase 'userid' to match the RPC call
-- from the frontend (PostgREST matches argument names exactly).
CREATE OR REPLACE FUNCTION create_new_post(
  userid  UUID,
  title   TEXT,
  content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_post_id UUID;
BEGIN
  INSERT INTO posts (user_id, path)
  VALUES (userid, ('root.' || gen_random_uuid()::text)::LTREE)
  RETURNING id INTO new_post_id;

  INSERT INTO post_contents (post_id, title, content, user_id)
  VALUES (new_post_id, title, content, userid);

  INSERT INTO post_score (post_id, score)
  VALUES (new_post_id, 0)
  ON CONFLICT (post_id) DO UPDATE SET score = 0;

  RETURN new_post_id;
END;
$$;

-- Create a new comment. The path arrives as text from the client
-- (e.g. 'root.<uuid>.<uuid>') and is cast to LTREE on insert.
CREATE OR REPLACE FUNCTION create_new_comment(
  user_id UUID,
  content TEXT,
  path    TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_comment_id UUID;
BEGIN
  INSERT INTO posts (user_id, path)
  VALUES (user_id, path::LTREE)
  RETURNING id INTO new_comment_id;

  INSERT INTO post_contents (post_id, content, user_id)
  VALUES (new_comment_id, content, user_id);

  INSERT INTO post_score (post_id, score)
  VALUES (new_comment_id, 0)
  ON CONFLICT (post_id) DO UPDATE SET score = 0;

  RETURN new_comment_id;
END;
$$;

-- Grant execution to authenticated users (idempotent)
GRANT EXECUTE ON FUNCTION get_posts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_single_post_with_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_post(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_comment(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- REFRESH POSTGREST SCHEMA CACHE
-- Without this, the renamed function may not be found (PGRST202)
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Function signatures (should show lowercase 'userid uuid, ...')
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_posts', 'get_single_post_with_comments',
                  'create_new_post', 'create_new_comment');

-- All tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'posts', 'post_contents', 'post_score', 'post_votes');

-- RLS is enabled
SELECT table_name, row_security
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'posts', 'post_contents', 'post_score', 'post_votes');

-- Realtime is enabled
SELECT tablename, realtime.enable
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'posts', 'post_contents', 'post_score', 'post_votes');
