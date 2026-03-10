import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Gift, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

type Balance = {
  currentBalance: number;
  totalEarned: number;
  totalRedeemed: number;
};

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

export default function RewardsCatalog() {
  const queryClient = useQueryClient();
  const [redeemItem, setRedeemItem] = useState<CatalogItem | null>(null);

  const { data: catalog, isLoading } = useQuery<CatalogItem[]>({
    queryKey: ['/api/rewards/catalog'],
  });

  const { data: balance } = useQuery<Balance>({
    queryKey: ['/api/rewards/my/balance'],
  });

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

  const currentBalance = balance?.currentBalance ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rewards Catalog</h1>
          <p className="text-muted-foreground">Redeem your points for awesome rewards</p>
        </div>
        <Card className="px-4 py-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Balance:</span>
            <span className="font-bold text-lg">{currentBalance.toLocaleString()} pts</span>
          </div>
        </Card>
      </div>

      {isLoading ? (
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
                      <p className="font-bold text-lg">{item.pointsCost.toLocaleString()} pts</p>
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
                      {!inStock ? 'Out of Stock' : !canAfford ? 'Not Enough Points' : 'Redeem'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!redeemItem} onOpenChange={() => setRedeemItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to redeem <strong>{redeemItem?.name}</strong> for{' '}
              <strong>{redeemItem?.pointsCost.toLocaleString()} points</strong>?
              <br /><br />
              Your remaining balance will be{' '}
              <strong>{(currentBalance - (redeemItem?.pointsCost || 0)).toLocaleString()} points</strong>.
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
