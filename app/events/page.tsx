"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface Event {
  id: string;
  name: string;
  state: string | null;
  location: string | null;
  startDate: string | null;
  category: string | null;
  score: number;
  status: string;
  source: string;
  vendorAppUrl: string | null;
  link: string | null;
  appDeadline: string | null;
}

interface Stats {
  total: number;
  discovered: number;
  researching: number;
  applied: number;
  accepted: number;
  rejected: number;
  scheduled: number;
  completed: number;
}

const STATUS_OPTIONS = [
  "all", "discovered", "researching", "applied", "accepted", "rejected", "scheduled", "completed",
];

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-blue-100 text-blue-800",
  researching: "bg-yellow-100 text-yellow-800",
  applied: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  scheduled: "bg-emerald-100 text-emerald-800",
  completed: "bg-gray-100 text-gray-800",
  skipped: "bg-gray-100 text-gray-500",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("score");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, order, limit: "200" });
    if (status !== "all") params.set("status", status);

    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();
    setEvents(data.events);
    setStats(data.stats);
    setLoading(false);
  }, [status, sort, order]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleStatusUpdate = async (eventId: string, newStatus: string) => {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchEvents();
  };

  const handleApply = async (eventId: string) => {
    setApplyingId(eventId);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.success) {
        alert(`Applied! Filled ${result.filled || 0} fields. ${result.hasCaptcha ? "CAPTCHA detected — needs manual solve." : ""}`);
      } else {
        alert(`Application issue: ${result?.error || "Unknown error"}`);
      }
    } catch {
      alert("Application failed — check console");
    }
    setApplyingId(null);
    fetchEvents();
  };

  const toggleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(field);
      setOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sort !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{order === "desc" ? "↓" : "↑"}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        {stats && (
          <div className="flex gap-3 text-sm">
            {Object.entries(stats).filter(([k]) => k !== "total").map(([key, val]) => (
              <span key={key} className={`px-2 py-1 rounded ${STATUS_COLORS[key] || "bg-gray-100"}`}>
                {key}: {val}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === s
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {s === "all" ? "All" : s}
            {stats && s !== "all" && (
              <span className="ml-1 opacity-60">({stats[s as keyof Stats] ?? 0})</span>
            )}
          </button>
        ))}
      </div>

      {/* Events table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">Loading...</div>
        ) : events.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-lg mb-2">No events found</p>
            <p className="text-sm">Try a different filter or run the scout</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("score")}>
                    Score <SortIcon field="score" />
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Event <SortIcon field="name" />
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("state")}>
                    State <SortIcon field="state" />
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold ${
                        event.score >= 75 ? "bg-green-100 text-green-700" :
                        event.score >= 50 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {event.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/events/${event.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {event.name}
                      </Link>
                      {event.category && (
                        <span className="block text-xs text-gray-400 mt-0.5">{event.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{event.state || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[event.status] || "bg-gray-100"}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{event.source}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {(event.status === "discovered" || event.status === "researching") && (event.vendorAppUrl || event.link) && (
                          <button
                            onClick={() => handleApply(event.id)}
                            disabled={applyingId === event.id}
                            className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {applyingId === event.id ? "Applying..." : "Apply"}
                          </button>
                        )}
                        {event.status === "discovered" && (
                          <button
                            onClick={() => handleStatusUpdate(event.id, "researching")}
                            className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md hover:bg-yellow-200 transition-colors"
                          >
                            Research
                          </button>
                        )}
                        {event.status === "discovered" && (
                          <button
                            onClick={() => handleStatusUpdate(event.id, "skipped")}
                            className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
