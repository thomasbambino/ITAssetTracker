import { useThemeContext } from "@/components/theme/ThemeProvider";
import { SunIcon, MoonIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className = "", size = "default" }: { className?: string, size?: "sm" | "default" | "lg" }) {
  const { setTheme, activeTheme } = useThemeContext();

  const toggleTheme = () => {
    setTheme(activeTheme === 'dark' ? 'light' : 'dark');
  };

  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <SunIcon 
        className={cn(
          "text-muted-foreground", 
          activeTheme === 'light' && "text-amber-500"
        )} 
        size={iconSize} 
      />
      <Switch 
        checked={activeTheme === 'dark'}
        onCheckedChange={toggleTheme}
      />
      <MoonIcon 
        className={cn(
          "text-muted-foreground", 
          activeTheme === 'dark' && "text-blue-400"
        )} 
        size={iconSize} 
      />
    </div>
  );
}