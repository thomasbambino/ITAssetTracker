import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Medal, Star, TrendingUp, TrendingDown, ShoppingCart, Gift, Tag,
  History, ShoppingBag, Ticket, Phone,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// --- Types ---

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

type Balance = {
  userId: number;
  totalEarned: number;
  totalRedeemed: number;
  currentBalance: number;
};

type UserBadge = {
  id: number;
  badgeId: number;
  earnedAt: string;
  badge: {
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
    description: string | null;
    threshold: number;
  };
};

type CatalogItem = {
  id: number;
  name: string;
  description: string | null;
  pointsCost: number;
  category: string | null;
  imageUrl: string | null;
  stock: number | null;
  isActive: boolean;
};

type PointsLogEntry = {
  id: number;
  points: number;
  quantity: number;
  description: string | null;
  type: string;
  referenceId: string | null;
  createdAt: string;
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

// --- Constants ---

const categoryIcons: Record<string, React.ReactNode> = {
  gift_card: <Gift className="h-4 w-4" />,
  pto: <Star className="h-4 w-4" />,
  swag: <Tag className="h-4 w-4" />,
  experience: <Star className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  gift_card: 'Gift Card',
  pto: 'PTO',
  swag: 'Swag',
  experience: 'Experience',
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

// --- Component ---

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const [redeemItem, setRedeemItem] = useState<CatalogItem | null>(null);

  // Shared queries
  const { data: currentUser } = useQuery<any>({ queryKey: ['/api/users/me'] });
  const { data: myBalance } = useQuery<Balance>({ queryKey: ['/api/rewards/my/balance'] });
  const { data: myBadges } = useQuery<UserBadge[]>({ queryKey: ['/api/rewards/my/badges'] });

  // Leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/rewards/leaderboard'],
  });

  // Catalog
  const { data: catalog, isLoading: catalogLoading } = useQuery<CatalogItem[]>({
    queryKey: ['/api/rewards/catalog'],
  });

  // My Rewards
  const { data: history, isLoading: historyLoading } = useQuery<PointsLogEntry[]>({
    queryKey: ['/api/rewards/my/history'],
  });
  const { data: redemptions, isLoading: redemptionsLoading } = useQuery<Redemption[]>({
    queryKey: ['/api/rewards/my/redemptions'],
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async (catalogItemId: number) => {
      return apiRequest({ url: '/api/rewards/redeem', method: 'POST', data: { catalogItemId } });
    },
    onSuccess: () => {
      toast({ title: "Redemption submitted!", description: "Your request is pending approval." });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/my/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/catalog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/my/redemptions'] });
      setRedeemItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Redemption failed", description: error.message || "Something went wrong", variant: "destructive" });
      setRedeemItem(null);
    },
  });

  const myRank = leaderboard?.findIndex(e => e.userId === currentUser?.id);
  const rankDisplay = myRank !== undefined && myRank >= 0 ? myRank + 1 : '-';
  const currentBalance = myBalance?.currentBalance ?? 0;

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rewards</h1>
        <p className="text-muted-foreground">Track your Connecta Coins, badges, and standings</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Coins</p>
                <p className="text-2xl font-bold">{currentBalance.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{(myBalance?.totalEarned ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Rank</p>
                <p className="text-2xl font-bold">#{rankDisplay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Medal className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badges Earned</p>
                <p className="text-2xl font-bold">{myBadges?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard" className="flex items-center gap-1">
            <Trophy className="h-4 w-4" /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" /> Catalog
          </TabsTrigger>
          <TabsTrigger value="my-rewards" className="flex items-center gap-1">
            <Star className="h-4 w-4" /> My Rewards
          </TabsTrigger>
        </TabsList>

        {/* ===== LEADERBOARD TAB ===== */}
        <TabsContent value="leaderboard" className="space-y-6">
          {/* My Badges */}
          {myBadges && myBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {myBadges.map((ub) => (
                    <Badge
                      key={ub.id}
                      variant="outline"
                      className="px-3 py-1.5 text-sm"
                      style={{ borderColor: ub.badge.color || undefined, color: ub.badge.color || undefined }}
                    >
                      {ub.badge.icon && <span className="mr-1">{ub.badge.icon}</span>}
                      {ub.badge.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !leaderboard || leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rewards data yet. Coins will appear here once employees start earning.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="hidden md:flex items-center gap-4 p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="w-8" />
                    <div className="w-10" />
                    <div className="flex-1">Name</div>
                    <div className="w-20 text-center flex items-center gap-1 justify-center"><Ticket className="h-3 w-3" /> Tickets</div>
                    <div className="w-20 text-center flex items-center gap-1 justify-center"><Phone className="h-3 w-3" /> Calls</div>
                    <div className="w-24 text-right">Coins</div>
                  </div>
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                        entry.userId === currentUser?.id
                          ? 'bg-primary/5 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-shrink-0">
                        {entry.profilePhoto ? (
                          <img
                            src={entry.profilePhoto}
                            alt={`${entry.firstName} ${entry.lastName}`}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {entry.firstName[0]}{entry.lastName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.firstName} {entry.lastName}
                          {entry.userId === currentUser?.id && (
                            <span className="text-xs text-primary ml-2">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{entry.department || 'No Department'}</p>
                      </div>
                      <div className="hidden md:block w-20 text-center">
                        <p className="font-medium">{entry.ticketsSolved.toLocaleString()}</p>
                      </div>
                      <div className="hidden md:block w-20 text-center">
                        <p className="font-medium">{entry.callsHandled.toLocaleString()}</p>
                      </div>
                      <div className="text-right w-24">
                        <p className="font-bold text-lg">{entry.totalEarned.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">coins</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CATALOG TAB ===== */}
        <TabsContent value="catalog" className="space-y-6">
          <div className="flex items-center justify-end">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Balance:</span>
                <span className="font-bold text-lg">{currentBalance.toLocaleString()} coins</span>
              </div>
            </Card>
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !catalog || catalog.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rewards available yet. Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((item) => {
                const canAfford = currentBalance >= item.pointsCost;
                const inStock = item.stock === null || item.stock > 0;

                return (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        {item.category && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {categoryIcons[item.category]}
                            {categoryLabels[item.category] || item.category}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t">
                        <div>
                          <p className="font-bold text-lg">{item.pointsCost.toLocaleString()} coins</p>
                          {item.stock !== null && (
                            <p className="text-xs text-muted-foreground">
                              {item.stock > 0 ? `${item.stock} left` : 'Out of stock'}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          disabled={!canAfford || !inStock || redeemMutation.isPending}
                          onClick={() => setRedeemItem(item)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          {!inStock ? 'Out of Stock' : !canAfford ? 'Not Enough Coins' : 'Redeem'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== MY REWARDS TAB ===== */}
        <TabsContent value="my-rewards" className="space-y-6">
          {/* Sub-stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold">{currentBalance.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{(myBalance?.totalEarned ?? 0).toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{(myBalance?.totalRedeemed ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Badges Showcase */}
          {myBadges && myBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Medal className="h-5 w-5 text-purple-500" />
                  Earned Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {myBadges.map((ub) => (
                    <div
                      key={ub.id}
                      className="flex flex-col items-center p-3 rounded-lg border bg-card text-center"
                    >
                      <span className="text-2xl mb-1">{ub.badge.icon || '\u{1F3C6}'}</span>
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

          {/* History & Redemptions Sub-tabs */}
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <History className="h-4 w-4" /> Coins History
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
                    <div className="text-center py-8 text-muted-foreground">No coins history yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Coins</TableHead>
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
                                {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
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
                          <TableHead>Coins</TableHead>
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
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
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
        </TabsContent>
      </Tabs>

      {/* Redemption Confirmation Dialog */}
      <AlertDialog open={!!redeemItem} onOpenChange={() => setRedeemItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to redeem <strong>{redeemItem?.name}</strong> for{' '}
              <strong>{redeemItem?.pointsCost.toLocaleString()} coins</strong>?
              <br /><br />
              Your remaining balance will be{' '}
              <strong>{(currentBalance - (redeemItem?.pointsCost || 0)).toLocaleString()} coins</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => redeemItem && redeemMutation.mutate(redeemItem.id)}
            >
              Confirm Redemption
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
