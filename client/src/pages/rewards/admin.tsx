import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomDropdown, type DropdownOption } from "@/components/ui/custom-dropdown";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusCircle, Edit, Trash2, Database, BarChart3, Award, ShoppingBag,
  CheckCircle, XCircle, Package, UserPlus, RefreshCw, RotateCcw, Settings, ClipboardList,
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
type Department = {
  id: number; name: string;
};
type PointsLogEntry = {
  id: number; userId: number; metricId: number | null; points: number;
  quantity: number; description: string | null; type: string;
  referenceId: string | null; periodStart: string | null; periodEnd: string | null;
  createdAt: string; firstName: string; lastName: string; metricName: string | null;
};
type RewardSettingsConfig = {
  enabledDepartmentIds: number[];
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
  const { data: departments } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const { data: rewardSettings } = useQuery<RewardSettingsConfig>({ queryKey: ['/api/rewards/settings'] });

  // Points activity log state
  const [activityFilterUser, setActivityFilterUser] = useState<string>('all');
  const pointsLogUrl = activityFilterUser && activityFilterUser !== 'all'
    ? `/api/rewards/points-log?limit=200&userId=${activityFilterUser}`
    : '/api/rewards/points-log?limit=200';
  const { data: pointsLog, isLoading: pointsLogLoading } = useQuery<PointsLogEntry[]>({
    queryKey: [pointsLogUrl],
  });

  // Handle Zoom OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zoomAuth = params.get('zoom_auth');
    if (zoomAuth === 'success') {
      toast({ title: "Zoom authorized successfully", description: "You can now sync Zoom Phone call data." });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (zoomAuth === 'error') {
      toast({ title: "Zoom authorization failed", description: params.get('message') || 'Unknown error', variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Build user dropdown options (alphabetical with "All Users" first)
  const userDropdownOptions: DropdownOption[] = useMemo(() => {
    const allOption: DropdownOption = { id: 'all', label: 'All Users' };
    const userOpts = (users || []).map(u => ({
      id: String(u.id),
      label: `${u.firstName} ${u.lastName}`,
      sublabel: u.email,
    }));
    return [allOption, ...userOpts];
  }, [users]);

  // Settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (config: RewardSettingsConfig) => {
      return apiRequest({ url: '/api/rewards/settings', method: 'PUT', data: config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/enabled'] });
      toast({ title: "Reward settings saved" });
    },
    onError: (e: any) => toast({ title: "Error saving settings", description: e.message, variant: "destructive" }),
  });

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

  // Zendesk groups state
  const [groupsDialog, setGroupsDialog] = useState(false);
  const [zendeskGroups, setZendeskGroups] = useState<{ id: number; name: string }[] | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const fetchGroups = async (sourceId: number) => {
    setGroupsLoading(true);
    try {
      const res = await fetch(`/api/rewards/sources/${sourceId}/groups`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data = await res.json();
      setZendeskGroups(data);
      setGroupsDialog(true);
    } catch (e: any) {
      toast({ title: "Error fetching groups", description: e.message, variant: "destructive" });
    }
    setGroupsLoading(false);
  };

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

  const resetSyncMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      return apiRequest({ url: `/api/rewards/sources/${sourceId}/reset-sync`, method: 'POST' });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Sync reset", description: "Next sync will pull from the configured start date." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add Zendesk default metrics
  const addZendeskDefaultsMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      await apiRequest({
        url: '/api/rewards/metrics', method: 'POST',
        data: { sourceId, key: 'tickets_solved', name: 'Tickets Solved', pointsPerUnit: 10, description: 'Coins for each Zendesk ticket solved', isActive: true },
      });
      await apiRequest({
        url: '/api/rewards/metrics', method: 'POST',
        data: { sourceId, key: 'fast_first_reply', name: 'Fast First Reply (<30min)', pointsPerUnit: 5, description: 'Bonus coins for responding to a ticket within 30 minutes', isActive: true },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Zendesk default metrics created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add Zoom Phone default metrics
  const addZoomDefaultsMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      await apiRequest({
        url: '/api/rewards/metrics', method: 'POST',
        data: { sourceId, key: 'calls_handled', name: 'Calls Handled', pointsPerUnit: 5, description: 'Coins for each answered Zoom Phone call', isActive: true },
      });
      await apiRequest({
        url: '/api/rewards/metrics', method: 'POST',
        data: { sourceId, key: 'call_duration', name: 'Call Duration (minutes)', pointsPerUnit: 1, description: 'Coins per minute of call time', isActive: true },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Zoom Phone default metrics created" });
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
      toast({ title: "Coins adjusted successfully" });
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
          <TabsTrigger value="activity" className="flex items-center gap-1"><ClipboardList className="h-4 w-4" /> Coins Activity</TabsTrigger>
          <TabsTrigger value="adjust" className="flex items-center gap-1"><UserPlus className="h-4 w-4" /> Manual Adjust</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
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
                            {s.type === 'zendesk' && (
                              <Button variant="outline" size="sm" onClick={() => fetchGroups(s.id)} disabled={groupsLoading}>
                                Groups
                              </Button>
                            )}
                            {s.type === 'zoom_phone' && (
                              <Button variant="outline" size="sm" onClick={async () => {
                                try {
                                  const res = await fetch(`/api/rewards/sources/${s.id}/zoom-auth-url`, { credentials: 'include' });
                                  if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                                  const { authUrl } = await res.json();
                                  window.location.href = authUrl;
                                } catch (e: any) {
                                  toast({ title: "Error", description: e.message, variant: "destructive" });
                                }
                              }}>
                                {s.config && JSON.parse(s.config || '{}').zoomRefreshToken ? 'Re-authorize Zoom' : 'Authorize with Zoom'}
                              </Button>
                            )}
                            {s.lastSyncAt && (
                              <Button variant="ghost" size="icon" title="Reset sync — re-pull from start date" onClick={() => resetSyncMutation.mutate(s.id)} disabled={resetSyncMutation.isPending}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditItem(s);
                              const fd: any = { name: s.name, type: s.type, apiKey: s.apiKey || '', apiSecret: s.apiSecret || '', accountId: s.accountId || '', config: s.config || '', isActive: s.isActive, syncIntervalMinutes: s.syncIntervalMinutes };
                              if (s.type === 'zendesk' && s.config) {
                                try {
                                  const cfg = JSON.parse(s.config);
                                  fd._zendeskAdminEmail = cfg.adminEmail || '';
                                  fd._zendeskFastReplyMinutes = cfg.fastReplyThresholdMinutes ?? 30;
                                  fd._zendeskAgentEmails = (cfg.agentEmails || []).join(', ');
                                  fd._zendeskGroupIds = (cfg.groupIds || []).join(', ');
                                  fd._zendeskSyncStartDate = cfg.syncStartDate || '';
                                } catch {}
                              }
                              if (s.type === 'zoom_phone' && s.config) {
                                try {
                                  const cfg = JSON.parse(s.config);
                                  fd._zoomAgentEmails = (cfg.agentEmails || []).join(', ');
                                  fd._zoomSyncStartDate = cfg.syncStartDate || '';
                                  fd._zoomCallDirection = cfg.callDirection || 'all';
                                  fd._zoomMinDuration = cfg.minDurationSeconds ?? 0;
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
                {sources?.some(s => s.type === 'zoom_phone') && (
                  <Button size="sm" variant="outline" onClick={() => {
                    const zoomSource = sources?.find(s => s.type === 'zoom_phone');
                    if (zoomSource) addZoomDefaultsMutation.mutate(zoomSource.id);
                  }} disabled={addZoomDefaultsMutation.isPending}>
                    <Database className="h-4 w-4 mr-1" /> Add Zoom Defaults
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
                      <TableHead>Coins/Unit</TableHead>
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
                        <p className="text-xs text-muted-foreground">{b.threshold.toLocaleString()} coins{b.metricId ? ' (metric-specific)' : ''}</p>
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
                        <TableCell>{item.pointsCost.toLocaleString()} coins</TableCell>
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
                      <TableHead>Coins</TableHead>
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

        {/* ==================== POINTS ACTIVITY TAB ==================== */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Coins Activity Log</CardTitle>
              <div className="flex items-center gap-2 w-[220px]">
                <CustomDropdown
                  options={userDropdownOptions}
                  value={activityFilterUser}
                  onChange={(v) => setActivityFilterUser(String(v))}
                  placeholder="All Users"
                  searchPlaceholder="Search users..."
                />
              </div>
            </CardHeader>
            <CardContent>
              {pointsLogLoading ? <Skeleton className="h-40" /> : !pointsLog?.length ? (
                <p className="text-center text-muted-foreground py-8">No coins activity yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Coins</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pointsLog.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {(() => {
                              const d = new Date(entry.periodStart || entry.createdAt);
                              return <>{d.toLocaleDateString()}{' '}<span className="text-muted-foreground">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>;
                            })()}
                          </TableCell>
                          <TableCell className="font-medium">{entry.firstName} {entry.lastName}</TableCell>
                          <TableCell>
                            <Badge variant={entry.type === 'earned' ? 'default' : entry.type === 'bonus' ? 'secondary' : 'outline'}>
                              {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.metricName || '—'}</TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate" title={entry.description || ''}>
                            {entry.description || '—'}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {(() => {
                              if (!entry.referenceId) return '—';
                              const ticketMatch = entry.referenceId.match(/zendesk_(?:solved|frt)_(\d+)/);
                              if (ticketMatch) {
                                return <a href={`https://satellitephonestore.zendesk.com/agent/tickets/${ticketMatch[1]}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">#{ticketMatch[1]}</a>;
                              }
                              return entry.referenceId;
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={entry.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {entry.points >= 0 ? '+' : ''}{entry.points}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                  <Label>Coins (negative to deduct)</Label>
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

        {/* ==================== SETTINGS TAB ==================== */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Department Enablement</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select which departments participate in the rewards program.
                If no departments are selected, rewards are visible to all users.
              </p>
            </CardHeader>
            <CardContent>
              {departments && departments.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {departments.map((dept) => {
                      const enabled = rewardSettings?.enabledDepartmentIds || [];
                      const isChecked = enabled.includes(dept.id);
                      return (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${dept.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = rewardSettings?.enabledDepartmentIds || [];
                              const updated = checked
                                ? [...current, dept.id]
                                : current.filter((id: number) => id !== dept.id);
                              settingsMutation.mutate({ enabledDepartmentIds: updated });
                            }}
                          />
                          <label htmlFor={`dept-${dept.id}`} className="text-sm font-medium leading-none cursor-pointer">
                            {dept.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {(rewardSettings?.enabledDepartmentIds?.length ?? 0) > 0 && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => settingsMutation.mutate({ enabledDepartmentIds: [] })}
                      >
                        Clear All (Enable for Everyone)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No departments found. Create departments first.</p>
              )}
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
              <Label>{formData.type === 'zendesk' ? 'API Token' : formData.type === 'zoom_phone' ? 'Client ID' : 'API Key (optional)'}</Label>
              <Input value={formData.apiKey || ''} onChange={e => setFormData({ ...formData, apiKey: e.target.value })} placeholder={formData.type === 'zendesk' ? 'Zendesk API token' : formData.type === 'zoom_phone' ? 'Zoom Client ID' : ''} />
            </div>
            {formData.type === 'zoom_phone' && (
              <div>
                <Label>Client Secret</Label>
                <Input type="password" value={formData.apiSecret || ''} onChange={e => setFormData({ ...formData, apiSecret: e.target.value })} placeholder="Zoom Client Secret" />
              </div>
            )}
            {formData.type !== 'zoom_phone' && (
              <div>
                <Label>{formData.type === 'zendesk' ? 'Zendesk Subdomain' : 'Account ID (optional)'}</Label>
                <Input value={formData.accountId || ''} onChange={e => setFormData({ ...formData, accountId: e.target.value })} placeholder={formData.type === 'zendesk' ? 'mycompany' : ''} />
                {formData.type === 'zendesk' && <p className="text-xs text-muted-foreground mt-1">The subdomain from your Zendesk URL (mycompany.zendesk.com)</p>}
              </div>
            )}
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
                  <Label>Agent Emails (optional filter)</Label>
                  <Textarea
                    value={formData._zendeskAgentEmails || ''}
                    onChange={e => setFormData({ ...formData, _zendeskAgentEmails: e.target.value })}
                    placeholder="agent1@company.com, agent2@company.com"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated. Only these agents' tickets will be tracked. Leave empty for all agents.</p>
                </div>
                <div>
                  <Label>Group IDs (optional filter)</Label>
                  <Input
                    value={formData._zendeskGroupIds || ''}
                    onChange={e => setFormData({ ...formData, _zendeskGroupIds: e.target.value })}
                    placeholder="e.g. 12345678, 87654321"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated Zendesk group IDs. Only tickets from these groups will be tracked. Leave empty for all groups.</p>
                </div>
                <div>
                  <Label>Sync Start Date</Label>
                  <Input
                    type="date"
                    value={formData._zendeskSyncStartDate || ''}
                    onChange={e => setFormData({ ...formData, _zendeskSyncStartDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Pull tickets solved from this date onward on first sync. Leave empty for last 24 hours.</p>
                </div>
                <div>
                  <Label>Fast Reply Threshold (minutes)</Label>
                  <Input
                    type="number"
                    value={formData._zendeskFastReplyMinutes ?? 30}
                    onChange={e => setFormData({ ...formData, _zendeskFastReplyMinutes: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Replies faster than this earn bonus coins</p>
                </div>
              </>
            )}
            {formData.type === 'zoom_phone' && (
              <>
                <div>
                  <Label>Agent Emails (optional filter)</Label>
                  <Textarea
                    value={formData._zoomAgentEmails || ''}
                    onChange={e => setFormData({ ...formData, _zoomAgentEmails: e.target.value })}
                    placeholder="agent1@company.com, agent2@company.com"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated. Only these agents' calls will be tracked. Leave empty for all agents.</p>
                </div>
                <div>
                  <Label>Sync Start Date</Label>
                  <Input
                    type="date"
                    value={formData._zoomSyncStartDate || ''}
                    onChange={e => setFormData({ ...formData, _zoomSyncStartDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Pull calls from this date onward on first sync. Leave empty for last 24 hours.</p>
                </div>
                <div>
                  <Label>Call Direction</Label>
                  <Select value={formData._zoomCallDirection || 'all'} onValueChange={v => setFormData({ ...formData, _zoomCallDirection: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={formData._zoomMinDuration ?? 0}
                    onChange={e => setFormData({ ...formData, _zoomMinDuration: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Skip calls shorter than this duration. Default: 0 (include all).</p>
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
              const { _zendeskAdminEmail, _zendeskFastReplyMinutes, _zendeskAgentEmails, _zendeskGroupIds, _zendeskSyncStartDate, _zoomAgentEmails, _zoomSyncStartDate, _zoomCallDirection, _zoomMinDuration, ...rest } = formData;
              const payload = { ...rest, _editId: editItem?.id };
              if (formData.type === 'zendesk') {
                const agentEmails = (_zendeskAgentEmails || '').split(',').map((e: string) => e.trim()).filter(Boolean);
                const groupIds = (_zendeskGroupIds || '').split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
                payload.config = JSON.stringify({
                  adminEmail: _zendeskAdminEmail || '',
                  fastReplyThresholdMinutes: _zendeskFastReplyMinutes ?? 30,
                  ...(agentEmails.length > 0 && { agentEmails }),
                  ...(groupIds.length > 0 && { groupIds }),
                  ...(_zendeskSyncStartDate && { syncStartDate: _zendeskSyncStartDate }),
                });
              }
              if (formData.type === 'zoom_phone') {
                const agentEmails = (_zoomAgentEmails || '').split(',').map((e: string) => e.trim()).filter(Boolean);
                payload.config = JSON.stringify({
                  ...(agentEmails.length > 0 && { agentEmails }),
                  ...(_zoomSyncStartDate && { syncStartDate: _zoomSyncStartDate }),
                  ...(_zoomCallDirection && _zoomCallDirection !== 'all' && { callDirection: _zoomCallDirection }),
                  ...(_zoomMinDuration && { minDurationSeconds: _zoomMinDuration }),
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
            <div><Label>Coins Per Unit</Label><Input type="number" value={formData.pointsPerUnit || 1} onChange={e => setFormData({ ...formData, pointsPerUnit: parseInt(e.target.value) })} /></div>
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

      {/* Zendesk Groups Dialog */}
      <Dialog open={groupsDialog} onOpenChange={setGroupsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Zendesk Groups</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Use these group IDs in your source config to filter tickets by group.
          </p>
          <div className="overflow-y-auto flex-1">
            {zendeskGroups && zendeskGroups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Group ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zendeskGroups.map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="font-mono text-sm">{g.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No groups found.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setGroupsDialog(false)}>Close</Button>
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
