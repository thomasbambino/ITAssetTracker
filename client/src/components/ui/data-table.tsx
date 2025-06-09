import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDownIcon, MoreHorizontalIcon, SearchIcon } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  keyField: keyof T;
  searchable?: boolean;
  actions?: {
    label: string;
    onClick: (row: T) => void;
    icon?: React.ReactNode;
  }[];
  emptyState?: React.ReactNode;
  loading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  keyField,
  searchable = true,
  actions,
  emptyState,
  loading = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  // Handle sorting
  const handleSort = (key: keyof T) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const safeData = Array.isArray(data) ? data : [];
  const filteredData = safeData
    .filter((row) => {
      if (!searchTerm) return true;
      
      // Search across all string properties
      return Object.entries(row as Record<string, any>).some(([_, value]) => {
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === "number") {
          return value.toString().includes(searchTerm);
        }
        return false;
      });
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === bValue) return 0;
      
      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Handle number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
      
      // Handle date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      return 0;
    });

  // Render cell content
  const renderCell = (row: T, column: Column<T>) => {
    if (column.cell) {
      return column.cell(row);
    }
    
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    
    const value = row[column.accessor as keyof T];
    
    if (value === null || value === undefined) {
      return "-";
    }
    
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    
    return value;
  };

  return (
    <div className="w-full">
      {searchable && (
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={column.sortable ? "cursor-pointer" : ""}
                  onClick={
                    column.sortable && typeof column.accessor !== "function"
                      ? () => handleSort(column.accessor as keyof T)
                      : undefined
                  }
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && typeof column.accessor !== "function" && (
                      <ChevronDownIcon
                        className={`ml-2 h-4 w-4 transition-transform ${
                          sortConfig.key === column.accessor &&
                          sortConfig.direction === "desc"
                            ? "rotate-180"
                            : sortConfig.key === column.accessor
                            ? "rotate-0"
                            : "opacity-0"
                        }`}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyState || "No data available"}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow
                  key={String(row[keyField])}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column, cellIndex) => (
                    <TableCell key={cellIndex}>
                      {renderCell(row, column)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {actions.map((action, actionIndex) => (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(row);
                              }}
                            >
                              {action.icon && (
                                <span className="mr-2">{action.icon}</span>
                              )}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
