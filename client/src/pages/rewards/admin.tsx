import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PlusCircle, Edit, Trash2, Database, BarChart3, Award, ShoppingBag,
  CheckCircle, XCircle, Package, UserPlus, RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

// ------ Types ------
type KpiSource = {
  id: number; name: string; type: string; apiKey: string | null;
  apiSecret: string | null; accountId: string | null; config: string | null;
  isActive: boolean; lastSyncAt: string | null; syncIntervalMinutes: number;
};
type KpiMetric = {
  id: number; sourceId: number | null; name: string; key: string;
  pointsPerUnit: number; description: string | null; isActive: boolean;
};
type RewardBadge = {
  id: number; name: string; description: string | null; icon: string | null;
  color: string | null; threshold: number; metricId: number | null;
};
type CatalogItem = {
  id: number; name: string; description: string | null; pointsCost: number;
  category: string | null; imageUrl: string | null; stock: number | null; isActive: boolean;
};
type Redemption = {
  id: number; userId: number; firstName: string; lastName: string;
  catalogItemId: number; itemName: string; pointsSpent: number;
  status: string; notes: string | null; createdAt: string;
};
type UserEntry = {
  id: number; firstName: string; lastName: string; email: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function RewardsAdmin() {
  const queryClient = useQueryClient();

  // Data queries
  const { data: sources, isLoading: sourcesLoading } = useQuery<KpiSource[]>({ queryKey: ['/api/rewards/sources'] });
  const { data: metrics } = useQuery<KpiMetric[]>({ queryKey: ['/api/rewards/metrics'] });
  const { data: badges } = useQuery<RewardBadge[]>({ queryKey: ['/api/rewards/badges'] });
  const { data: catalog } = useQuery<CatalogItem[]>({ queryKey: ['/api/rewards/catalog'] });
  const { data: redemptions } = useQuery<Redemption[]>({ queryKey: ['/api/rewards/redemptions'] });
  const { data: users } = useQuery<UserEntry[]>({ queryKey: ['/api/users'] });

  // Dialog state
  const [sourceDialog, setSourceDialog] = useState(false);
  const [metricDialog, setMetricDialog] = useState(false);
  const [badgeDialog, setBadgeDialog] = useState(false);
  const [catalogDialog, setCatalogDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: number; name: string } | null>(null);
  const [syncResultDialog, setSyncResultDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Form state
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Manual adjust state
  const [adjustData, setAdjustData] = useState({ userId: '', points: '', description: '', type: 'bonus' });

  // Sync Now mutation
  const syncMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      return apiRequest({ url: `/api/rewards/sources/${sourceId}/sync`, method: 'POST' });
    },
    onSuccess: (data: any) => {
      invalidateAll();
      setSyncResult(data);
      setSyncResultDialog(true);
      if (data.errors?.length) {
        toast({ title: "Sync completed with errors", variant: "destructive" });
      } else {
        toast({ title: "Sync completed" });
      }
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  // Add Zendesk default metrics
  const addZendeskDefaultsMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      await apiRequest({
        url: '/api/rewards/metrics', method: 'POST',
        data: { sourceId, key: 'tickets_solved', name: 'Tickets Solved', pointsPerUnit: 10, description: 'Points for each Zendesk ticket solved', isActive: true },
      });
      await apiRequest({
        url: '/api/rewards/metrics', method: 'POST',
        data: { sourceId, key: 'fast_first_reply', name: 'Fast First Reply (<30min)', pointsPerUnit: 5, description: 'Bonus points for responding to a ticket within 30 minutes', isActive: true },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Zendesk default metrics created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Helpers
  const resetForm = () => { setFormData({}); setEditItem(null); };
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
  };

  // ---- Mutations (top-level, stable references) ----

  const sourcesMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data._editId ? `/api/rewards/sources/${data._editId}` : '/api/rewards/sources';
      const method = data._editId ? 'PUT' : 'POST';
      const { _editId, ...body } = data;
      return apiRequest({ url, method, data: body });
    },
    onSuccess: () => {
      invalidateAll();
      setSourceDialog(false);
      resetForm();
      toast({ title: "Source saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const metricsMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data._editId ? `/api/rewards/metrics/${data._editId}` : '/api/rewards/metrics';
      const method = data._editId ? 'PUT' : 'POST';
      const { _editId, ...body } = data;
      return apiRequest({ url, method, data: body });
    },
    onSuccess: () => {
      invalidateAll();
      setMetricDialog(false);
      resetForm();
      toast({ title: "Metric saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const badgesMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data._editId ? `/api/rewards/badges/${data._editId}` : '/api/rewards/badges';
      const method = data._editId ? 'PUT' : 'POST';
      const { _editId, ...body } = data;
      return apiRequest({ url, method, data: body });
    },
    onSuccess: () => {
      invalidateAll();
      setBadgeDialog(false);
      resetForm();
      toast({ title: "Badge saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const catalogMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = data._editId ? `/api/rewards/catalog/${data._editId}` : '/api/rewards/catalog';
      const method = data._editId ? 'PUT' : 'POST';
      const { _editId, ...body } = data;
      return apiRequest({ url, method, data: body });
    },
    onSuccess: () => {
      invalidateAll();
      setCatalogDialog(false);
      resetForm();
      toast({ title: "Catalog item saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const redemptionMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest({ url: `/api/rewards/redemptions/${id}`, method: 'PUT', data: { status, notes } });
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Redemption updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest({ url: '/api/rewards/points/adjust', method: 'POST', data: { ...data, userId: parseInt(data.userId), points: parseInt(data.points) } });
    },
    onSuccess: () => {
      invalidateAll();
      setAdjustData({ userId: '', points: '', description: '', type: 'bonus' });
      toast({ title: "Points adjusted successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete handler
  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await apiRequest({ url: `/api/rewards/${deleteDialog.type}/${deleteDialog.id}`, method: 'DELETE' });
      invalidateAll();
      toast({ title: `${deleteDialog.name} deleted` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDeleteDialog(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rewards Admin</h1>
        <p className="text-muted-foreground">Configure KPI sources, metrics, badges, and catalog</p>
      </div>

      <Tabs defaultValue="sources">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sources" className="flex items-center gap-1"><Database className="h-4 w-4" /> Sources</TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Metrics</TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-1"><Award className="h-4 w-4" /> Badges</TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-1"><ShoppingBag className="h-4 w-4" /> Catalog</TabsTrigger>
          <TabsTrigger value="redemptions" className="flex items-center gap-1"><Package className="h-4 w-4" /> Redemptions</TabsTrigger>
          <TabsTrigger value="adjust" className="flex items-center gap-1"><UserPlus className="h-4 w-4" /> Manual Adjust</TabsTrigger>
        </TabsList>

        {/* ==================== SOURCES TAB ==================== */}
        <TabsContent value="sources">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">KPI Sources</CardTitle>
              <Button size="sm" onClick={() => { resetForm(); setSourceDialog(true); }}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add Source
              </Button>
            </CardHeader>
            <CardContent>
              {sourcesLoading ? <Skeleton className="h-20" /> : !sources?.length ? (
                <p className="text-center text-muted-foreground py-4">No KPI sources configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? "default" : "secondary"}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => syncMutation.mutate(s.id)} disabled={syncMutation.isPending}>
                              <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} /> Sync Now
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditItem(s);
                              const fd: any = { name: s.name, type: s.type, apiKey: s.apiKey || '', apiSecret: s.apiSecret || '', accountId: s.accountId || '', config: s.config || '', isActive: s.isActive, syncIntervalMinutes: s.syncIntervalMinutes };
                              if (s.type === 'zendesk' && s.config) {
                                try {
                                  const cfg = JSON.parse(s.config);
                                  fd._zendeskAdminEmail = cfg.adminEmail || '';
                                  fd._zendeskFastReplyMinutes = cfg.fastReplyThresholdMinutes ?? 30;
                                } catch {}
                              }
                              setFormData(fd);
                              setSourceDialog(true);
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'sources', id: s.id, name: s.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== METRICS TAB ==================== */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">KPI Metrics</CardTitle>
              <div className="flex gap-2">
                {sources?.some(s => s.type === 'zendesk') && (
                  <Button size="sm" variant="outline" onClick={() => {
                    const zendeskSource = sources?.find(s => s.type === 'zendesk');
                    if (zendeskSource) addZendeskDefaultsMutation.mutate(zendeskSource.id);
                  }} disabled={addZendeskDefaultsMutation.isPending}>
                    <Database className="h-4 w-4 mr-1" /> Add Zendesk Defaults
                  </Button>
                )}
                <Button size="sm" onClick={() => { resetForm(); setMetricDialog(true); }}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Metric
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!metrics?.length ? (
                <p className="text-center text-muted-foreground py-4">No metrics configured. Add a metric to define point values for employee activities.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Points/Unit</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell><code className="text-xs">{m.key}</code></TableCell>
                        <TableCell>{m.pointsPerUnit}</TableCell>
                        <TableCell>{sources?.find(s => s.id === m.sourceId)?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditItem(m);
                              setFormData({ name: m.name, key: m.key, pointsPerUnit: m.pointsPerUnit, sourceId: m.sourceId, description: m.description || '', isActive: m.isActive });
                              setMetricDialog(true);
                            }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'metrics', id: m.id, name: m.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== BADGES TAB ==================== */}
        <TabsContent value="badges">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Badges</CardTitle>
              <Button size="sm" onClick={() => { resetForm(); setBadgeDialog(true); }}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add Badge
              </Button>
            </CardHeader>
            <CardContent>
              {!badges?.length ? (
                <p className="text-center text-muted-foreground py-4">No badges configured.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {badges.map(b => (
                    <div key={b.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <span className="text-2xl">{b.icon || '🏆'}</span>
                      <div className="flex-1">
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.threshold.toLocaleString()} points{b.metricId ? ' (metric-specific)' : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditItem(b);
                          setFormData({ name: b.name, description: b.description || '', icon: b.icon || '', color: b.color || '', threshold: b.threshold, metricId: b.metricId });
                          setBadgeDialog(true);
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'badges', id: b.id, name: b.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== CATALOG TAB ==================== */}
        <TabsContent value="catalog">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Reward Catalog</CardTitle>
              <Button size="sm" onClick={() => { resetForm(); setCatalogDialog(true); }}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {!catalog?.length ? (
                <p className="text-center text-muted-foreground py-4">No catalog items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalog.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category || '-'}</TableCell>
                        <TableCell>{item.pointsCost.toLocaleString()} pts</TableCell>
                        <TableCell>{item.stock !== null ? item.stock : 'Unlimited'}</TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditItem(item);
                              setFormData({ name: item.name, description: item.description || '', pointsCost: item.pointsCost, category: item.category || '', stock: item.stock, isActive: item.isActive });
                              setCatalogDialog(true);
                            }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: 'catalog', id: item.id, name: item.name })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== REDEMPTIONS TAB ==================== */}
        <TabsContent value="redemptions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              {!redemptions?.length ? (
                <p className="text-center text-muted-foreground py-4">No redemptions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{r.firstName} {r.lastName}</TableCell>
                        <TableCell>{r.itemName}</TableCell>
                        <TableCell>{r.pointsSpent.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || ''}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="text-green-600" onClick={() => redemptionMutation.mutate({ id: r.id, status: 'approved' })} title="Approve">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => redemptionMutation.mutate({ id: r.id, status: 'denied' })} title="Deny">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {r.status === 'approved' && (
                            <Button variant="ghost" size="sm" onClick={() => redemptionMutation.mutate({ id: r.id, status: 'fulfilled' })}>
                              <Package className="h-4 w-4 mr-1" /> Fulfill
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== MANUAL ADJUST TAB ==================== */}
        <TabsContent value="adjust">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Point Adjustment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={adjustData.userId} onValueChange={v => setAdjustData({ ...adjustData, userId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Points (negative to deduct)</Label>
                  <Input type="number" value={adjustData.points} onChange={e => setAdjustData({ ...adjustData, points: e.target.value })} placeholder="e.g. 100 or -50" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={adjustData.type} onValueChange={v => setAdjustData({ ...adjustData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={adjustData.description} onChange={e => setAdjustData({ ...adjustData, description: e.target.value })} placeholder="Reason for adjustment" />
                </div>
                <Button onClick={() => adjustMutation.mutate(adjustData)} disabled={!adjustData.userId || !adjustData.points || adjustMutation.isPending}>
                  <UserPlus className="h-4 w-4 mr-1" /> Apply Adjustment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================== DIALOGS (outside tabs, stable) ==================== */}

      {/* Source Dialog */}
      <Dialog open={sourceDialog} onOpenChange={(open) => { if (!open) { setSourceDialog(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} KPI Source</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={formData.type || ''} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="zendesk">Zendesk</SelectItem>
                  <SelectItem value="zoom_phone">Zoom Phone</SelectItem>
                  <SelectItem value="google_reviews">Google Reviews</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{formData.type === 'zendesk' ? 'API Token' : 'API Key (optional)'}</Label>
              <Input value={formData.apiKey || ''} onChange={e => setFormData({ ...formData, apiKey: e.target.value })} placeholder={formData.type === 'zendesk' ? 'Zendesk API token' : ''} />
            </div>
            <div>
              <Label>{formData.type === 'zendesk' ? 'Zendesk Subdomain' : 'Account ID (optional)'}</Label>
              <Input value={formData.accountId || ''} onChange={e => setFormData({ ...formData, accountId: e.target.value })} placeholder={formData.type === 'zendesk' ? 'mycompany' : ''} />
              {formData.type === 'zendesk' && <p className="text-xs text-muted-foreground mt-1">The subdomain from your Zendesk URL (mycompany.zendesk.com)</p>}
            </div>
            {formData.type === 'zendesk' && (
              <>
                <div>
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    value={formData._zendeskAdminEmail || ''}
                    onChange={e => setFormData({ ...formData, _zendeskAdminEmail: e.target.value })}
                    placeholder="admin@company.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">The Zendesk admin email used for API authentication</p>
                </div>
                <div>
                  <Label>Fast Reply Threshold (minutes)</Label>
                  <Input
                    type="number"
                    value={formData._zendeskFastReplyMinutes ?? 30}
                    onChange={e => setFormData({ ...formData, _zendeskFastReplyMinutes: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Replies faster than this earn bonus points</p>
                </div>
              </>
            )}
            <div><Label>Sync Interval (minutes)</Label><Input type="number" value={formData.syncIntervalMinutes || 60} onChange={e => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSourceDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => {
              const { _zendeskAdminEmail, _zendeskFastReplyMinutes, ...rest } = formData;
              const payload = { ...rest, _editId: editItem?.id };
              if (formData.type === 'zendesk') {
                payload.config = JSON.stringify({
                  adminEmail: _zendeskAdminEmail || '',
                  fastReplyThresholdMinutes: _zendeskFastReplyMinutes ?? 30,
                });
              }
              sourcesMutation.mutate(payload);
            }} disabled={sourcesMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metric Dialog */}
      <Dialog open={metricDialog} onOpenChange={(open) => { if (!open) { setMetricDialog(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} Metric</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Key</Label><Input value={formData.key || ''} onChange={e => setFormData({ ...formData, key: e.target.value })} placeholder="e.g. tickets_closed" /></div>
            <div><Label>Points Per Unit</Label><Input type="number" value={formData.pointsPerUnit || 1} onChange={e => setFormData({ ...formData, pointsPerUnit: parseInt(e.target.value) })} /></div>
            <div><Label>Source (optional)</Label>
              <Select value={String(formData.sourceId || '')} onValueChange={v => setFormData({ ...formData, sourceId: v ? parseInt(v) : null })}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {sources?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMetricDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => metricsMutation.mutate({ ...formData, _editId: editItem?.id })} disabled={metricsMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Badge Dialog */}
      <Dialog open={badgeDialog} onOpenChange={(open) => { if (!open) { setBadgeDialog(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} Badge</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Icon (emoji)</Label><Input value={formData.icon || ''} onChange={e => setFormData({ ...formData, icon: e.target.value })} placeholder="e.g. 🏆" /></div>
            <div><Label>Color (hex)</Label><Input value={formData.color || ''} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="#FFD700" /></div>
            <div><Label>Threshold (points)</Label><Input type="number" value={formData.threshold || 0} onChange={e => setFormData({ ...formData, threshold: parseInt(e.target.value) })} /></div>
            <div><Label>Description</Label><Textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            <div><Label>Tied to Metric (optional)</Label>
              <Select value={String(formData.metricId || '')} onValueChange={v => setFormData({ ...formData, metricId: v ? parseInt(v) : null })}>
                <SelectTrigger><SelectValue placeholder="Total points (all)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Total Points</SelectItem>
                  {metrics?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBadgeDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => badgesMutation.mutate({ ...formData, _editId: editItem?.id })} disabled={badgesMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Dialog */}
      <Dialog open={catalogDialog} onOpenChange={(open) => { if (!open) { setCatalogDialog(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Add'} Catalog Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            <div><Label>Points Cost</Label><Input type="number" value={formData.pointsCost || 0} onChange={e => setFormData({ ...formData, pointsCost: parseInt(e.target.value) })} /></div>
            <div><Label>Category</Label>
              <Select value={formData.category || ''} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift_card">Gift Card</SelectItem>
                  <SelectItem value="pto">PTO</SelectItem>
                  <SelectItem value="swag">Swag</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Stock (leave empty for unlimited)</Label><Input type="number" value={formData.stock ?? ''} onChange={e => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : null })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCatalogDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => catalogMutation.mutate({ ...formData, _editId: editItem?.id })} disabled={catalogMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Result Dialog */}
      <Dialog open={syncResultDialog} onOpenChange={setSyncResultDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Sync Results — {syncResult?.sourceName}</DialogTitle></DialogHeader>
          {syncResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Data Points Fetched</p>
                  <p className="text-2xl font-bold">{syncResult.dataPointsFetched}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Points Awarded</p>
                  <p className="text-2xl font-bold text-green-600">{syncResult.pointsAwarded}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Duplicates Skipped</p>
                  <p className="text-2xl font-bold text-muted-foreground">{syncResult.duplicatesSkipped}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Unmatched Metrics</p>
                  <p className="text-2xl font-bold text-yellow-600">{syncResult.unmatchedMetrics}</p>
                </div>
              </div>

              {syncResult.errors?.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-1">Errors</p>
                  {syncResult.errors.map((err: string, i: number) => (
                    <p key={i} className="text-sm text-destructive">{err}</p>
                  ))}
                </div>
              )}

              {syncResult.details?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Activity Log</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/50 p-2 space-y-1">
                    {syncResult.details.map((line: string, i: number) => (
                      <p key={i} className="text-xs font-mono">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSyncResultDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
