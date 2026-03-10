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

// Status colors
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
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: number; name: string } | null>(null);

  // Form state
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Helpers
  const resetForm = () => { setFormData({}); setEditItem(null); };
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
  };

  // Generic mutation helper
  const useCrudMutation = (path: string, method: string, onDone?: () => void) =>
    useMutation({
      mutationFn: async (data: any) => {
        return apiRequest({ url: path, method, data });
      },
      onSuccess: () => { invalidateAll(); onDone?.(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

  // -------------- KPI Sources Tab --------------
  const SourcesTab = () => {
    const saveMutation = useMutation({
      mutationFn: async (data: any) => {
        const url = editItem ? `/api/rewards/sources/${editItem.id}` : '/api/rewards/sources';
        const method = editItem ? 'PUT' : 'POST';
        return apiRequest({ url, method, data });
      },
      onSuccess: () => {
        invalidateAll();
        setSourceDialog(false);
        resetForm();
        toast({ title: editItem ? "Source updated" : "Source created" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    return (
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
                        <Button variant="ghost" size="icon" onClick={async () => {
                          try {
                            await apiRequest({ url: `/api/rewards/sources/${s.id}/sync`, method: 'POST' });
                            toast({ title: "Sync triggered" });
                            invalidateAll();
                          } catch { toast({ title: "Sync failed", variant: "destructive" }); }
                        }}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditItem(s);
                          setFormData({ name: s.name, type: s.type, apiKey: s.apiKey || '', apiSecret: s.apiSecret || '', accountId: s.accountId || '', config: s.config || '', isActive: s.isActive, syncIntervalMinutes: s.syncIntervalMinutes });
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
              <div><Label>API Key (optional)</Label><Input value={formData.apiKey || ''} onChange={e => setFormData({ ...formData, apiKey: e.target.value })} /></div>
              <div><Label>Account ID (optional)</Label><Input value={formData.accountId || ''} onChange={e => setFormData({ ...formData, accountId: e.target.value })} /></div>
              <div><Label>Sync Interval (minutes)</Label><Input type="number" value={formData.syncIntervalMinutes || 60} onChange={e => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSourceDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  // -------------- Metrics Tab --------------
  const MetricsTab = () => {
    const saveMutation = useMutation({
      mutationFn: async (data: any) => {
        const url = editItem ? `/api/rewards/metrics/${editItem.id}` : '/api/rewards/metrics';
        const method = editItem ? 'PUT' : 'POST';
        return apiRequest({ url, method, data });
      },
      onSuccess: () => {
        invalidateAll();
        setMetricDialog(false);
        resetForm();
        toast({ title: editItem ? "Metric updated" : "Metric created" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">KPI Metrics</CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setMetricDialog(true); }}>
            <PlusCircle className="h-4 w-4 mr-1" /> Add Metric
          </Button>
        </CardHeader>
        <CardContent>
          {!metrics?.length ? (
            <p className="text-center text-muted-foreground py-4">No metrics configured.</p>
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
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  // -------------- Badges Tab --------------
  const BadgesTab = () => {
    const saveMutation = useMutation({
      mutationFn: async (data: any) => {
        const url = editItem ? `/api/rewards/badges/${editItem.id}` : '/api/rewards/badges';
        const method = editItem ? 'PUT' : 'POST';
        return apiRequest({ url, method, data });
      },
      onSuccess: () => {
        invalidateAll();
        setBadgeDialog(false);
        resetForm();
        toast({ title: editItem ? "Badge updated" : "Badge created" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    return (
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
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  // -------------- Catalog Tab --------------
  const CatalogTab = () => {
    const saveMutation = useMutation({
      mutationFn: async (data: any) => {
        const url = editItem ? `/api/rewards/catalog/${editItem.id}` : '/api/rewards/catalog';
        const method = editItem ? 'PUT' : 'POST';
        return apiRequest({ url, method, data });
      },
      onSuccess: () => {
        invalidateAll();
        setCatalogDialog(false);
        resetForm();
        toast({ title: editItem ? "Item updated" : "Item created" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    return (
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
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  // -------------- Redemptions Tab --------------
  const RedemptionsTab = () => {
    const updateMutation = useMutation({
      mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
        return apiRequest({ url: `/api/rewards/redemptions/${id}`, method: 'PUT', data: { status, notes } });
      },
      onSuccess: () => { invalidateAll(); toast({ title: "Redemption updated" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    return (
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
                          <Button variant="ghost" size="icon" className="text-green-600" onClick={() => updateMutation.mutate({ id: r.id, status: 'approved' })} title="Approve">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600" onClick={() => updateMutation.mutate({ id: r.id, status: 'denied' })} title="Deny">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: r.id, status: 'fulfilled' })}>
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
    );
  };

  // -------------- Manual Adjust Tab --------------
  const AdjustTab = () => {
    const [adjustData, setAdjustData] = useState({ userId: '', points: '', description: '', type: 'bonus' });

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

    return (
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
    );
  };

  // -------------- Delete handler --------------
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

        <TabsContent value="sources"><SourcesTab /></TabsContent>
        <TabsContent value="metrics"><MetricsTab /></TabsContent>
        <TabsContent value="badges"><BadgesTab /></TabsContent>
        <TabsContent value="catalog"><CatalogTab /></TabsContent>
        <TabsContent value="redemptions"><RedemptionsTab /></TabsContent>
        <TabsContent value="adjust"><AdjustTab /></TabsContent>
      </Tabs>

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
