import { supabase, TOPIC_LABELS, TYPE_COLORS, type ProblemType } from "@/lib/supabase";
import Link from "next/link";

async function getTopicStats() {
  const { data } = await supabase.from("stats_by_type").select("*");
  return data ?? [];
}

export default async function TopicsPage() {
  const stats = await getTopicStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Задачи по темам</h1>
        <p className="text-gray-500 mt-1 text-sm">Выбери тему для целенаправленной отработки</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((s) => {
          const type = s.problem_type as ProblemType;
          const total = Number(s.total_problems);
          const solved = Number(s.solved);
          const inProg = Number(s.in_progress);
          const review = Number(s.needs_review);
          const notStarted = total - solved - inProg - review;
          const pct = total ? Math.round((solved / total) * 100) : 0;

          return (
            <Link
              key={type}
              href={`/topics/${type}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${TYPE_COLORS[type]}`}>
                      {TOPIC_LABELS[type]}
                    </span>
                    <span className="text-sm text-gray-500">{total} задач</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="text-green-600">✓ {solved} решено</span>
                    {inProg > 0 && <span className="text-blue-500">◐ {inProg} в процессе</span>}
                    {review > 0 && <span className="text-amber-500">⚑ {review} повторить</span>}
                    {notStarted > 0 && <span>○ {notStarted} не начато</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-gray-900">{pct}%</p>
                  {s.avg_score && (
                    <p className="text-xs text-gray-400 mt-1">ср. {s.avg_score} б.</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
