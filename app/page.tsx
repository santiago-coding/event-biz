import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  const total = await prisma.event.count();
  const discovered = await prisma.event.count({ where: { status: "discovered" } });
  const researching = await prisma.event.count({ where: { status: "researching" } });
  const applied = await prisma.event.count({ where: { status: "applied" } });
  const accepted = await prisma.event.count({ where: { status: "accepted" } });
  const scheduled = await prisma.event.count({ where: { status: "scheduled" } });

  return { total, discovered, researching, applied, accepted, scheduled };
}

async function getTopEvents() {
  return prisma.event.findMany({
    orderBy: { score: "desc" },
    take: 15,
  });
}

async function getUpcomingDeadlines() {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return prisma.event.findMany({
    where: {
      appDeadline: { gte: now, lte: twoWeeks },
      status: { in: ["discovered", "researching"] },
    },
    orderBy: { appDeadline: "asc" },
    take: 10,
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    discovered: "bg-blue-100 text-blue-800",
    researching: "bg-yellow-100 text-yellow-800",
    applied: "bg-purple-100 text-purple-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    scheduled: "bg-emerald-100 text-emerald-800",
    completed: "bg-gray-100 text-gray-800",
    skipped: "bg-gray-100 text-gray-500",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color} shadow-sm`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-75">{label}</div>
    </div>
  );
}

export default async function Dashboard() {
  const stats = await getStats();
  const topEvents = await getTopEvents();
  const deadlines = await getUpcomingDeadlines();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Straight Ahead Beauty — Event Pipeline</p>
        </div>
        <div className="flex gap-3">
          <form action="/api/scout" method="POST">
            <button
              type="button"
              id="scout-btn"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Scout Events
            </button>
          </form>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Events" value={stats.total} color="bg-white" />
        <StatCard label="Discovered" value={stats.discovered} color="bg-blue-50" />
        <StatCard label="Researching" value={stats.researching} color="bg-yellow-50" />
        <StatCard label="Applied" value={stats.applied} color="bg-purple-50" />
        <StatCard label="Accepted" value={stats.accepted} color="bg-green-50" />
        <StatCard label="Scheduled" value={stats.scheduled} color="bg-emerald-50" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main event table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top Events by Score</h2>
              <Link href="/events" className="text-sm text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            {topEvents.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <p className="text-lg mb-2">No events yet</p>
                <p className="text-sm">Click &quot;Scout Events&quot; to discover events from state fair websites</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Score</th>
                    <th className="text-left px-6 py-3">Event</th>
                    <th className="text-left px-6 py-3">State</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-right px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold ${
                          event.score >= 75 ? "bg-green-100 text-green-700" :
                          event.score >= 50 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {event.score}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/events/${event.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {event.name}
                        </Link>
                        {event.category && (
                          <span className="block text-xs text-gray-400 mt-0.5">{event.category}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{event.state || "—"}</td>
                      <td className="px-6 py-3"><StatusBadge status={event.status} /></td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Deadline alerts sidebar */}
        <div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
              <p className="text-xs text-gray-400 mt-0.5">Next 14 days</p>
            </div>
            {deadlines.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No upcoming deadlines
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deadlines.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="block px-6 py-3 hover:bg-gray-50">
                    <div className="font-medium text-sm">{event.name}</div>
                    <div className="text-xs text-red-600 mt-0.5">
                      Due: {event.appDeadline?.toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href="/events?status=discovered"
                className="block w-full text-left px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Review discovered events
              </Link>
              <Link
                href="/events?status=applied"
                className="block w-full text-left px-4 py-2.5 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                Check application statuses
              </Link>
              <Link
                href="/settings"
                className="block w-full text-left px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Edit company profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scout button JS handler */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('scout-btn')?.addEventListener('click', async function() {
              const btn = this;
              btn.disabled = true;
              btn.textContent = 'Scouting...';
              try {
                const res = await fetch('/api/scout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ source: 'fairs' })
                });
                const data = await res.json();
                btn.textContent = 'Found ' + data.found + ' events!';
                setTimeout(() => location.reload(), 1500);
              } catch(e) {
                btn.textContent = 'Error - try again';
                btn.disabled = false;
              }
            });
          `,
        }}
      />
    </div>
  );
}
