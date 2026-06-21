"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Student {
  id: string;
  full_name: string;
  grade: string | null;
  is_active: boolean;
  email?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", grade: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadStudents() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Get student IDs from this teacher's assignments
    const { data: assignments } = await supabase
      .from("tracker_assignments")
      .select("student_id")
      .eq("teacher_id", user.id);

    const ids = [...new Set((assignments || []).map((a) => a.student_id))];

    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, grade, is_active")
        .in("id", ids)
        .order("full_name");
      setStudents(data || []);
    } else {
      setStudents([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadStudents(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/admin/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Ошибка создания ученика");
    } else {
      setSuccess(`Аккаунт создан: ${json.full_name} (${form.email})`);
      setForm({ full_name: "", email: "", password: "", grade: "" });
      setShowForm(false);
      await loadStudents();
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ученики</h1>
          <p className="text-sm text-gray-500 mt-1">Управление аккаунтами учеников</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); setSuccess(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить ученика
        </button>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Новый ученик</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">ФИО ученика</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="Иванов Иван Иванович"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Пароль</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                placeholder="Минимум 6 символов"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Класс / группа</label>
              <input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                placeholder="11А"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {error && (
              <div className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
              >
                {saving ? "Создаётся..." : "Создать аккаунт"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">Учеников пока нет</p>
          <p className="text-gray-400 text-xs mt-1">Создайте первое задание для ученика — он появится здесь</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold">
                  {s.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                  {s.grade && <p className="text-xs text-gray-400">{s.grade}</p>}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${s.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                {s.is_active ? "Активен" : "Неактивен"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
