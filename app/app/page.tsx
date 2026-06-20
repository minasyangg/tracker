import { supabase, TOPIC_LABELS, TYPE_COLORS, STATUS_CONFIG, type ProblemType, type ProgressStatus } from "@/lib/supabase";
import Link from "next/link";

async function getStats() {
  const { data: stats } = await supabase.from("stats_by_type").select("*");
  const { data: recent } = await supabase
    .from("problems_with_progress")
    .select("*")
    .not("status", "is", null)
    .neq("status", "not_started")
    .order("last_attempted_at", { ascending: false })
    .limit(5);
  return { stats: stats ?? [], recent: recent ?? [] };
}

export default async function DashboardPage() {
  const { stats, recent } = await getStats();

  const totalProblems = stats.reduce((s: number, r: { total_problems: number }) => s + Number(r.total_problems), 0);
  const totalSolved = stats.reduce((s: number, r: { solved: number }) => s + Number(r.solved), 0);
  const totalInProgress = stats.reduce((s: number, r: { in_progress: number }) => s + Number(r.in_progress), 0);
  const totalReview = stats.reduce((s: number, r: { needs_review: number }) => s + Number(r.needs_review), 0);
  const pct = totalProblems ? Math.round((totalSolved / totalProblems) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Подготовка к ДВИ МГУ</h1>
        <p className="text-gray-500 mt-1 text-sm">Варианты 2020–2025 · 36 вариантов · 288 задач</p>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Общий прогресс</p>
            <p className="text-3xl font-bold text-gray-900">{pct}%</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="text-green-600">{totalSolved} решено</p>
            <p className="text-blue-500">{totalInProgress} в процессе</p>
            <p className="text-amber-500">{totalReview} на повторение</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{totalSolved} из {totalProblems} задач</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/topics"
          className="bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition-colors"
        >
          <p className="font-semibold">Задачи по темам</p>
          <p className="text-blue-200 text-sm mt-1">Отрабатывай слабые места</p>
        </Link>
        <Link
          href="/variants"
          className="bg-gray-900 text-white rounded-xl p-5 hover:bg-gray-800 transition-colors"
        >
          <p className="font-semibold">Варианты целиком</p>
          <p className="text-gray-400 text-sm mt-1">Решай как на экзамене</p>
        </Link>
      </div>

      {/* Stats by topic */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Прогресс по темам</h2>
          <Link href="/topics" className="text-sm text-blue-600 hover:underline">
            Все темы →
          </Link>
        </div>
        {stats.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
            <p className="font-medium">Данные ещё не загружены</p>
            <p className="text-sm mt-2">Запусти: <code className="bg-gray-100 px-1 rounded">python scripts/ocr_batch.py</code> → <code className="bg-gray-100 px-1 rounded">analyze_with_ai.py</code> → <code className="bg-gray-100 px-1 rounded">seed_supabase.py</code></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map((s: { problem_type: string; total_problems: number; solved: number; avg_score: number | null }) => {
              const type = s.problem_type as ProblemType;
              const total = Number(s.total_problems);
              const solved = Number(s.solved);
              const p = total ? Math.round((solved / total) * 100) : 0;
              return (
                <Link
                  key={type}
                  href={`/topics/${type}`}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[type] ?? "bg-gray-100 text-gray-800 border-gray-200"}`}>
                      {TOPIC_LABELS[type] ?? type}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{p}%</span>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${p}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {solved} / {total} задач
                      {s.avg_score ? ` · ср. балл ${s.avg_score}` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Последняя активность</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {recent.map((p: { id: string; year: number; variant_num: number; problem_num: number; problem_type: string; status: string | null; score: number | null }) => {
              const status = (p.status ?? "not_started") as ProgressStatus;
              const cfg = STATUS_CONFIG[status];
              return (
                <Link
                  key={p.id}
                  href={`/variants/${p.year}/${p.variant_num}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-lg ${cfg.color}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {p.year} г. · Вариант {p.variant_num} · Задача {p.problem_num}
                    </p>
                    <p className="text-xs text-gray-500">
                      {TOPIC_LABELS[p.problem_type as ProblemType] ?? p.problem_type}
                    </p>
                  </div>
                  {p.score != null && (
                    <span className="text-sm font-semibold text-gray-700">{p.score} б.</span>
                  )}
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
