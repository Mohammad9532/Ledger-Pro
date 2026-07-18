import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score += 1;
  if (password.match(/\d/)) score += 1;
  if (password.match(/[^a-zA-Z\d]/)) score += 1;
  return score;
}

interface PasswordStrengthIndicatorProps {
  password?: string;
  strength?: number;
}

export default function PasswordStrengthIndicator({ password, strength }: PasswordStrengthIndicatorProps) {
  const score = useMemo(() => {
    if (strength !== undefined) return strength;
    return calculatePasswordStrength(password || '');
  }, [password, strength]);

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const currentLabel = labels[score];

  const getBarColor = (index: number) => {
    if (score === 0) return 'bg-border';
    if (score <= 1) return index === 0 ? 'bg-destructive' : 'bg-border';
    if (score === 2) return index < 2 ? 'bg-orange-500' : 'bg-border';
    if (score === 3) return index < 3 ? 'bg-yellow-500' : 'bg-border';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-1.5 mt-2 animate-fade-in">
      <div className="flex gap-1 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              getBarColor(i)
            )}
          />
        ))}
      </div>
      <p className={cn(
        "text-xs font-medium text-right transition-colors duration-300",
        score === 0 ? 'text-muted-foreground' :
        score <= 1 ? 'text-destructive' :
        score === 2 ? 'text-orange-500' :
        score === 3 ? 'text-yellow-500' : 'text-green-500'
      )}>
        {score > 0 ? currentLabel : 'Password strength'}
      </p>
    </div>
  );
}
