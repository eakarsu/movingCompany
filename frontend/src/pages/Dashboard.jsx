import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardOverview, getTodaySchedule, getRecentActivity, getPerformanceMetrics } from '../api';
import { format } from 'date-fns';
import { showToast } from '../components/Toast';
import { DashboardSkeleton } from '../components/Skeleton';

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
      .catch(() => showToast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Conversion Rate</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{metrics?.conversionRate || 0}%</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Quote Acceptance</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{metrics?.quoteAcceptanceRate || 0}%</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Jobs Completed (30d)</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-600">{metrics?.jobsCompleted || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Avg. Job Value</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">${(metrics?.averageJobValue || 0).toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Today's Schedule</h2>
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
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-blue-900 text-sm truncate">{job.jobNumber}</p>
                      <p className="text-xs sm:text-sm text-blue-700 truncate">
                        {job.lead?.firstName} {job.lead?.lastName}
                      </p>
                    </div>
                    <span className="badge badge-blue text-xs flex-shrink-0">{job.status}</span>
                  </div>
                </Link>
              ))}
              {today?.surveys?.map((survey) => (
                <div key={survey.id} className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-green-900 text-sm truncate">{survey.type} Survey</p>
                      <p className="text-xs sm:text-sm text-green-700 truncate">
                        {survey.lead?.firstName} {survey.lead?.lastName}
                      </p>
                    </div>
                    <span className="badge badge-green text-xs flex-shrink-0">Survey</span>
                  </div>
                </div>
              ))}
              {today?.followUps?.map((followUp) => (
                <div key={followUp.id} className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-yellow-900 text-sm truncate">{followUp.type} Follow-up</p>
                      <p className="text-xs sm:text-sm text-yellow-700 truncate">
                        {followUp.lead?.firstName} {followUp.lead?.lastName}
                      </p>
                    </div>
                    <span className="badge badge-yellow text-xs flex-shrink-0">Follow-up</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity?.recentLeads?.map((lead) => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 mr-2">
                    <p className="font-medium text-sm truncate">New Lead: {lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(lead.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <span className="badge badge-blue text-xs flex-shrink-0">{lead.source}</span>
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
                  <div className="min-w-0 mr-2">
                    <p className="font-medium text-sm truncate">Quote {quote.quoteNumber}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {quote.lead?.firstName} {quote.lead?.lastName} - ${quote.total?.toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge text-xs flex-shrink-0 ${quote.status === 'ACCEPTED' ? 'badge-green' : 'badge-gray'}`}>
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
    <div className={`card border p-3 sm:p-6 ${colors[color]}`}>
      <p className="text-xs sm:text-sm text-gray-500">{title}</p>
      <p className="text-xl sm:text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
