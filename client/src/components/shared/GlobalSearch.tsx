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
import { 
  SearchIcon, 
  UserIcon, 
  LaptopIcon, 
  TagIcon,
  FilterIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  type: 'user' | 'device' | 'category';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  url: string;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users for search
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  // Fetch devices for search
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    enabled: open,
  });

  // Fetch categories for search
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: open,
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

  // Group results by type
  const userResults = filteredResults.filter(r => r.type === 'user');
  const deviceResults = filteredResults.filter(r => r.type === 'device');
  const categoryResults = filteredResults.filter(r => r.type === 'category');

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

  return (
    <div className="relative w-full max-w-md border border-input rounded-md bg-background">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        className="pl-10 pr-10 w-full border-0 shadow-none font-medium text-base focus-visible:ring-0"
        placeholder="Search..."
        onClick={() => setOpen(true)}
        readOnly
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-full rounded-md"
          onClick={() => setOpen(true)}
        >
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Advanced search</span>
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search users, devices, categories..." 
          value={searchQuery}
          className="text-base font-medium"
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {userResults.length > 0 && (
            <CommandGroup heading="Users">
              {userResults.map(result => (
                <CommandItem
                  key={`user-${result.id}`}
                  onSelect={() => handleSelect(result)}
                >
                  <div className="flex items-center">
                    {result.icon}
                    <div className="ml-2">
                      <p className="text-sm font-medium">{result.title}</p>
                      <p className="text-xs text-gray-500">{result.subtitle}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {deviceResults.length > 0 && (
            <>
              {userResults.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Devices">
                {deviceResults.map(result => (
                  <CommandItem
                    key={`device-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    <div className="flex items-center">
                      {result.icon}
                      <div className="ml-2">
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-gray-500">{result.subtitle}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {categoryResults.length > 0 && (
            <>
              {(userResults.length > 0 || deviceResults.length > 0) && <CommandSeparator />}
              <CommandGroup heading="Categories">
                {categoryResults.map(result => (
                  <CommandItem
                    key={`category-${result.id}`}
                    onSelect={() => handleSelect(result)}
                  >
                    <div className="flex items-center">
                      {result.icon}
                      <div className="ml-2">
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-gray-500">{result.subtitle}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
