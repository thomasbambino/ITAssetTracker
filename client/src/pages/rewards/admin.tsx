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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PlusCircle, Edit, Trash2, Database, BarChart3, Award, ShoppingBag,
  CheckCircle, XCircle, Package, UserPlus, RefreshCw, RotateCcw, Settings, ClipboardList, FileText, Eraser,
  ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, Calculator,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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
type RawDataEntry = {
  id: number; sourceId: number; referenceId: string; userId: number | null;
  rawPayload: Record<string, any>; fetchedAt: string;
  firstName: string | null; lastName: string | null;
};
type PaginatedResponse<T> = { data: T[]; total: number };

// ---- Inline helper components ----

function SortableHeader({ label, sortKey, currentSort, currentDir, onSort }: {
  label: string; sortKey: string; currentSort: string; currentDir: string;
  onSort: (key: string) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead className="cursor-pointer select-none" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (currentDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </TableHead>
  );
}

function DateRangePicker({ dateFrom, dateTo, onChange }: {
  dateFrom: string; dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 px-3 text-sm gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateFrom || 'From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined}
            onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '', dateTo)} />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 px-3 text-sm gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateTo || 'To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={dateTo ? new Date(dateTo + 'T00:00:00') : undefined}
            onSelect={(d) => onChange(dateFrom, d ? format(d, 'yyyy-MM-dd') : '')} />
        </PopoverContent>
      </Popover>
      {(dateFrom || dateTo) && (
        <Button variant="ghost" className="h-9 text-sm px-2" onClick={() => onChange('', '')}>Clear</Button>
      )}
    </div>
  );
}

function PaginationControls({ total, page, pageSize, onPageChange, onPageSizeChange }: {
  total: number; page: number; pageSize: number;
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-sm text-muted-foreground">
        Showing {total > 0 ? start : 0}–{end} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(parseInt(v))}>
          <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground">{totalPages > 0 ? page + 1 : 0} / {totalPages}</span>
        <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

const PREDEFINED_METRICS: Record<string, Array<{ key: string; name: string; defaultPoints: number; description: string }>> = {
  zendesk: [
    { key: 'tickets_solved', name: 'Tickets Solved', defaultPoints: 10, description: 'Coins for each Zendesk ticket solved by the agent' },
    { key: 'fast_first_reply', name: 'Fast First Reply', defaultPoints: 5, description: 'Bonus for responding within the configured threshold (default 30 min)' },
    { key: 'first_contact_resolution', name: 'First Contact Resolution', defaultPoints: 10, description: 'Solved with zero reopens, evaluated after 7-day lookback' },
    { key: 'sla_resolution_4h', name: 'SLA Resolution (≤4h)', defaultPoints: 15, description: 'Resolved within 4 hours' },
    { key: 'sla_resolution_24h', name: 'SLA Resolution (≤24h)', defaultPoints: 10, description: 'Resolved within 24 hours (but more than 4h)' },
  ],
  zoom_phone: [
    { key: 'calls_handled', name: 'Calls Handled', defaultPoints: 5, description: 'Coins for each answered Zoom Phone call' },
    { key: 'call_duration', name: 'Call Duration (minutes)', defaultPoints: 1, description: 'Coins per minute of call time' },
  ],
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  zendesk: 'Zendesk',
  zoom_phone: 'Zoom Phone',
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

  // Points activity log state (paginated + sortable + filterable)
  const [activityFilterUser, setActivityFilterUser] = useState<string>('all');
  const [activitySort, setActivitySort] = useState('');
  const [activitySortDir, setActivitySortDir] = useState('desc');
  const [activityPage, setActivityPage] = useState(0);
  const [activityPageSize, setActivityPageSize] = useState(50);
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [activityMetricFilter, setActivityMetricFilter] = useState<string>('all');

  const pointsLogParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(activityPageSize));
    p.set('offset', String(activityPage * activityPageSize));
    if (activityFilterUser && activityFilterUser !== 'all') p.set('userId', activityFilterUser);
    if (activitySort) p.set('sortBy', activitySort);
    if (activitySortDir) p.set('sortDir', activitySortDir);
    if (activityDateFrom) p.set('dateFrom', activityDateFrom);
    if (activityDateTo) p.set('dateTo', activityDateTo);
    if (activityMetricFilter && activityMetricFilter !== 'all') p.set('metricId', activityMetricFilter);
    return p.toString();
  }, [activityFilterUser, activitySort, activitySortDir, activityPage, activityPageSize, activityDateFrom, activityDateTo, activityMetricFilter]);

  const pointsLogUrl = `/api/rewards/points-log?${pointsLogParams}`;
  const { data: pointsLogResponse, isLoading: pointsLogLoading } = useQuery<PaginatedResponse<PointsLogEntry>>({
    queryKey: [pointsLogUrl],
  });
  const pointsLog = pointsLogResponse?.data;
  const pointsLogTotal = pointsLogResponse?.total ?? 0;

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

  // Sync tracking state
  const [syncingSourceId, setSyncingSourceId] = useState<number | null>(null);

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

  // Clear data dialog state
  const [clearDataDialog, setClearDataDialog] = useState<{ id: number; name: string } | null>(null);

  // Raw data tab state (paginated + sortable + filterable)
  const [rawDataSourceId, setRawDataSourceId] = useState<string>('');
  const [rawDataSort, setRawDataSort] = useState('');
  const [rawDataSortDir, setRawDataSortDir] = useState('desc');
  const [rawDataPage, setRawDataPage] = useState(0);
  const [rawDataPageSize, setRawDataPageSize] = useState(50);
  const [rawDataDateFrom, setRawDataDateFrom] = useState('');
  const [rawDataDateTo, setRawDataDateTo] = useState('');
  const [rawDataUserFilter, setRawDataUserFilter] = useState<string>('all');

  const rawDataParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(rawDataPageSize));
    p.set('offset', String(rawDataPage * rawDataPageSize));
    if (rawDataSort) p.set('sortBy', rawDataSort);
    if (rawDataSortDir) p.set('sortDir', rawDataSortDir);
    if (rawDataDateFrom) p.set('dateFrom', rawDataDateFrom);
    if (rawDataDateTo) p.set('dateTo', rawDataDateTo);
    if (rawDataUserFilter && rawDataUserFilter !== 'all') p.set('userId', rawDataUserFilter);
    return p.toString();
  }, [rawDataSort, rawDataSortDir, rawDataPage, rawDataPageSize, rawDataDateFrom, rawDataDateTo, rawDataUserFilter]);

  const rawDataUrl = rawDataSourceId ? `/api/rewards/sources/${rawDataSourceId}/data?${rawDataParams}` : null;
  const { data: rawDataResponse, isLoading: rawDataLoading } = useQuery<PaginatedResponse<RawDataEntry>>({
    queryKey: [rawDataUrl],
    enabled: !!rawDataSourceId,
  });
  const rawData = rawDataResponse?.data;
  const rawDataTotal = rawDataResponse?.total ?? 0;

  // Recalculate dialog state
  const [recalcDialog, setRecalcDialog] = useState<{ sourceId: number; sourceName: string } | null>(null);
  const [recalcMetricIds, setRecalcMetricIds] = useState<number[]>([]);

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

  // Poll a sync job until it completes
  const pollSyncJob = (jobId: string, sourceName: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rewards/sync-jobs/${jobId}`, { credentials: 'include' });
        if (!res.ok) {
          clearInterval(interval);
          setSyncingSourceId(null);
          toast({ title: "Sync failed", description: `Error polling sync status`, variant: "destructive" });
          return;
        }
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setSyncingSourceId(null);
          invalidateAll();
          if (data.result) {
            data.result.sourceName = data.result.sourceName || sourceName;
            setSyncResult(data.result);
            setSyncResultDialog(true);
          }
          if (data.status === 'failed' || data.result?.errors?.length) {
            toast({ title: "Sync completed with errors", variant: "destructive" });
          } else {
            toast({ title: "Sync completed" });
          }
        }
      } catch {
        clearInterval(interval);
        setSyncingSourceId(null);
        toast({ title: "Sync failed", description: "Lost connection while syncing", variant: "destructive" });
      }
    }, 2000); // Poll every 2 seconds
  };

  // Sync Now mutation (starts background job, then polls)
  const syncMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      setSyncingSourceId(sourceId);
      return apiRequest({ url: `/api/rewards/sources/${sourceId}/sync`, method: 'POST' });
    },
    onSuccess: (data: any) => {
      if (data.jobId) {
        const sourceName = sources?.find(s => s.id === syncingSourceId)?.name || 'Unknown';
        pollSyncJob(data.jobId, sourceName);
      } else {
        // Fallback: direct result (shouldn't happen with new backend)
        setSyncingSourceId(null);
        invalidateAll();
        setSyncResult(data);
        setSyncResultDialog(true);
      }
    },
    onError: (e: any) => {
      const sourceName = sources?.find(s => s.id === syncingSourceId)?.name || 'Unknown';
      setSyncingSourceId(null);
      setSyncResult({
        sourceName,
        dataPointsFetched: 0,
        pointsAwarded: 0,
        duplicatesSkipped: 0,
        unmatchedMetrics: 0,
        errors: [e.message || 'Unknown error'],
        details: [],
      });
      setSyncResultDialog(true);
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    },
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

  // Clear data mutation
  const clearDataMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      return apiRequest({ url: `/api/rewards/sources/${sourceId}/clear-data`, method: 'POST' });
    },
    onSuccess: (data: any) => {
      invalidateAll();
      setClearDataDialog(null);
      toast({ title: "Data cleared", description: data.message || "All points data deleted for this source." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Helpers
  const resetForm = () => { setFormData({}); setEditItem(null); };
  const invalidateAll = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/rewards');
      },
    });
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
      const { _editId, _selectedKey, ...body } = data;
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

  // Recalculate mutation
  const recalcMutation = useMutation({
    mutationFn: async ({ sourceId, metricIds }: { sourceId: number; metricIds?: number[] }) => {
      return apiRequest({ url: `/api/rewards/sources/${sourceId}/recalculate`, method: 'POST', data: { metricIds } });
    },
    onSuccess: (data: any) => {
      setRecalcDialog(null);
      if (data.jobId) {
        setSyncingSourceId(recalcDialog?.sourceId ?? null);
        pollSyncJob(data.jobId, recalcDialog?.sourceName || 'Recalculation');
      }
    },
    onError: (e: any) => toast({ title: "Error starting recalculation", description: e.message, variant: "destructive" }),
  });

  // Sort toggle helpers
  const toggleSort = (setter: (v: string) => void, dirSetter: (v: string) => void, current: string, currentDir: string) => (key: string) => {
    if (current === key) {
      dirSetter(currentDir === 'asc' ? 'desc' : 'asc');
    } else {
      setter(key);
      dirSetter('desc');
    }
  };

  const toggleActivitySort = toggleSort(setActivitySort, setActivitySortDir, activitySort, activitySortDir);
  const toggleRawDataSort = toggleSort(setRawDataSort, setRawDataSortDir, rawDataSort, rawDataSortDir);

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
          <TabsTrigger value="rawdata" className="flex items-center gap-1"><FileText className="h-4 w-4" /> Raw Data</TabsTrigger>
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
                      <TableHead>Sync Interval</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{SOURCE_TYPE_LABELS[s.type] || s.type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? "default" : "secondary"}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.syncIntervalMinutes >= 60
                            ? `${Math.floor(s.syncIntervalMinutes / 60)}h ${s.syncIntervalMinutes % 60 ? (s.syncIntervalMinutes % 60) + 'm' : ''}`
                            : `${s.syncIntervalMinutes}m`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => syncMutation.mutate(s.id)} disabled={syncMutation.isPending}>
                              <RefreshCw className={`h-4 w-4 mr-1 ${syncingSourceId === s.id ? 'animate-spin' : ''}`} style={syncingSourceId === s.id ? { animationDuration: '2s' } : undefined} /> {syncingSourceId === s.id ? 'Syncing...' : 'Sync Now'}
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
                            <Button variant="outline" size="sm" title="Recalculate coins from raw data" onClick={() => {
                              setRecalcDialog({ sourceId: s.id, sourceName: s.name });
                              setRecalcMetricIds([]);
                            }}>
                              <Calculator className="h-4 w-4 mr-1" /> Recalculate
                            </Button>
                            {s.lastSyncAt && (
                              <Button variant="ghost" size="icon" title="Reset sync — re-pull from start date" onClick={() => resetSyncMutation.mutate(s.id)} disabled={resetSyncMutation.isPending}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" title="Clear all synced data" onClick={() => setClearDataDialog({ id: s.id, name: s.name })}>
                              <Eraser className="h-4 w-4 text-orange-500" />
                            </Button>
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
              <Button size="sm" onClick={() => { resetForm(); setMetricDialog(true); }}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add Metric
              </Button>
            </CardHeader>
            <CardContent>
              {!metrics?.length ? (
                <p className="text-center text-muted-foreground py-4">No metrics configured. Add a metric to define point values for employee activities.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Coins/Unit</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
                        </TableCell>
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

        {/* ==================== RAW DATA TAB ==================== */}
        <TabsContent value="rawdata">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Raw Source Data</CardTitle>
              <div className="w-[220px]">
                <Select value={rawDataSourceId} onValueChange={(v) => { setRawDataSourceId(v); setRawDataPage(0); }}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {sources?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!rawDataSourceId ? (
                <p className="text-center text-muted-foreground py-8">Select a source to view its data.</p>
              ) : (
                <>
                  {/* Filter bar */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="min-w-[220px] max-w-[350px]">
                      <CustomDropdown options={userDropdownOptions} value={rawDataUserFilter}
                        onChange={(v) => { setRawDataUserFilter(String(v)); setRawDataPage(0); }}
                        placeholder="All Users" searchPlaceholder="Search users..." />
                    </div>
                    <DateRangePicker dateFrom={rawDataDateFrom} dateTo={rawDataDateTo}
                      onChange={(f, t) => { setRawDataDateFrom(f); setRawDataDateTo(t); setRawDataPage(0); }} />
                  </div>

                  {rawDataLoading ? <Skeleton className="h-40" /> : !rawData?.length ? (
                    <p className="text-center text-muted-foreground py-8">No raw data yet. Run a sync to populate.</p>
                  ) : (() => {
                    const sourceType = sources?.find(s => s.id === parseInt(rawDataSourceId))?.type;
                    const isZendesk = sourceType === 'zendesk';
                    const isZoom = sourceType === 'zoom_phone';
                    return (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableHeader label="Date" sortKey="date" currentSort={rawDataSort} currentDir={rawDataSortDir} onSort={toggleRawDataSort} />
                              {isZendesk && <TableHead>Ticket #</TableHead>}
                              {isZendesk && <TableHead>Subject</TableHead>}
                              {isZoom && <TableHead>Direction</TableHead>}
                              <SortableHeader label="Agent" sortKey="user" currentSort={rawDataSort} currentDir={rawDataSortDir} onSort={toggleRawDataSort} />
                              {isZoom && <TableHead>Caller</TableHead>}
                              {isZoom && <TableHead>Callee</TableHead>}
                              {isZendesk && <TableHead className="text-right">Reply Time</TableHead>}
                              {isZendesk && <TableHead className="text-right">Resolution Time</TableHead>}
                              {isZendesk && <TableHead className="text-right">Reopens</TableHead>}
                              {isZoom && <TableHead className="text-right">Duration</TableHead>}
                              {isZoom && <TableHead>Result</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rawData.map(entry => {
                              const p = entry.rawPayload || {};
                              return (
                                <TableRow key={entry.id}>
                                  <TableCell className="whitespace-nowrap text-sm">
                                    {(() => {
                                      const d = new Date(p.solved_at || p.date_time || entry.fetchedAt);
                                      return <>{d.toLocaleDateString()}{' '}<span className="text-muted-foreground">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>;
                                    })()}
                                  </TableCell>
                                  {isZendesk && (
                                    <TableCell className="text-sm">
                                      {p.ticket_id ? (
                                        <a href={`https://satellitephonestore.zendesk.com/agent/tickets/${p.ticket_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">#{p.ticket_id}</a>
                                      ) : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                  )}
                                  {isZendesk && (
                                    <TableCell className="text-sm max-w-[200px] truncate" title={p.subject || ''}>{p.subject || '—'}</TableCell>
                                  )}
                                  {isZoom && (
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">{p.direction ? p.direction.charAt(0).toUpperCase() + p.direction.slice(1) : '—'}</Badge>
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium">{entry.firstName} {entry.lastName}</TableCell>
                                  {isZoom && <TableCell className="text-sm">{p.caller_name || p.caller_number || '—'}</TableCell>}
                                  {isZoom && <TableCell className="text-sm">{p.callee_name || p.callee_number || '—'}</TableCell>}
                                  {isZendesk && <TableCell className="text-right text-sm">{p.reply_time_minutes != null ? `${p.reply_time_minutes} min` : '—'}</TableCell>}
                                  {isZendesk && <TableCell className="text-right text-sm">{p.full_resolution_minutes != null ? `${p.full_resolution_minutes} min` : '—'}</TableCell>}
                                  {isZendesk && <TableCell className="text-right text-sm">{p.reopens != null ? p.reopens : '—'}</TableCell>}
                                  {isZoom && <TableCell className="text-right text-sm">{p.duration_seconds != null ? `${Math.round(p.duration_seconds / 60 * 100) / 100} min` : '—'}</TableCell>}
                                  {isZoom && <TableCell className="text-sm">{p.result || '—'}</TableCell>}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        <PaginationControls total={rawDataTotal} page={rawDataPage} pageSize={rawDataPageSize}
                          onPageChange={setRawDataPage} onPageSizeChange={(s) => { setRawDataPageSize(s); setRawDataPage(0); }} />
                      </div>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== POINTS ACTIVITY TAB ==================== */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Coins Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="min-w-[220px] max-w-[350px]">
                  <CustomDropdown options={userDropdownOptions} value={activityFilterUser}
                    onChange={(v) => { setActivityFilterUser(String(v)); setActivityPage(0); }}
                    placeholder="All Users" searchPlaceholder="Search users..." />
                </div>
                <div className="min-w-[220px] max-w-[350px]">
                  <Select value={activityMetricFilter} onValueChange={(v) => { setActivityMetricFilter(v); setActivityPage(0); }}>
                    <SelectTrigger><SelectValue placeholder="All Metrics" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Metrics</SelectItem>
                      {metrics?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DateRangePicker dateFrom={activityDateFrom} dateTo={activityDateTo}
                  onChange={(f, t) => { setActivityDateFrom(f); setActivityDateTo(t); setActivityPage(0); }} />
              </div>

              {/* Summary stats */}
              {pointsLog && pointsLog.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Total Entries</p>
                    <p className="text-xl font-bold">{pointsLogTotal.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Coins on Page</p>
                    <p className="text-xl font-bold text-green-600">
                      {pointsLog.reduce((sum, e) => sum + (e.points > 0 ? e.points : 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Unique Users on Page</p>
                    <p className="text-xl font-bold">{new Set(pointsLog.map(e => e.userId)).size}</p>
                  </div>
                </div>
              )}

              {pointsLogLoading ? <Skeleton className="h-40" /> : !pointsLog?.length ? (
                <p className="text-center text-muted-foreground py-8">No coins activity yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader label="Date" sortKey="date" currentSort={activitySort} currentDir={activitySortDir} onSort={toggleActivitySort} />
                        <SortableHeader label="User" sortKey="user" currentSort={activitySort} currentDir={activitySortDir} onSort={toggleActivitySort} />
                        <SortableHeader label="Type" sortKey="type" currentSort={activitySort} currentDir={activitySortDir} onSort={toggleActivitySort} />
                        <SortableHeader label="Metric" sortKey="metric" currentSort={activitySort} currentDir={activitySortDir} onSort={toggleActivitySort} />
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <SortableHeader label="Coins" sortKey="points" currentSort={activitySort} currentDir={activitySortDir} onSort={toggleActivitySort} />
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
                              const ticketMatch = entry.referenceId.match(/zendesk_(?:solved|frt|fcr|sla4h|sla24h)_(\d+)/);
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
                  <PaginationControls total={pointsLogTotal} page={activityPage} pageSize={activityPageSize}
                    onPageChange={setActivityPage} onPageSizeChange={(s) => { setActivityPageSize(s); setActivityPage(0); }} />
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
              <Input value={formData.apiKey || ''} onChange={e => setFormData({ ...formData, apiKey: e.target.value })} placeholder={editItem ? 'Enter new token to change' : formData.type === 'zendesk' ? 'Zendesk API token' : formData.type === 'zoom_phone' ? 'Zoom Client ID' : ''} />
            </div>
            {formData.type === 'zoom_phone' && (
              <div>
                <Label>Client Secret</Label>
                <Input type="password" value={formData.apiSecret || ''} onChange={e => setFormData({ ...formData, apiSecret: e.target.value })} placeholder={editItem ? 'Enter new secret to change' : 'Zoom Client Secret'} />
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

      {/* Metric Dialog — Picker (add) or Edit form */}
      <Dialog open={metricDialog} onOpenChange={(open) => { if (!open) { setMetricDialog(false); resetForm(); } }}>
        <DialogContent className={editItem ? '' : 'max-w-lg'}>
          <DialogHeader><DialogTitle>{editItem ? 'Edit Metric' : 'Add Metric'}</DialogTitle></DialogHeader>

          {editItem ? (
            /* ---- EDIT MODE: name/description read-only, coins + active editable ---- */
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={formData.name || ''} disabled /></div>
              <div><Label>Description</Label><Textarea value={formData.description || ''} disabled className="resize-none" /></div>
              <div><Label>Coins Per Unit</Label><Input type="number" value={formData.pointsPerUnit || 1} onChange={e => setFormData({ ...formData, pointsPerUnit: parseInt(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.isActive ?? true} onCheckedChange={v => setFormData({ ...formData, isActive: v })} />
                <Label>Active</Label>
              </div>
            </div>
          ) : (
            /* ---- ADD MODE: predefined metric picker ---- */
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {(sources || [])
                .filter(s => PREDEFINED_METRICS[s.type])
                .map(s => (
                  <div key={s.id}>
                    <h4 className="text-sm font-semibold mb-2">{SOURCE_TYPE_LABELS[s.type] || s.type} — {s.name}</h4>
                    <div className="space-y-2">
                      {PREDEFINED_METRICS[s.type].map(pm => {
                        const alreadyAdded = metrics?.some(m => m.key === pm.key && m.sourceId === s.id);
                        return (
                          <div
                            key={pm.key}
                            className={`border rounded-lg p-3 ${alreadyAdded ? 'opacity-50' : 'cursor-pointer hover:border-primary'} ${formData._selectedKey === pm.key && formData.sourceId === s.id ? 'border-primary ring-1 ring-primary' : ''}`}
                            onClick={() => {
                              if (alreadyAdded) return;
                              setFormData({
                                _selectedKey: pm.key,
                                key: pm.key,
                                name: pm.name,
                                description: pm.description,
                                pointsPerUnit: pm.defaultPoints,
                                sourceId: s.id,
                                isActive: true,
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{pm.name}</span>
                                  {alreadyAdded && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Added</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{pm.description}</p>
                              </div>
                              {!alreadyAdded && formData._selectedKey === pm.key && formData.sourceId === s.id && (
                                <div className="flex items-center gap-2 ml-3">
                                  <Label className="text-xs whitespace-nowrap">Coins</Label>
                                  <Input
                                    type="number"
                                    className="w-20 h-8"
                                    value={formData.pointsPerUnit}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => { e.stopPropagation(); setFormData({ ...formData, pointsPerUnit: parseInt(e.target.value) || 0 }); }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {!(sources || []).some(s => PREDEFINED_METRICS[s.type]) && (
                <p className="text-center text-muted-foreground py-4">No sources configured. Add a KPI source first.</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setMetricDialog(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => metricsMutation.mutate({ ...formData, _editId: editItem?.id, _selectedKey: undefined })}
              disabled={metricsMutation.isPending || (!editItem && !formData._selectedKey)}
            >Save</Button>
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
                  <p className="text-sm font-medium text-destructive mb-2">Errors ({syncResult.errors.length})</p>
                  {syncResult.errors.map((err: string, i: number) => {
                    const isAuth = /auth|token|unauthorized|403|401/i.test(err);
                    const isApi = /api|fetch|network|timeout|500|502|503/i.test(err);
                    const isConfig = /config|missing|invalid|not found/i.test(err);
                    const errorType = isAuth ? 'Authentication' : isApi ? 'API/Network' : isConfig ? 'Configuration' : 'Error';
                    return (
                      <div key={i} className="mb-2 last:mb-0">
                        <Badge variant="outline" className="text-destructive border-destructive/40 mb-1 text-xs">{errorType}</Badge>
                        <p className="text-sm text-destructive font-mono break-all">{err}</p>
                      </div>
                    );
                  })}
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

      {/* Clear Data Confirmation */}
      <AlertDialog open={!!clearDataDialog} onOpenChange={() => setClearDataDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data for "{clearDataDialog?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will delete all synced points log entries for this source and reset the last sync timestamp. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearDataDialog && clearDataMutation.mutate(clearDataDialog.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recalculate Dialog */}
      <Dialog open={!!recalcDialog} onOpenChange={(open) => { if (!open) setRecalcDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recalculate Coins — {recalcDialog?.sourceName}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Re-evaluate stored raw data against metrics to award any missing coins (e.g. for newly added metrics).
            Only new entries will be created — existing awards are not affected.
          </p>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select metrics to recalculate:</Label>
            {metrics?.filter(m => m.sourceId === recalcDialog?.sourceId).map(m => (
              <div key={m.id} className="flex items-center space-x-2">
                <Checkbox id={`recalc-m-${m.id}`}
                  checked={recalcMetricIds.includes(m.id)}
                  onCheckedChange={(checked) => {
                    setRecalcMetricIds(prev => checked ? [...prev, m.id] : prev.filter(id => id !== m.id));
                  }} />
                <label htmlFor={`recalc-m-${m.id}`} className="text-sm">{m.name} ({m.pointsPerUnit} coins/unit)</label>
              </div>
            ))}
            {!metrics?.some(m => m.sourceId === recalcDialog?.sourceId) && (
              <p className="text-sm text-muted-foreground">No metrics configured for this source.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecalcDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!recalcDialog) return;
              recalcMutation.mutate({
                sourceId: recalcDialog.sourceId,
                metricIds: recalcMetricIds.length > 0 ? recalcMetricIds : undefined,
              });
            }} disabled={recalcMutation.isPending}>
              <Calculator className="h-4 w-4 mr-1" /> Recalculate
            </Button>
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
