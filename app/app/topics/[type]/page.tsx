import { supabase, TOPIC_LABELS, TYPE_COLORS, STATUS_CONFIG, type ProblemType, type ProgressStatus } from "@/lib/supabase";
import { notFound } from "next/navigation";
import ProblemCard from "@/components/ProblemCard";

interface Props {
  params: Promise<{ type: string }>;
}

async function getProblems(type: string) {
  const { data } = await supabase
    .from("problems_with_progress")
    .select("*")
    .eq("problem_type", type)
    .order("year", { ascending: false })
    .order("variant_num")
    .order("problem_num");
  return data ?? [];
}

export default async function TopicDetailPage({ params }: Props) {
  const { type } = await params;
  if (!(type in TOPIC_LABELS)) notFound();

  const ptype = type as ProblemType;
  const problems = await getProblems(type);

  const solved = problems.filter((p) => p.status === "solved").length;
  const total = problems.length;
  const pct = total ? Math.round((solved / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${TYPE_COLORS[ptype]}`}>
              {TOPIC_LABELS[ptype]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{TOPIC_LABELS[ptype]}</h1>
          <p className="text-gray-500 text-sm mt-1">{total} задач из вариантов 2020–2025</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{pct}%</p>
          <p className="text-sm text-gray-500">{solved} / {total}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>

      {/* Status filter summary */}
      <div className="flex gap-4 text-sm">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = problems.filter((p) => (p.status ?? "not_started") === status).length;
          return (
            <span key={status} className={`flex items-center gap-1.5 ${cfg.color}`}>
              <span>{cfg.icon}</span>
              <span>{cfg.label}: {count}</span>
            </span>
          );
        })}
      </div>

      {/* Problems list */}
      <div className="space-y-3">
        {problems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Задачи ещё не загружены</p>
            <p className="text-sm mt-2">Запусти скрипты OCR и анализа</p>
          </div>
        ) : (
          problems.map((p) => <ProblemCard key={p.id} problem={p} />)
        )}
      </div>
    </div>
  );
}
