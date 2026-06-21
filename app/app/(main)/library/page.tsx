"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const LatexRenderer = dynamic(() => import("@/components/LatexRenderer"), { ssr: false });

interface Problem {
  id?: string;
  title?: string;
  text_plain?: string;
  text_html?: string;
  latex_source?: string;
  solution_source?: string;
  year?: number;
  source_text?: string;
  topic?: string;
  subtopic?: string;
  max_score?: number;
  url?: string;
  images?: Array<{ url: string; local: string }>;
  geo_images?: Record<string, string>;
}

interface TopicEntry {
  topic: string;
  subtopics: string[];
  count: number;
}

interface LibraryResponse {
  problems: Problem[];
  total: number;
  page: number;
  perPage: number;
  topics: TopicEntry[];
  error?: string;
}

const TOPIC_COLORS: Record<string, string> = {
  "Алгебра": "bg-blue-100 text-blue-800 border-blue-200",
  "Тригонометрия": "bg-purple-100 text-purple-800 border-purple-200",
  "Математический анализ": "bg-green-100 text-green-800 border-green-200",
  "Планиметрия": "bg-amber-100 text-amber-800 border-amber-200",
  "Стереометрия": "bg-orange-100 text-orange-800 border-orange-200",
  "Теория чисел": "bg-rose-100 text-rose-800 border-rose-200",
  "Текстовые задачи": "bg-teal-100 text-teal-800 border-teal-200",
};

function ProblemCard({ p }: { p: Problem }) {
  const [showSolution, setShowSolution] = useState(false);
  const colorClass = TOPIC_COLORS[p.topic || ""] || "bg-gray-100 text-gray-700 border-gray-200";
  const hasLatex = Boolean(p.latex_source);
  const hasSolution = Boolean(p.solution_source);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 flex flex-wrap gap-2">
          {p.topic && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
              {p.topic}
            </span>
          )}
          {p.subtopic && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
              {p.subtopic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
          {p.year && <span>{p.year} г.</span>}
          {p.max_score && <span className="text-amber-600 font-medium">{p.max_score} б.</span>}
          {p.id && <span className="text-gray-400">#{p.id}</span>}
        </div>
      </div>

      {/* Problem body — always rendered with KaTeX if available */}
      {hasLatex ? (
        <LatexRenderer source={p.latex_source!} geoImages={p.geo_images} />
      ) : (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
          {(p.text_plain || "").replace(/Источники:[\s\S]+/, "").trim().slice(0, 400)}
        </p>
      )}

      {/* Solution toggle */}
      {hasSolution && (
        <div className="mt-4">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              showSolution
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "text-gray-500 border-gray-200 hover:border-emerald-200 hover:text-emerald-600"
            }`}
          >
            {showSolution ? "Скрыть решение" : "Показать решение"}
          </button>

          {showSolution && (
            <div className="mt-3 pt-3 border-t border-emerald-100">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Решение</p>
              <LatexRenderer source={p.solution_source!} geoImages={p.geo_images} />
            </div>
          )}
        </div>
      )}

      {/* Footer: source reference only */}
      {p.source_text && (
        <p className="mt-3 text-xs text-gray-400">{p.source_text}</p>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (selectedTopic) params.set("topic", selectedTopic);
    if (selectedSubtopic) params.set("subtopic", selectedSubtopic);
    if (search) params.set("q", search);
    fetch(`/api/library?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, selectedTopic, selectedSubtopic, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(prev => prev === topic ? "" : topic);
    setSelectedSubtopic("");
    setPage(1);
  };

  const handleSubtopicClick = (sub: string) => {
    setSelectedSubtopic(prev => prev === sub ? "" : sub);
    setPage(1);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 0;
  const subtopics = data?.topics.find(t => t.topic === selectedTopic)?.subtopics || [];

  return (
    <div className="flex gap-6">
      {/* Left topic filter */}
      <aside className="w-52 shrink-0">
        <div className="sticky top-8 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Темы</p>
          <button
            onClick={() => { setSelectedTopic(""); setSelectedSubtopic(""); setPage(1); }}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${!selectedTopic ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Все темы {data && <span className="text-gray-400 text-xs">({data.total})</span>}
          </button>
          {(data?.topics || []).map((t) => (
            <div key={t.topic}>
              <button
                onClick={() => handleTopicClick(t.topic)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedTopic === t.topic ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t.topic}
                <span className="ml-1 text-gray-400 text-xs">({t.count})</span>
              </button>
              {selectedTopic === t.topic && subtopics.length > 0 && (
                <div className="ml-3 mt-0.5 space-y-0.5">
                  {subtopics.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSubtopicClick(s)}
                      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${selectedSubtopic === s ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Библиотека задач</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Задания прошлых лет ДВИ МГУ
            {data && !loading && (
              <span className="ml-2 text-gray-400">· {data.total} задач</span>
            )}
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Поиск по тексту задачи..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Найти
          </button>
          {(search || selectedTopic || selectedSubtopic) && (
            <button
              onClick={() => { setSearch(""); setSearchInput(""); setSelectedTopic(""); setSelectedSubtopic(""); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Active filters */}
        {(selectedTopic || selectedSubtopic) && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {selectedTopic && (
              <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border ${TOPIC_COLORS[selectedTopic] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                {selectedTopic}
                <button onClick={() => { setSelectedTopic(""); setSelectedSubtopic(""); }} className="ml-1 hover:opacity-70">×</button>
              </span>
            )}
            {selectedSubtopic && (
              <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                {selectedSubtopic}
                <button onClick={() => setSelectedSubtopic("")} className="ml-1 hover:opacity-70">×</button>
              </span>
            )}
          </div>
        )}

        {!loading && data?.error && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
            <p className="font-medium">Библиотека не найдена</p>
          </div>
        )}

        {loading ? (
          <div className="grid gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {(data?.problems || []).map((p, i) => (
                <ProblemCard key={p.id || i} p={p} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-1 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Назад
                </button>
                {[...Array(Math.min(7, totalPages))].map((_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${page === pg ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50 border-gray-200"}`}
                    >
                      {pg}
                    </button>
                  );
                })}
                {totalPages > 7 && <span className="px-2 py-1.5 text-sm text-gray-400">...</span>}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Вперёд
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
