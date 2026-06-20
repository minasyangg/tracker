"use client";

import { useState } from "react";
import { TOPIC_LABELS, TYPE_COLORS, STATUS_CONFIG, type ProblemType, type ProgressStatus, type Problem } from "@/lib/supabase";

interface Props {
  problem: Problem;
}

const STATUSES: ProgressStatus[] = ["not_started", "in_progress", "solved", "needs_review"];

export default function ProblemCard({ problem: initial }: Props) {
  const [problem, setProblem] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const status = (problem.status ?? "not_started") as ProgressStatus;
  const cfg = STATUS_CONFIG[status];

  async function updateProgress(updates: Partial<Problem>) {
    setSaving(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_id: problem.id, ...updates }),
      });
      if (res.ok) {
        const data = await res.json();
        setProblem((p) => ({ ...p, ...data }));
      }
    } finally {
      setSaving(false);
    }
  }

  function cycleStatus() {
    const idx = STATUSES.indexOf(status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    updateProgress({
      status: next,
      last_attempted_at: new Date().toISOString(),
      attempts: (problem.attempts ?? 0) + (next === "in_progress" ? 1 : 0),
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
      <div className="p-4 flex items-start gap-3">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          disabled={saving}
          title={`Статус: ${cfg.label}. Нажми чтобы изменить`}
          className={`text-xl leading-none mt-0.5 transition-opacity ${cfg.color} ${saving ? "opacity-40" : "hover:opacity-70"}`}
        >
          {cfg.icon}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {problem.year} · В{problem.variant_num} · Задача {problem.problem_num}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[problem.problem_type] ?? "bg-gray-100 text-gray-800 border-gray-200"}`}>
              {TOPIC_LABELS[problem.problem_type] ?? problem.problem_type}
            </span>
            {problem.score != null && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                {problem.score} / 10
              </span>
            )}
          </div>

          {problem.ocr_text && (
            <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{problem.ocr_text}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className={cfg.color}>{cfg.label}</span>
            {(problem.attempts ?? 0) > 0 && <span>{problem.attempts} попытки</span>}
            {(problem.time_spent_minutes ?? 0) > 0 && <span>{problem.time_spent_minutes} мин</span>}
          </div>
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded hover:bg-gray-50 transition-colors"
        >
          {expanded ? "↑" : "↓"}
        </button>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
          {/* Score */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">Балл (0–10)</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => updateProgress({ score: n })}
                  className={`w-6 h-6 text-xs rounded transition-colors ${
                    problem.score === n
                      ? "bg-green-500 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Status buttons */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">Статус</span>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => updateProgress({ status: s })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      status === s
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">Время (мин)</span>
            <div className="flex gap-1">
              {[5, 10, 15, 20, 30, 45, 60].map((t) => (
                <button
                  key={t}
                  onClick={() => updateProgress({ time_spent_minutes: t })}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    problem.time_spent_minutes === t
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-16 pt-1.5">Заметки</span>
            <textarea
              defaultValue={problem.notes ?? ""}
              onBlur={(e) => updateProgress({ notes: e.target.value })}
              placeholder="Что сложно, что нужно повторить..."
              rows={2}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-blue-300 bg-white"
            />
          </div>

          {/* Full text toggle */}
          {problem.ocr_text && problem.ocr_text.length > 150 && (
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-600">Текст задачи полностью</summary>
              <pre className="mt-2 whitespace-pre-wrap text-gray-600 font-sans leading-relaxed">{problem.ocr_text}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
