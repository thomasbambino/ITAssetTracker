import { useThemeContext } from "@/components/theme/ThemeProvider";
import { SunIcon, MoonIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className = "", size = "default" }: { className?: string, size?: "sm" | "default" | "lg" }) {
  const { setTheme, activeTheme } = useThemeContext();

  const toggleTheme = () => {
    setTheme(activeTheme === 'dark' ? 'light' : 'dark');
  };

  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  const switchSize = size === "sm" ? "h-5 w-9" : size === "lg" ? "h-7 w-14" : "h-6 w-11";
  const thumbSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5.5 w-5.5" : "h-4.5 w-4.5";

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
        className={cn(switchSize)}
        thumbClassName={cn(thumbSize)}
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