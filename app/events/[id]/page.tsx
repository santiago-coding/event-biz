"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  state: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  category: string | null;
  attendance: number | null;
  boothType: string | null;
  boothCost: number | null;
  source: string;
  link: string | null;
  vendorAppUrl: string | null;
  appDeadline: string | null;
  applicationType: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  organizerPhone: string | null;
  score: number;
  status: string;
  hasHairVendor: boolean | null;
  notes: string | null;
  screenshotPath: string | null;
  appliedDate: string | null;
  acceptedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_FLOW = ["discovered", "researching", "applied", "accepted", "scheduled", "completed"];

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-blue-500",
  researching: "bg-yellow-500",
  applied: "bg-purple-500",
  accepted: "bg-green-500",
  rejected: "bg-red-500",
  scheduled: "bg-emerald-500",
  completed: "bg-gray-500",
  skipped: "bg-gray-400",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        setNotes(data.notes || "");
        setLoading(false);
      });
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        ...(newStatus === "accepted" ? { acceptedDate: new Date().toISOString() } : {}),
      }),
    });
    const updated = await res.json();
    setEvent(updated);
  };

  const saveNotes = async () => {
    setSaving(true);
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const updated = await res.json();
    setEvent(updated);
    setSaving(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.success) {
        alert(`Applied! Filled ${result.filled || 0} fields. ${result.hasCaptcha ? "CAPTCHA detected." : ""}`);
      } else {
        alert(`Issue: ${result?.error || "Unknown error"}`);
      }
      const refreshed = await fetch(`/api/events/${id}`).then((r) => r.json());
      setEvent(refreshed);
      setNotes(refreshed.notes || "");
    } catch {
      alert("Application failed");
    }
    setApplying(false);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!event) return <div className="text-center py-12 text-red-500">Event not found</div>;

  const currentStepIndex = STATUS_FLOW.indexOf(event.status);

  return (
    <div>
      <Link href="/events" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
        ← Back to Events
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-500 mt-1">
            {event.state && `${event.state} · `}{event.category || event.source}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-14 h-14 rounded-xl text-lg font-bold ${
            event.score >= 75 ? "bg-green-100 text-green-700" :
            event.score >= 50 ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          }`}>
            {event.score}
          </span>
        </div>
      </div>

      {/* Status timeline */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Application Pipeline</h2>
        <div className="flex items-center gap-2">
          {STATUS_FLOW.map((step, i) => {
            const isActive = step === event.status;
            const isPast = currentStepIndex >= 0 && i < currentStepIndex;
            const isRejected = event.status === "rejected" && step === "applied";

            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? `${STATUS_COLORS[step]} text-white` :
                    isPast ? "bg-gray-300 text-white" :
                    isRejected ? "bg-red-500 text-white" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {isPast ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? "font-semibold text-gray-900" : "text-gray-400"}`}>
                    {step}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isPast ? "bg-gray-300" : "bg-gray-100"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Event info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Event Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-400">Location</dt>
                <dd className="text-sm font-medium">{event.location || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Dates</dt>
                <dd className="text-sm font-medium">
                  {event.startDate ? new Date(event.startDate).toLocaleDateString() : "TBD"}
                  {event.endDate && ` — ${new Date(event.endDate).toLocaleDateString()}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Attendance</dt>
                <dd className="text-sm font-medium">{event.attendance?.toLocaleString() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Booth Type</dt>
                <dd className="text-sm font-medium">{event.boothType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Booth Cost</dt>
                <dd className="text-sm font-medium">{event.boothCost ? `$${event.boothCost}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Application Deadline</dt>
                <dd className="text-sm font-medium text-red-600">
                  {event.appDeadline ? new Date(event.appDeadline).toLocaleDateString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Application Type</dt>
                <dd className="text-sm font-medium">{event.applicationType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Hair Vendor Present?</dt>
                <dd className="text-sm font-medium">
                  {event.hasHairVendor === null ? "Unknown" : event.hasHairVendor ? "Yes" : "No"}
                </dd>
              </div>
            </dl>

            {(event.link || event.vendorAppUrl) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {event.link && (
                  <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 mr-4">
                    Event website ↗
                  </a>
                )}
                {event.vendorAppUrl && (
                  <a href={event.vendorAppUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700">
                    Application page ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Organizer info */}
          {(event.organizerName || event.organizerEmail || event.organizerPhone) && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Organizer</h2>
              <dl className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-gray-400">Name</dt>
                  <dd className="text-sm font-medium">{event.organizerName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Email</dt>
                  <dd className="text-sm font-medium">{event.organizerEmail || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Phone</dt>
                  <dd className="text-sm font-medium">{event.organizerPhone || "—"}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add notes about this event..."
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Actions</h2>
            <div className="space-y-2">
              {(event.status === "discovered" || event.status === "researching") && (event.vendorAppUrl || event.link) && (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {applying ? "Applying..." : "Auto-Apply"}
                </button>
              )}

              {event.status === "discovered" && (
                <button
                  onClick={() => updateStatus("researching")}
                  className="w-full px-4 py-2.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-200 transition-colors"
                >
                  Mark as Researching
                </button>
              )}

              {event.status === "applied" && (
                <>
                  <button
                    onClick={() => updateStatus("accepted")}
                    className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark Accepted
                  </button>
                  <button
                    onClick={() => updateStatus("rejected")}
                    className="w-full px-4 py-2.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Mark Rejected
                  </button>
                </>
              )}

              {event.status === "accepted" && (
                <button
                  onClick={() => updateStatus("scheduled")}
                  className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Mark Scheduled
                </button>
              )}

              {event.status === "scheduled" && (
                <button
                  onClick={() => updateStatus("completed")}
                  className="w-full px-4 py-2.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Mark Completed
                </button>
              )}

              {event.status !== "skipped" && event.status !== "completed" && (
                <button
                  onClick={() => updateStatus("skipped")}
                  className="w-full px-4 py-2.5 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Skip Event
                </button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Metadata</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Source</dt>
                <dd className="text-sm">{event.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Discovered</dt>
                <dd className="text-sm">{new Date(event.createdAt).toLocaleString()}</dd>
              </div>
              {event.appliedDate && (
                <div>
                  <dt className="text-xs text-gray-400">Applied</dt>
                  <dd className="text-sm">{new Date(event.appliedDate).toLocaleString()}</dd>
                </div>
              )}
              {event.acceptedDate && (
                <div>
                  <dt className="text-xs text-gray-400">Accepted</dt>
                  <dd className="text-sm">{new Date(event.acceptedDate).toLocaleString()}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400">Last Updated</dt>
                <dd className="text-sm">{new Date(event.updatedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">ID</dt>
                <dd className="text-xs font-mono text-gray-400">{event.id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
