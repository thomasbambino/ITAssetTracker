import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeContext } from "@/components/theme/ThemeProvider";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";

export function ThemeToggle({ className = "", size = "default" }: { className?: string, size?: "sm" | "default" | "lg" }) {
  const { setTheme, theme } = useThemeContext();

  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={size} className={`${className} px-2`}>
          <SunIcon className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 h-[1em] w-[1em]" style={{ height: iconSize, width: iconSize }} />
          <MoonIcon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 h-[1em] w-[1em]" style={{ height: iconSize, width: iconSize }} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-accent" : ""}>
          <SunIcon className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-accent" : ""}>
          <MoonIcon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-accent" : ""}>
          <MonitorIcon className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}