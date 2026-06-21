import { supabase, TOPIC_LABELS, TYPE_COLORS, STATUS_CONFIG, type ProblemType, type ProgressStatus } from "@/lib/supabase";
import { notFound } from "next/navigation";
import ProblemCard from "@/components/ProblemCard";
import Link from "next/link";

interface Props {
  params: Promise<{ year: string; variant: string }>;
}

async function getVariantProblems(year: number, variantNum: number) {
  const { data: variant } = await supabase
    .from("variants")
    .select("*")
    .eq("year", year)
    .eq("variant_num", variantNum)
    .single();

  if (!variant) return null;

  const { data: problems } = await supabase
    .from("problems_with_progress")
    .select("*")
    .eq("variant_id", variant.id)
    .order("problem_num");

  return { variant, problems: problems ?? [] };
}

export default async function VariantDetailPage({ params }: Props) {
  const { year: yearStr, variant: variantStr } = await params;
  const year = Number(yearStr);
  const variantNum = Number(variantStr);

  if (isNaN(year) || isNaN(variantNum)) notFound();

  const result = await getVariantProblems(year, variantNum);
  if (!result) notFound();

  const { variant, problems } = result;
  const solved = problems.filter((p) => p.status === "solved").length;
  const pct = problems.length ? Math.round((solved / problems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/variants" className="hover:text-gray-900">Варианты</Link>
        <span>/</span>
        <span>{year} г.</span>
        <span>/</span>
        <span>Вариант {variantNum}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {year} г. · Вариант {variantNum}
          </h1>
          {variant.stream_date && (
            <p className="text-gray-500 text-sm mt-1">{variant.stream_date}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{pct}%</p>
          <p className="text-sm text-gray-500">{solved} / {problems.length}</p>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>

      {/* Navigation between variants */}
      <div className="flex gap-3">
        {variantNum > 1 && (
          <Link
            href={`/variants/${year}/${variantNum - 1}`}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
          >
            ← Вариант {variantNum - 1}
          </Link>
        )}
        {variantNum < 6 && (
          <Link
            href={`/variants/${year}/${variantNum + 1}`}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors ml-auto"
          >
            Вариант {variantNum + 1} →
          </Link>
        )}
      </div>

      {/* Problems */}
      <div className="space-y-3">
        {problems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Задачи ещё не загружены</p>
            <p className="text-sm mt-2">Запусти скрипты OCR и анализа, затем seed_supabase.py</p>
          </div>
        ) : (
          problems.map((p) => <ProblemCard key={p.id} problem={p} />)
        )}
      </div>
    </div>
  );
}
