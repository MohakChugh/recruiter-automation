import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemHealth } from '@/store/health'

export function StatusIndicator() {
  const health = useSystemHealth()

  const overallStatus = health.allGreen ? 'green' : health.anyRed ? 'red' : 'yellow'
  const label = health.allGreen ? 'Full AI Mode' :
                health.anyRed ? 'Degraded' :
                (health.dbHealthy && health.geocodingOnline) ? 'Ready — AI models optional' : 'Partial Mode'

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Circle
        className={cn(
          "h-2 w-2 fill-current",
          overallStatus === 'green' && "text-emerald-500",
          overallStatus === 'yellow' && "text-amber-500",
          overallStatus === 'red' && "text-red-500"
        )}
      />
      <span>{label}</span>
    </div>
  )
}
