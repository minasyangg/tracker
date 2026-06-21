"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Assignment {
  id: string;
  title: string;
  student_name: string;
  problem_ids: string[];
  due_date: string | null;
  created_at: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("tracker_assignments")
        .select("id, title, student_id, problem_ids, due_date, created_at")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      const studentIds = [...new Set((data || []).map((a) => a.student_id))];
      const { data: profiles } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
        : { data: [] };

      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]));

      setAssignments(
        (data || []).map((a) => ({
          id: a.id,
          title: a.title,
          student_name: nameMap[a.student_id] || "—",
          problem_ids: a.problem_ids,
          due_date: a.due_date,
          created_at: a.created_at,
        }))
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Задания</h1>
          <p className="text-sm text-gray-500 mt-1">Все выданные задания</p>
        </div>
        <Link
          href="/teacher/assignments/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Новое задание
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">Заданий пока нет</p>
          <Link href="/teacher/assignments/new" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
            Создать первое задание
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{a.student_name}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{a.problem_ids.length} задач</span>
                    {a.due_date && (
                      <>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-500">
                          до {new Date(a.due_date).toLocaleDateString("ru-RU")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 shrink-0">
                  {new Date(a.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
