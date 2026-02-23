import * as React from "react"
import { cn } from "../../lib/utils"

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: any
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
)
ChartContainer.displayName = "ChartContainer"

// Tipos específicos para o payload do recharts
interface TooltipPayloadItem {
  color?: string
  fill?: string
  name?: string
  value?: string | number | Array<string | number>
  dataKey?: string | number
  payload?: any
  unit?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[] | readonly TooltipPayloadItem[]
  label?: string | number
  content?: React.ComponentType<any>
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  content: Content,
}) => {
  if (!active || !payload || !payload.length) return null

  // Converte payload readonly para mutable se necessário
  const mutablePayload = Array.isArray(payload) ? payload : [...payload]

  if (Content) {
    return (
      <Content 
        active={active} 
        payload={mutablePayload} 
        label={label} 
      />
    )
  }

  return (
    <ChartTooltipContent>
      <div className="space-y-1">
        {label && <p className="font-medium">{String(label)}</p>}
        {mutablePayload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#8884d8' }}
            />
            <span className="text-sm">
              {entry.name || 'Valor'}: {String(entry.value || '')}
              {entry.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </ChartTooltipContent>
  )
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 max-w-[200px] rounded-lg border bg-popover p-3 text-popover-foreground shadow-md",
      className
    )}
    {...props}
  />
))
ChartTooltipContent.displayName = "ChartTooltipContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
}