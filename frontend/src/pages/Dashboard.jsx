import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardOverview, getTodaySchedule, getRecentActivity, getPerformanceMetrics } from '../api';
import { format } from 'date-fns';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [today, setToday] = useState(null);
  const [activity, setActivity] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardOverview(),
      getTodaySchedule(),
      getRecentActivity(),
      getPerformanceMetrics(),
    ])
      .then(([overviewRes, todayRes, activityRes, metricsRes]) => {
        setOverview(overviewRes.data);
        setToday(todayRes.data);
        setActivity(activityRes.data);
        setMetrics(metricsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="New Leads Today"
          value={overview?.leads?.today || 0}
          subtitle={`${overview?.leads?.thisMonth || 0} this month`}
          color="blue"
        />
        <StatCard
          title="Jobs Today"
          value={overview?.jobs?.today || 0}
          subtitle={`${overview?.jobs?.active || 0} active jobs`}
          color="green"
        />
        <StatCard
          title="Revenue This Month"
          value={`$${(overview?.financials?.revenueThisMonth || 0).toLocaleString()}`}
          subtitle={`$${(overview?.financials?.pendingInvoices || 0).toLocaleString()} pending`}
          color="yellow"
        />
        <StatCard
          title="Pending Quotes"
          value={overview?.quotes?.pending || 0}
          subtitle={`${overview?.claims?.open || 0} open claims`}
          color="purple"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Conversion Rate</p>
          <p className="text-2xl font-bold text-blue-600">{metrics?.conversionRate || 0}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Quote Acceptance</p>
          <p className="text-2xl font-bold text-green-600">{metrics?.quoteAcceptanceRate || 0}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Jobs Completed (30d)</p>
          <p className="text-2xl font-bold text-purple-600">{metrics?.jobsCompleted || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Avg. Job Value</p>
          <p className="text-2xl font-bold text-yellow-600">${(metrics?.averageJobValue || 0).toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Today's Schedule</h2>
          {today?.jobs?.length === 0 && today?.surveys?.length === 0 && today?.followUps?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No scheduled activities for today</p>
          ) : (
            <div className="space-y-3">
              {today?.jobs?.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-blue-900">{job.jobNumber}</p>
                      <p className="text-sm text-blue-700">
                        {job.lead?.firstName} {job.lead?.lastName}
                      </p>
                    </div>
                    <span className="badge badge-blue">{job.status}</span>
                  </div>
                </Link>
              ))}
              {today?.surveys?.map((survey) => (
                <div key={survey.id} className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-green-900">{survey.type} Survey</p>
                      <p className="text-sm text-green-700">
                        {survey.lead?.firstName} {survey.lead?.lastName}
                      </p>
                    </div>
                    <span className="badge badge-green">Survey</span>
                  </div>
                </div>
              ))}
              {today?.followUps?.map((followUp) => (
                <div key={followUp.id} className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-yellow-900">{followUp.type} Follow-up</p>
                      <p className="text-sm text-yellow-700">
                        {followUp.lead?.firstName} {followUp.lead?.lastName}
                      </p>
                    </div>
                    <span className="badge badge-yellow">Follow-up</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity?.recentLeads?.map((lead) => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">New Lead: {lead.firstName} {lead.lastName}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(lead.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <span className="badge badge-blue">{lead.source}</span>
                </div>
              </Link>
            ))}
            {activity?.recentQuotes?.map((quote) => (
              <Link
                key={quote.id}
                to={`/quotes/${quote.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Quote {quote.quoteNumber}</p>
                    <p className="text-sm text-gray-500">
                      {quote.lead?.firstName} {quote.lead?.lastName} - ${quote.total.toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge ${quote.status === 'ACCEPTED' ? 'badge-green' : 'badge-gray'}`}>
                    {quote.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`card border ${colors[color]}`}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
