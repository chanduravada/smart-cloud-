import { useProfile } from '@/hooks/useProfile';
import { Cloud, HardDrive, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StorageIndicator() {
  const { profile, loading, formatStorageSize, getStoragePercentage } = useProfile();

  if (loading || !profile) {
    return (
      <div className="p-5 rounded-2xl bg-muted/50 animate-pulse">
        <div className="h-20 w-full" />
      </div>
    );
  }

  const percentage = getStoragePercentage();
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 95;

  const barColor = isAtLimit
    ? 'from-red-500 to-rose-600'
    : isNearLimit
      ? 'from-amber-500 to-orange-500'
      : 'from-blue-500 to-cyan-500';

  const iconColor = isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-500' : 'text-primary';
  const iconBg = isAtLimit ? 'bg-destructive/10' : isNearLimit ? 'bg-amber-500/10' : 'bg-primary/10';

  return (
    <div className="p-5 rounded-2xl bg-card border border-border overflow-hidden">
      {/* Top gradient accent */}
      <div className={cn('h-0.5 w-full -mt-5 -mx-5 mb-5', `bg-gradient-to-r ${barColor}`)}
        style={{ width: 'calc(100% + 2.5rem)', marginLeft: '-1.25rem', marginRight: '-1.25rem' }} />

      <div className="flex items-center gap-3 mb-4">
        <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
          {isAtLimit ? (
            <AlertTriangle className={cn('h-4 w-4', iconColor)} />
          ) : isNearLimit ? (
            <HardDrive className={cn('h-4 w-4', iconColor)} />
          ) : (
            <Cloud className={cn('h-4 w-4', iconColor)} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Storage</p>
          <p className="text-xs text-muted-foreground">
            {formatStorageSize(profile.storage_used)} of {formatStorageSize(profile.storage_limit)} used
          </p>
        </div>
        <span className={cn('text-sm font-bold tabular-nums', iconColor)}>
          {percentage}%
        </span>
      </div>

      {/* Custom gradient progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', barColor)}
          style={{ width: `${profile.storage_used > 0 ? Math.max(percentage, 0.5) : 0}%` }}
        />
      </div>

      {isNearLimit && (
        <p className="text-xs mt-3 leading-relaxed" style={{ color: isAtLimit ? 'hsl(var(--destructive))' : 'hsl(35 90% 45%)' }}>
          {isAtLimit
            ? '⚠ Storage almost full. Delete files to continue uploading.'
            : '💡 Running low on storage space.'}
        </p>
      )}
    </div>
  );
}
