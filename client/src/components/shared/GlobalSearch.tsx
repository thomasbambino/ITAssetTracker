import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  SearchIcon, 
  UserIcon, 
  LaptopIcon, 
  TagIcon,
  FilterIcon,
  BrainIcon,
  Sparkles,
  Clock
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Define types for the data received from API
interface User {
  id: number;
  firstName: string;
  lastName: string;
  department?: string;
  email: string;
}

interface Device {
  id: number;
  brand: string;
  model: string;
  assetTag: string;
  serialNumber?: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

type SearchResult = {
  id: number;
  type: 'user' | 'device' | 'category' | 'software' | 'maintenance';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  url: string;
};

interface SmartSearchResult {
  query: {
    intent: string;
    confidence: number;
  };
  results: any[];
  totalFound: number;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [smartSearchResults, setSmartSearchResults] = useState<SmartSearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiMode, setIsAiMode] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // AI-powered smart search mutation
  const smartSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest({
        url: '/api/search/smart',
        method: 'POST',
        data: { query }
      });
      return response;
    },
    onSuccess: (data) => {
      setSmartSearchResults(data);
    },
    onError: (error) => {
      console.error('Smart search error:', error);
      setIsAiMode(false);
    }
  });
  
  // Search suggestions mutation
  const suggestionsMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest({
        url: '/api/search/suggestions',
        method: 'POST',
        data: { query }
      });
      return response;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
    }
  });

  // Fetch users for search (only when not in AI mode)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open && !isAiMode,
  });

  // Fetch devices for search (only when not in AI mode)
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    enabled: open && !isAiMode,
  });

  // Fetch categories for search (only when not in AI mode)
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: open && !isAiMode,
  });

  // Combine all results
  const searchResults: SearchResult[] = [
    // Map users to search results
    ...users.map((user) => ({
      id: user.id,
      type: 'user' as const,
      title: `${user.firstName} ${user.lastName}`,
      subtitle: user.department || 'No department',
      icon: <UserIcon className="h-4 w-4" />,
      url: `/users/${user.id}`
    })),
    
    // Map devices to search results
    ...devices.map((device) => ({
      id: device.id,
      type: 'device' as const,
      title: `${device.brand} ${device.model}`,
      subtitle: device.assetTag,
      icon: <LaptopIcon className="h-4 w-4" />,
      url: `/devices/${device.id}`
    })),
    
    // Map categories to search results
    ...categories.map((category) => ({
      id: category.id,
      type: 'category' as const,
      title: category.name,
      subtitle: category.description || 'No description',
      icon: <TagIcon className="h-4 w-4" />,
      url: `/categories/${category.id}`
    }))
  ];

  // Filter results based on search query
  const filteredResults = searchQuery.length > 0
    ? searchResults.filter(
        result => 
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (result.subtitle && result.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : searchResults;

  // Trigger AI search when query changes and is natural language
  useEffect(() => {
    if (searchQuery.length > 10 && searchQuery.includes(' ')) {
      setIsAiMode(true);
      smartSearchMutation.mutate(searchQuery);
    } else {
      setIsAiMode(false);
      setSmartSearchResults(null);
    }
  }, [searchQuery]);

  // Generate suggestions for partial queries
  useEffect(() => {
    if (searchQuery.length > 3 && searchQuery.length < 10) {
      const timeoutId = setTimeout(() => {
        suggestionsMutation.mutate(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  // Convert AI search results to SearchResult format
  const aiSearchResults: SearchResult[] = smartSearchResults?.results?.map((result: any) => {
    const title = result.title || (result.brand && result.model ? `${result.brand} ${result.model}` : result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim());
    const subtitle = result.subtitle || result.assetTag || result.department || result.categoryName || '';
    
    return {
      id: result.id,
      type: result.type || 'device',
      title,
      subtitle,
      icon: result.type === 'user' ? <UserIcon className="h-4 w-4" /> : <LaptopIcon className="h-4 w-4" />,
      url: result.type === 'user' ? `/users/${result.id}` : `/devices/${result.id}`
    };
  }) || [];

  // Use AI results when available, otherwise use regular search
  const displayResults = isAiMode ? aiSearchResults : filteredResults;

  // Group results by type
  const userResults = filteredResults.filter(r => r.type === 'user');
  const deviceResults = filteredResults.filter(r => r.type === 'device');
  const categoryResults = filteredResults.filter(r => r.type === 'category');

  // Group AI results by type
  const aiUserResults = aiSearchResults.filter(r => r.type === 'user');
  const aiDeviceResults = aiSearchResults.filter(r => r.type === 'device');
  const aiCategoryResults = aiSearchResults.filter(r => r.type === 'category');

  const finalUserResults = isAiMode ? aiUserResults : userResults;
  const finalDeviceResults = isAiMode ? aiDeviceResults : deviceResults;
  const finalCategoryResults = isAiMode ? aiCategoryResults : categoryResults;





  // Handle keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setIsAiMode(true);
    smartSearchMutation.mutate(suggestion);
  };

  return (
    <div className="relative w-full max-w-md border border-input rounded-md bg-background">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        className="pl-10 pr-16 w-full border-0 shadow-none font-medium text-base focus-visible:ring-0"
        placeholder="Search or ask in natural language..."
        onClick={() => setOpen(true)}
        readOnly
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        {isAiMode && (
          <Badge variant="secondary" className="mr-2 text-xs">
            <BrainIcon className="h-3 w-3 mr-1" />
            AI
          </Badge>
        )}
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-full rounded-md"
          onClick={() => setOpen(true)}
        >
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
          <span className="sr-only">Open search</span>
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <div className="flex items-center border-b px-3">
          <CommandInput 
            placeholder="Try: 'Show me all laptops assigned to sales that expire next month'" 
            value={searchQuery}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 pl-3"
            onValueChange={setSearchQuery}
          />
          {smartSearchMutation.isPending && (
            <div className="ml-2 flex items-center">
              <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
            </div>
          )}
        </div>
        
        <CommandList className="max-h-[400px] overflow-y-auto">
          {/* Search suggestions */}
          {suggestions.length > 0 && searchQuery.length > 3 && !isAiMode && (
            <CommandGroup heading="Suggestions">
              {suggestions.map((suggestion, index) => (
                <CommandItem
                  key={`suggestion-${index}`}
                  onSelect={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* AI Search Results */}
          {isAiMode && smartSearchResults && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                AI Search • {smartSearchResults.totalFound} results
                {smartSearchResults.query?.confidence && (
                  <> • {Math.round(smartSearchResults.query.confidence * 100)}% confidence</>
                )}
              </div>
              <CommandSeparator />
            </>
          )}

          {/* No results */}
          {!smartSearchMutation.isPending && displayResults.length === 0 && searchQuery.length > 0 && (
            <CommandEmpty>
              {isAiMode ? 'No results found for your query.' : 'No results found.'}
            </CommandEmpty>
          )}

          {/* User Results */}
          {finalUserResults.length > 0 && (
            <CommandGroup heading="Users">
              {finalUserResults.map(result => (
                <CommandItem
                  key={`user-${result.id}`}
                  onSelect={() => handleSelect(result)}
                >
                  <div className="flex items-center">
                    {result.icon}
                    <div className="ml-2">
                      <p className="text-sm font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Device Results */}
          {finalDeviceResults.length > 0 && (
            <>
              {finalUserResults.length > 0 && <CommandSeparator />}
              <CommandGroup heading={isAiMode ? `Devices (${finalDeviceResults.length})` : "Devices"}>
                {finalDeviceResults.map(result => (
                  <CommandItem
                    key={`device-${result.id}`}
                    value={result.title}
                    onSelect={() => handleSelect(result)}
                  >
                    <div className="flex items-center">
                      {result.icon}
                      <div className="ml-2">
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Category Results */}
          {finalCategoryResults.length > 0 && (
            <>
              {(finalUserResults.length > 0 || finalDeviceResults.length > 0) && <CommandSeparator />}
              <CommandGroup heading="Categories">
                {finalCategoryResults.map(result => (
                  <CommandItem
                    key={`category-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    <div className="flex items-center">
                      {result.icon}
                      <div className="ml-2">
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Help section */}
          {searchQuery.length === 0 && (
            <CommandGroup heading="Examples">
              <CommandItem onSelect={() => handleSuggestionSelect("Show me all laptops assigned to sales")}>
                <div className="flex items-center">
                  <BrainIcon className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">Show me all laptops assigned to sales</span>
                </div>
              </CommandItem>
              <CommandItem onSelect={() => handleSuggestionSelect("Find devices with expired warranties")}>
                <div className="flex items-center">
                  <BrainIcon className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">Find devices with expired warranties</span>
                </div>
              </CommandItem>
              <CommandItem onSelect={() => handleSuggestionSelect("Apple devices in IT department")}>
                <div className="flex items-center">
                  <BrainIcon className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">Apple devices in IT department</span>
                </div>
              </CommandItem>
            </CommandGroup>
          )}
          {/* Show when no results */}
          {searchQuery && !isAiMode && finalDeviceResults.length === 0 && finalUserResults.length === 0 && finalCategoryResults.length === 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          )}
          
          {/* Fallback display for AI results if Command component fails */}
          {isAiMode && smartSearchResults && aiSearchResults.length > 0 && (
            <div className="px-4 py-2">
              <div className="text-sm font-medium mb-2">AI Search Results ({aiSearchResults.length})</div>
              <div className="space-y-1">
                {aiSearchResults.map(result => (
                  <div 
                    key={`fallback-${result.id}`}
                    className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => handleSelect(result)}
                  >
                    {result.icon}
                    <div className="ml-2">
                      <p className="text-sm font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
