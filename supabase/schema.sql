-- DVI MGU Math Progress Tracker — Supabase Schema

-- Problem types enum
CREATE TYPE problem_type AS ENUM (
  'algebra',
  'inequalities',
  'functions',
  'trigonometry',
  'planimetry',
  'stereometry',
  'combinatorics',
  'word_problems',
  'sequences',
  'unknown'
);

-- Problem status enum
CREATE TYPE progress_status AS ENUM (
  'not_started',
  'in_progress',
  'solved',
  'needs_review'
);

-- Variants table (one row per PDF)
CREATE TABLE variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  variant_num INTEGER NOT NULL,
  stream_date VARCHAR(50),
  source_url TEXT NOT NULL,
  pdf_filename VARCHAR(500),
  ocr_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, variant_num)
);

-- Problems table (8 problems per variant)
CREATE TABLE problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  variant_num INTEGER NOT NULL,
  problem_num INTEGER NOT NULL CHECK (problem_num BETWEEN 1 AND 8),
  problem_type problem_type DEFAULT 'unknown',
  topic_label VARCHAR(200),
  subtopics TEXT[],
  ocr_text TEXT,
  ocr_markdown TEXT,
  difficulty SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_id, problem_num)
);

-- Progress table (student progress per problem)
CREATE TABLE progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  status progress_status DEFAULT 'not_started',
  score DECIMAL(4,1) CHECK (score BETWEEN 0 AND 10),
  attempts INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  last_attempted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Views for the UI
CREATE VIEW problems_with_progress AS
SELECT
  p.id,
  p.variant_id,
  p.year,
  p.variant_num,
  p.problem_num,
  p.problem_type,
  p.topic_label,
  p.subtopics,
  p.ocr_text,
  p.difficulty,
  pr.status,
  pr.score,
  pr.attempts,
  pr.time_spent_minutes,
  pr.notes,
  pr.last_attempted_at
FROM problems p
LEFT JOIN progress pr ON pr.problem_id = p.id;

-- Stats view by problem type
CREATE VIEW stats_by_type AS
SELECT
  p.problem_type,
  COUNT(*) AS total_problems,
  COUNT(pr.id) FILTER (WHERE pr.status = 'solved') AS solved,
  COUNT(pr.id) FILTER (WHERE pr.status = 'in_progress') AS in_progress,
  COUNT(pr.id) FILTER (WHERE pr.status = 'needs_review') AS needs_review,
  ROUND(AVG(pr.score) FILTER (WHERE pr.score IS NOT NULL), 1) AS avg_score
FROM problems p
LEFT JOIN progress pr ON pr.problem_id = p.id
GROUP BY p.problem_type;

-- Indexes
CREATE INDEX idx_problems_year ON problems(year);
CREATE INDEX idx_problems_type ON problems(problem_type);
CREATE INDEX idx_progress_status ON progress(status);
CREATE INDEX idx_problems_variant ON problems(variant_id);

-- Seed variants (run after creating the table)
INSERT INTO variants (year, variant_num, stream_date, source_url) VALUES
  (2025, 1, '11 июля 2025', 'https://msu-start.ru/dvi-2025/'),
  (2025, 2, '12 июля 2025', 'https://msu-start.ru/dvi-2025/'),
  (2025, 3, '15 июля 2025', 'https://msu-start.ru/dvi-2025/'),
  (2025, 4, '18 июля 2025', 'https://msu-start.ru/dvi-2025/'),
  (2025, 5, '19 июля 2025', 'https://msu-start.ru/dvi-2025/'),
  (2025, 6, '20 июля 2025', 'https://msu-start.ru/dvi-2025/'),
  (2024, 1, '11 июля 2024', 'https://msu-start.ru/dvi-2024/'),
  (2024, 2, '12 июля 2024', 'https://msu-start.ru/dvi-2024/'),
  (2024, 3, '15 июля 2024', 'https://msu-start.ru/dvi-2024/'),
  (2024, 4, '18 июля 2024', 'https://msu-start.ru/dvi-2024/'),
  (2024, 5, '20 июля 2024', 'https://msu-start.ru/dvi-2024/'),
  (2024, 6, '21 июля 2024', 'https://msu-start.ru/dvi-2024/'),
  (2023, 1, '11 июля 2023', 'https://msu-start.ru/dvi-2023/'),
  (2023, 2, '12 июля 2023', 'https://msu-start.ru/dvi-2023/'),
  (2023, 3, '15 июля 2023', 'https://msu-start.ru/dvi-2023/'),
  (2023, 4, '18 июля 2023', 'https://msu-start.ru/dvi-2023/'),
  (2023, 5, '20 июля 2023', 'https://msu-start.ru/dvi-2023/'),
  (2023, 6, '21 июля 2023', 'https://msu-start.ru/dvi-2023/'),
  (2022, 1, '11 июля 2022', 'https://msu-start.ru/dvi-2022/'),
  (2022, 2, '14 июля 2022', 'https://msu-start.ru/dvi-2022/'),
  (2022, 3, '15 июля 2022', 'https://msu-start.ru/dvi-2022/'),
  (2022, 4, '19 июля 2022', 'https://msu-start.ru/dvi-2022/'),
  (2022, 5, '20 июля 2022', 'https://msu-start.ru/dvi-2022/'),
  (2022, 6, '22 июля 2022', 'https://msu-start.ru/dvi-2022/'),
  (2021, 1, '17 июля 2021', 'https://msu-start.ru/dvi-2021/'),
  (2021, 2, '18 июля 2021', 'https://msu-start.ru/dvi-2021/'),
  (2021, 3, '19 июля 2021', 'https://msu-start.ru/dvi-2021/'),
  (2021, 4, '21 июля 2021', 'https://msu-start.ru/dvi-2021/'),
  (2021, 5, '23 июля 2021', 'https://msu-start.ru/dvi-2021/'),
  (2021, 6, '25 июля 2021', 'https://msu-start.ru/dvi-2021/'),
  (2020, 1, 'Вариант 1', 'https://msu-start.ru/dvi-2020/'),
  (2020, 2, 'Вариант 2', 'https://msu-start.ru/dvi-2020/'),
  (2020, 3, 'Вариант 3', 'https://msu-start.ru/dvi-2020/'),
  (2020, 4, 'Вариант 4', 'https://msu-start.ru/dvi-2020/'),
  (2020, 5, 'Вариант 5', 'https://msu-start.ru/dvi-2020/'),
  (2020, 6, 'Вариант 6', 'https://msu-start.ru/dvi-2020/');
