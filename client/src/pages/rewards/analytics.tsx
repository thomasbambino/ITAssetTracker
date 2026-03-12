import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Ticket,
  Phone,
  Star,
  Users,
  ArrowUpDown,
} from 'lucide-react';

type LeaderboardEntry = {
  userId: number;
  firstName: string;
  lastName: string;
  department: string | null;
  profilePhoto: string | null;
  totalEarned: number;
  totalRedeemed: number;
  currentBalance: number;
  ticketsSolved: number;
  callsHandled: number;
};

type SortKey = 'name' | 'department' | 'ticketsSolved' | 'callsHandled' | 'totalEarned' | 'currentBalance';
type SortDir = 'asc' | 'desc';

export default function RewardsAnalytics() {
  const [sortKey, setSortKey] = useState<SortKey>('totalEarned');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/rewards/leaderboard'],
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // KPI calculations
  const totalCoins = leaderboard?.reduce((sum, e) => sum + e.totalEarned, 0) ?? 0;
  const totalTickets = leaderboard?.reduce((sum, e) => sum + e.ticketsSolved, 0) ?? 0;
  const totalCalls = leaderboard?.reduce((sum, e) => sum + e.callsHandled, 0) ?? 0;
  const activeParticipants = leaderboard?.filter(e => e.currentBalance > 0).length ?? 0;

  // Chart data
  const top10Coins = leaderboard
    ? [...leaderboard]
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10)
        .map(e => ({
          name: `${e.firstName} ${e.lastName.charAt(0)}.`,
          coins: e.totalEarned,
        }))
    : [];

  const top10Activity = leaderboard
    ? [...leaderboard]
        .sort((a, b) => (b.ticketsSolved + b.callsHandled) - (a.ticketsSolved + a.callsHandled))
        .slice(0, 10)
        .map(e => ({
          name: `${e.firstName} ${e.lastName.charAt(0)}.`,
          tickets: e.ticketsSolved,
          calls: e.callsHandled,
        }))
    : [];

  // Sorted table data
  const sortedData = leaderboard
    ? [...leaderboard].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') {
          cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        } else if (sortKey === 'department') {
          cmp = (a.department ?? '').localeCompare(b.department ?? '');
        } else {
          cmp = (a[sortKey] as number) - (b[sortKey] as number);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : [];

  const kpis = [
    { label: 'Total Coins Awarded', value: totalCoins.toLocaleString(), icon: Star, color: 'text-yellow-500' },
    { label: 'Total Tickets Solved', value: totalTickets.toLocaleString(), icon: Ticket, color: 'text-blue-500' },
    { label: 'Total Calls Handled', value: totalCalls.toLocaleString(), icon: Phone, color: 'text-green-500' },
    { label: 'Active Participants', value: activeParticipants.toLocaleString(), icon: Users, color: 'text-purple-500' },
  ];

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
      onClick={() => toggleSort(sortKeyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyName ? 'text-primary' : 'opacity-40'}`} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Rewards Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top 10 by Coins Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : top10Coins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10Coins} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={11} className="fill-muted-foreground" />
                  <YAxis fontSize={11} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="coins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top 10 by Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : top10Activity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10Activity} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={11} className="fill-muted-foreground" />
                  <YAxis fontSize={11} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="tickets" name="Tickets Solved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="calls" name="Calls Handled" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-User Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-User Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No user data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <SortHeader label="Name" sortKeyName="name" />
                    <SortHeader label="Department" sortKeyName="department" />
                    <SortHeader label="Tickets Solved" sortKeyName="ticketsSolved" />
                    <SortHeader label="Calls Handled" sortKeyName="callsHandled" />
                    <SortHeader label="Total Earned" sortKeyName="totalEarned" />
                    <SortHeader label="Current Balance" sortKeyName="currentBalance" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedData.map(entry => (
                    <tr key={entry.userId} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {entry.firstName} {entry.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {entry.department || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.ticketsSolved}</td>
                      <td className="px-4 py-3 text-sm">{entry.callsHandled}</td>
                      <td className="px-4 py-3 text-sm font-medium">{entry.totalEarned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{entry.currentBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
