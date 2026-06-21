"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Stats {
  studentCount: number;
  assignmentCount: number;
  recentAssignments: Array<{ id: string; title: string; student_name: string; created_at: string; problem_ids: string[] }>;
}

export default function TeacherPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) setName(profile.full_name);

      const { data: assignments } = await supabase
        .from("tracker_assignments")
        .select("id, title, student_id, created_at, problem_ids")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const studentIds = [...new Set((assignments || []).map((a) => a.student_id))];
      const { data: students } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
        : { data: [] };

      const studentMap = Object.fromEntries((students || []).map((s) => [s.id, s.full_name]));

      const { count: studentCount } = await supabase
        .from("tracker_assignments")
        .select("student_id", { count: "exact", head: true })
        .eq("teacher_id", user.id);

      const { count: assignmentCount } = await supabase
        .from("tracker_assignments")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", user.id);

      setStats({
        studentCount: new Set((assignments || []).map((a) => a.student_id)).size,
        assignmentCount: assignmentCount || 0,
        recentAssignments: (assignments || []).map((a) => ({
          id: a.id,
          title: a.title,
          student_name: studentMap[a.student_id] || "—",
          created_at: a.created_at,
          problem_ids: a.problem_ids,
        })),
      });
    })();
  }, []);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {name ? `Добрый день, ${name.split(" ")[0]}` : "Личный кабинет"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Кабинет учителя</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Учеников</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.studentCount ?? "—"}</p>
          <Link href="/teacher/students" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            Управление →
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Заданий выдано</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.assignmentCount ?? "—"}</p>
          <Link href="/teacher/assignments" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            Все задания →
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/teacher/assignments/new"
          className="flex items-center gap-3 bg-blue-600 text-white rounded-xl px-5 py-4 hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium text-sm">Создать задание</span>
        </Link>
        <Link
          href="/teacher/students"
          className="flex items-center gap-3 bg-white border border-gray-200 text-gray-700 rounded-xl px-5 py-4 hover:border-blue-200 hover:text-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="font-medium text-sm">Добавить ученика</span>
        </Link>
      </div>

      {/* Recent assignments */}
      {stats && stats.recentAssignments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Последние задания</h2>
          <div className="space-y-2">
            {stats.recentAssignments.map((a) => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.student_name} · {a.problem_ids.length} задач
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.recentAssignments.length === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">Заданий пока нет</p>
          <Link href="/teacher/assignments/new" className="text-blue-600 text-sm hover:underline mt-1 inline-block">
            Создать первое задание
          </Link>
        </div>
      )}
    </div>
  );
}
