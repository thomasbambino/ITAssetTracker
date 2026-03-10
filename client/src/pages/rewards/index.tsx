import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Star, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type LeaderboardEntry = {
  userId: number;
  firstName: string;
  lastName: string;
  department: string | null;
  profilePhoto: string | null;
  totalEarned: number;
  totalRedeemed: number;
  currentBalance: number;
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

export default function RewardsLeaderboard() {
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/rewards/leaderboard'],
  });

  const { data: myBalance } = useQuery<Balance>({
    queryKey: ['/api/rewards/my/balance'],
  });

  const { data: myBadges } = useQuery<UserBadge[]>({
    queryKey: ['/api/rewards/my/badges'],
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/users/me'],
  });

  const myRank = leaderboard?.findIndex(e => e.userId === currentUser?.id);
  const rankDisplay = myRank !== undefined && myRank >= 0 ? myRank + 1 : '-';

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rewards & Leaderboard</h1>
        <p className="text-muted-foreground">Track your points, badges, and standings</p>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Points</p>
                <p className="text-2xl font-bold">{myBalance?.currentBalance?.toLocaleString() ?? 0}</p>
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
                <p className="text-2xl font-bold">{myBalance?.totalEarned?.toLocaleString() ?? 0}</p>
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

      {/* Leaderboard */}
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
              No rewards data yet. Points will appear here once employees start earning.
            </div>
          ) : (
            <div className="space-y-2">
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
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.totalEarned.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
