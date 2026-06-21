"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Problem {
  id: string;
  topic?: string;
  subtopic?: string;
  year?: number;
  text_plain?: string;
  latex_source?: string;
}

interface Student {
  id: string;
  full_name: string;
  grade: string | null;
}

const TOPIC_COLORS: Record<string, string> = {
  "Алгебра": "bg-blue-100 text-blue-700",
  "Тригонометрия": "bg-purple-100 text-purple-700",
  "Математический анализ": "bg-green-100 text-green-700",
  "Планиметрия": "bg-amber-100 text-amber-700",
  "Стереометрия": "bg-orange-100 text-orange-700",
  "Теория чисел": "bg-rose-100 text-rose-700",
  "Текстовые задачи": "bg-teal-100 text-teal-700",
};

export default function NewAssignmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load students
  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("id, full_name, grade").eq("role", "student").eq("is_active", true).order("full_name").then(({ data }) => {
      setStudents(data || []);
    });
  }, []);

  // Load problems
  const loadProblems = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (topic) params.set("topic", topic);
    if (search) params.set("q", search);
    fetch(`/api/library?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProblems(d.problems || []);
        setTotal(d.total || 0);
        if (!topics.length && d.topics) {
          setTopics(d.topics.map((t: { topic: string }) => t.topic));
        }
      });
  }, [page, topic, search, topics.length]);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  function toggleProblem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!title.trim()) { setError("Введите название задания"); return; }
    if (!selectedStudentId) { setError("Выберите ученика"); return; }
    if (selected.size === 0) { setError("Выберите хотя бы одну задачу"); return; }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from("tracker_assignments").insert({
      teacher_id: user.id,
      student_id: selectedStudentId,
      title: title.trim(),
      problem_ids: [...selected],
      due_date: dueDate || null,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    router.push("/teacher/assignments");
  }

  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Новое задание</h1>
        <p className="text-sm text-gray-500 mt-1">Выберите задачи из библиотеки и назначьте ученику</p>
      </div>

      {/* Assignment meta */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Название задания</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Домашнее задание №1"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Ученик</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">— Выберите ученика —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}{s.grade ? ` (${s.grade})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Срок выполнения</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Problem picker */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
              placeholder="Поиск..."
              className="flex-1 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <select
              value={topic}
              onChange={(e) => { setTopic(e.target.value); setPage(1); }}
              className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">Все темы</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            {problems.map((p) => {
              const isSelected = selected.has(p.id);
              const preview = (p.text_plain || p.latex_source || "").slice(0, 120).replace(/\$[^$]+\$/g, "…");
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProblem(p.id)}
                  className={`w-full text-left bg-white border rounded-xl px-4 py-3.5 transition-all ${
                    isSelected
                      ? "border-blue-400 ring-1 ring-blue-200 bg-blue-50"
                      : "border-gray-200 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {p.topic && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TOPIC_COLORS[p.topic] || "bg-gray-100 text-gray-600"}`}>
                            {p.topic}
                          </span>
                        )}
                        {p.year && <span className="text-xs text-gray-400">{p.year} г.</span>}
                        <span className="text-xs text-gray-300">#{p.id}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{preview}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                ←
              </button>
              {[...Array(Math.min(7, totalPages))].map((_, i) => {
                const pg = i + 1;
                return (
                  <button key={pg} onClick={() => setPage(pg)} className={`px-3 py-1.5 text-xs rounded-lg border ${page === pg ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50 border-gray-200"}`}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                →
              </button>
            </div>
          )}
        </div>

        {/* Selected sidebar */}
        <div className="w-56 shrink-0">
          <div className="sticky top-8 bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">
              Выбрано задач: <span className="text-blue-600">{selected.size}</span>
            </p>
            {selected.size > 0 ? (
              <div className="space-y-1 mb-4 max-h-64 overflow-y-auto">
                {[...selected].map((id) => (
                  <div key={id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <span>#{id}</span>
                    <button onClick={() => toggleProblem(id)} className="text-gray-300 hover:text-red-400 ml-2">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">Нажмите на задачу, чтобы выбрать её</p>
            )}

            {error && (
              <p className="text-xs text-red-600 mb-3">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
            >
              {saving ? "Сохранение..." : "Выдать задание"}
            </button>
            <button
              onClick={() => router.push("/teacher/assignments")}
              className="w-full py-2 mt-2 text-sm text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
