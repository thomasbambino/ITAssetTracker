import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Medal, ShoppingBag, TrendingUp, TrendingDown, Gift, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type PointsLogEntry = {
  id: number;
  points: number;
  quantity: number;
  description: string | null;
  type: string;
  referenceId: string | null;
  createdAt: string;
};

type UserBadge = {
  id: number;
  badgeId: number;
  earnedAt: string;
  badge: {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    threshold: number;
  };
};

type Redemption = {
  id: number;
  pointsSpent: number;
  status: string;
  itemName: string;
  notes: string | null;
  createdAt: string;
  fulfilledAt: string | null;
};

type Balance = {
  currentBalance: number;
  totalEarned: number;
  totalRedeemed: number;
};

const typeColors: Record<string, string> = {
  earned: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  redeemed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  bonus: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function MyRewards() {
  const { data: balance } = useQuery<Balance>({
    queryKey: ['/api/rewards/my/balance'],
  });

  const { data: history, isLoading: historyLoading } = useQuery<PointsLogEntry[]>({
    queryKey: ['/api/rewards/my/history'],
  });

  const { data: badges } = useQuery<UserBadge[]>({
    queryKey: ['/api/rewards/my/badges'],
  });

  const { data: redemptions, isLoading: redemptionsLoading } = useQuery<Redemption[]>({
    queryKey: ['/api/rewards/my/redemptions'],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Rewards</h1>
        <p className="text-muted-foreground">Your points history, badges, and redemptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold">{(balance?.currentBalance ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{(balance?.totalEarned ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Redeemed</p>
                <p className="text-2xl font-bold">{(balance?.totalRedeemed ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Showcase */}
      {badges && badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="h-5 w-5 text-purple-500" />
              Earned Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {badges.map((ub) => (
                <div
                  key={ub.id}
                  className="flex flex-col items-center p-3 rounded-lg border bg-card text-center"
                >
                  <span className="text-2xl mb-1">{ub.badge.icon || '🏆'}</span>
                  <span className="text-sm font-medium">{ub.badge.name}</span>
                  {ub.badge.description && (
                    <span className="text-xs text-muted-foreground mt-1">{ub.badge.description}</span>
                  )}
                  <span className="text-xs text-muted-foreground mt-1">
                    {new Date(ub.earnedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: History + Redemptions */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="h-4 w-4" /> Points History
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" /> Redemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !history || history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No points history yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{entry.description || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[entry.type] || ''}`}>
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.points >= 0 ? '+' : ''}{entry.points.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions">
          <Card>
            <CardContent className="pt-6">
              {redemptionsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !redemptions || redemptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No redemptions yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{r.itemName || '-'}</TableCell>
                        <TableCell className="font-medium">{r.pointsSpent.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || ''}`}>
                            {r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
