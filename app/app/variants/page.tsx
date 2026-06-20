import { supabase } from "@/lib/supabase";
import Link from "next/link";

async function getVariants() {
  const { data: variants } = await supabase
    .from("variants")
    .select("*")
    .order("year", { ascending: false })
    .order("variant_num");

  const { data: stats } = await supabase
    .from("problems_with_progress")
    .select("variant_id, status");

  const statsByVariant: Record<string, { total: number; solved: number }> = {};
  for (const p of stats ?? []) {
    if (!statsByVariant[p.variant_id]) statsByVariant[p.variant_id] = { total: 0, solved: 0 };
    statsByVariant[p.variant_id].total++;
    if (p.status === "solved") statsByVariant[p.variant_id].solved++;
  }

  return { variants: variants ?? [], statsByVariant };
}

export default async function VariantsPage() {
  const { variants, statsByVariant } = await getVariants();

  const years = [...new Set(variants.map((v) => v.year))].sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Варианты ДВИ</h1>
        <p className="text-gray-500 mt-1 text-sm">По 8 задач в каждом варианте</p>
      </div>

      {years.map((year) => (
        <div key={year}>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{year} год</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {variants
              .filter((v) => v.year === year)
              .map((v) => {
                const s = statsByVariant[v.id] ?? { total: 0, solved: 0 };
                const pct = s.total ? Math.round((s.solved / s.total) * 100) : 0;
                return (
                  <Link
                    key={v.id}
                    href={`/variants/${v.year}/${v.variant_num}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all text-center"
                  >
                    <p className="text-sm font-bold text-gray-900">Вариант {v.variant_num}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.stream_date}</p>
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{s.solved}/{s.total}</p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
