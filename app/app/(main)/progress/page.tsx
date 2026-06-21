import { supabase, TOPIC_LABELS, STATUS_CONFIG, type ProblemType, type ProgressStatus } from "@/lib/supabase";
import Link from "next/link";

async function getProgressData() {
  const { data: byType } = await supabase.from("stats_by_type").select("*");
  const { data: recent } = await supabase
    .from("problems_with_progress")
    .select("*")
    .not("status", "is", null)
    .neq("status", "not_started")
    .order("last_attempted_at", { ascending: false })
    .limit(20);

  return { byType: byType ?? [], recent: recent ?? [] };
}

export default async function ProgressPage() {
  const { byType, recent } = await getProgressData();

  const total = byType.reduce((s: number, r: { total_problems: number }) => s + Number(r.total_problems), 0);
  const solved = byType.reduce((s: number, r: { solved: number }) => s + Number(r.solved), 0);
  const inProgress = byType.reduce((s: number, r: { in_progress: number }) => s + Number(r.in_progress), 0);
  const review = byType.reduce((s: number, r: { needs_review: number }) => s + Number(r.needs_review), 0);
  const totalTime = recent.reduce((s: number, p: { time_spent_minutes: number | null }) => s + (p.time_spent_minutes ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Прогресс ученика</h1>
        <p className="text-gray-500 mt-1 text-sm">Полная статистика подготовки</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Решено", value: solved, color: "text-green-600", bg: "bg-green-50" },
          { label: "В процессе", value: inProgress, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Повторить", value: review, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Время (мин)", value: totalTime, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-transparent`}>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm text-gray-600 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Progress by topic */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">По темам</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {byType.map((s: { problem_type: string; total_problems: number; solved: number; in_progress: number; needs_review: number; avg_score: number | null }) => {
            const type = s.problem_type as ProblemType;
            const t = Number(s.total_problems);
            const sol = Number(s.solved);
            const pct = t ? Math.round((sol / t) * 100) : 0;
            return (
              <Link
                key={type}
                href={`/topics/${type}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{TOPIC_LABELS[type] ?? type}</p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1">
                    <span className="text-green-600">{sol} решено</span>
                    {s.in_progress > 0 && <span className="text-blue-500">{s.in_progress} в процессе</span>}
                    {s.needs_review > 0 && <span className="text-amber-500">{s.needs_review} повторить</span>}
                  </div>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{sol}/{t}</span>
                    <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {s.avg_score && (
                  <div className="text-right w-16">
                    <p className="text-sm font-bold text-gray-700">{s.avg_score}</p>
                    <p className="text-xs text-gray-400">ср. балл</p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Activity log */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">История активности</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {recent.map((p: { id: string; year: number; variant_num: number; problem_num: number; problem_type: string; status: string | null; score: number | null; time_spent_minutes: number | null; last_attempted_at: string | null }) => {
              const status = (p.status ?? "not_started") as ProgressStatus;
              const cfg = STATUS_CONFIG[status];
              const date = p.last_attempted_at
                ? new Date(p.last_attempted_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                : null;
              return (
                <Link
                  key={p.id}
                  href={`/variants/${p.year}/${p.variant_num}`}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-base ${cfg.color}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {p.year} · В{p.variant_num} · Задача {p.problem_num}
                    </p>
                    <p className="text-xs text-gray-400">
                      {TOPIC_LABELS[p.problem_type as ProblemType] ?? p.problem_type}
                      {p.time_spent_minutes ? ` · ${p.time_spent_minutes} мин` : ""}
                    </p>
                  </div>
                  {p.score != null && (
                    <span className="text-sm font-bold text-gray-700">{p.score}/10</span>
                  )}
                  {date && <span className="text-xs text-gray-400">{date}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
