import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — uses localStorage (no cookies, avoids non-ASCII header issues)
export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Singleton for Server Components / API routes
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Problem {
  id: string;
  variant_id: string;
  year: number;
  variant_num: number;
  problem_num: number;
  problem_type: ProblemType;
  topic_label: string;
  subtopics: string[] | null;
  ocr_text: string | null;
  difficulty: number | null;
  status: ProgressStatus | null;
  score: number | null;
  attempts: number | null;
  time_spent_minutes: number | null;
  notes: string | null;
  last_attempted_at: string | null;
}

export interface StatsByType {
  problem_type: ProblemType;
  total_problems: number;
  solved: number;
  in_progress: number;
  needs_review: number;
  avg_score: number | null;
}

export interface Profile {
  id: string;
  full_name: string;
  role: "teacher" | "student" | "admin";
  grade: string | null;
  is_active: boolean;
  organization_id: string | null;
}

export type ProblemType =
  | "algebra"
  | "inequalities"
  | "functions"
  | "trigonometry"
  | "planimetry"
  | "stereometry"
  | "combinatorics"
  | "sequences"
  | "word_problems"
  | "unknown";

export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "solved"
  | "needs_review";

export const STATUS_CONFIG: Record<
  ProgressStatus,
  { label: string; color: string; icon: string }
> = {
  not_started: { label: "Не начата", color: "text-gray-400", icon: "○" },
  in_progress: { label: "В процессе", color: "text-blue-500", icon: "◐" },
  solved: { label: "Решена", color: "text-green-500", icon: "●" },
  needs_review: { label: "Повторить", color: "text-amber-500", icon: "◑" },
};

export const TOPIC_LABELS: Record<ProblemType, string> = {
  algebra: "Алгебра",
  inequalities: "Неравенства",
  functions: "Функции и графики",
  trigonometry: "Тригонометрия",
  planimetry: "Планиметрия",
  stereometry: "Стереометрия",
  combinatorics: "Комбинаторика и вероятность",
  sequences: "Последовательности",
  word_problems: "Текстовые задачи",
  unknown: "Другое",
};

export const TYPE_COLORS: Record<ProblemType, string> = {
  algebra: "bg-blue-100 text-blue-800 border-blue-200",
  inequalities: "bg-purple-100 text-purple-800 border-purple-200",
  functions: "bg-indigo-100 text-indigo-800 border-indigo-200",
  trigonometry: "bg-cyan-100 text-cyan-800 border-cyan-200",
  planimetry: "bg-green-100 text-green-800 border-green-200",
  stereometry: "bg-teal-100 text-teal-800 border-teal-200",
  combinatorics: "bg-orange-100 text-orange-800 border-orange-200",
  sequences: "bg-yellow-100 text-yellow-800 border-yellow-200",
  word_problems: "bg-red-100 text-red-800 border-red-200",
  unknown: "bg-gray-100 text-gray-800 border-gray-200",
};
