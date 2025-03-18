import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant={variant === 'primary' ? 'default' : 'outline'}
      size="default"
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center", className)}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </Button>
  );
}
