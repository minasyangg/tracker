"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import dynamic from "next/dynamic";

const LatexRenderer = dynamic(() => import("@/components/LatexRenderer"), { ssr: false });

interface Assignment {
  id: string;
  title: string;
  teacher_name: string;
  problem_ids: string[];
  due_date: string | null;
  created_at: string;
}

interface LibProblem {
  id: string;
  topic?: string;
  subtopic?: string;
  year?: number;
  latex_source?: string;
  text_plain?: string;
  solution_source?: string;
  geo_images?: Record<string, string>;
}

type ProgressMap = Record<string, string>; // problem_id → status

export default function StudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [problems, setProblems] = useState<LibProblem[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loadingProblems, setLoadingProblems] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile) setName(profile.full_name);

      const { data: assigns } = await supabase
        .from("tracker_assignments")
        .select("id, title, teacher_id, problem_ids, due_date, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      const teacherIds = [...new Set((assigns || []).map((a) => a.teacher_id))];
      const { data: teachers } = teacherIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", teacherIds)
        : { data: [] };
      const teacherMap = Object.fromEntries((teachers || []).map((t) => [t.id, t.full_name]));

      setAssignments((assigns || []).map((a) => ({
        id: a.id,
        title: a.title,
        teacher_name: teacherMap[a.teacher_id] || "—",
        problem_ids: a.problem_ids,
        due_date: a.due_date,
        created_at: a.created_at,
      })));
    })();
  }, []);

  async function openAssignment(a: Assignment) {
    if (activeId === a.id) { setActiveId(null); setProblems([]); return; }
    setActiveId(a.id);
    setLoadingProblems(true);

    // Load library problems for this assignment
    const res = await fetch(`/api/library/batch?ids=${a.problem_ids.join(",")}`);
    const data = await res.json();
    setProblems(data.problems || []);

    // Load progress
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prog } = await supabase
      .from("tracker_progress")
      .select("problem_id, status")
      .eq("assignment_id", a.id)
      .eq("student_id", user.id);

    setProgress(Object.fromEntries((prog || []).map((p) => [p.problem_id, p.status])));
    setLoadingProblems(false);
  }

  async function setStatus(assignmentId: string, problemId: string, status: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("tracker_progress").upsert({
      assignment_id: assignmentId,
      student_id: user.id,
      problem_id: problemId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "assignment_id,problem_id" });

    setProgress((prev) => ({ ...prev, [problemId]: status }));
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    not_started: { label: "Не начата", color: "text-gray-400" },
    in_progress: { label: "В процессе", color: "text-blue-500" },
    solved: { label: "Решена", color: "text-emerald-600" },
    needs_review: { label: "Повторить", color: "text-amber-500" },
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {name ? `Привет, ${name.split(" ")[1] || name.split(" ")[0]}!` : "Мои задания"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Задания от учителя</p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">Заданий пока нет</p>
          <p className="text-gray-400 text-xs mt-1">Учитель скоро выдаст тебе задание</p>
          <Link href="/library" className="text-blue-600 text-sm hover:underline mt-3 inline-block">
            Посмотреть библиотеку задач →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const solved = a.problem_ids.filter((id) => progress[id] === "solved").length;
            const pct = a.problem_ids.length ? Math.round((solved / a.problem_ids.length) * 100) : 0;
            const isOpen = activeId === a.id;

            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => openAssignment(a)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{a.teacher_name}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{a.problem_ids.length} задач</span>
                        {a.due_date && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">до {new Date(a.due_date).toLocaleDateString("ru-RU")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Progress bar */}
                      <div className="text-right">
                        <p className="text-xs text-emerald-600 font-medium">{solved}/{a.problem_ids.length}</p>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1">
                          <div className="h-1.5 bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Problems */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {loadingProblems ? (
                      <div className="p-6 space-y-3">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
                      </div>
                    ) : (
                      problems.map((p, idx) => {
                        const status = progress[p.id] || "not_started";
                        const cfg = statusConfig[status];
                        return (
                          <div key={p.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium">{idx + 1}.</span>
                                {p.topic && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{p.topic}</span>
                                )}
                                {p.year && <span className="text-xs text-gray-400">{p.year} г.</span>}
                              </div>
                              {/* Status picker */}
                              <select
                                value={status}
                                onChange={(e) => setStatus(a.id, p.id, e.target.value)}
                                className={`text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 ${cfg.color}`}
                              >
                                {Object.entries(statusConfig).map(([val, { label }]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            </div>
                            {p.latex_source ? (
                              <LatexRenderer source={p.latex_source} geoImages={p.geo_images} className="text-sm" />
                            ) : (
                              <p className="text-sm text-gray-700 leading-relaxed">{(p.text_plain || "").slice(0, 300)}</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
