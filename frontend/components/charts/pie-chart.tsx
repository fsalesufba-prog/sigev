"use client"

import * as React from "react"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip } from "./chart-container"

interface PieChartProps {
  data: Array<{
    name: string
    value: number
    color: string
    percentage?: number
  }>
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLabel?: boolean
  tooltip?: React.ComponentType<any>
}

export function PieChart({
  data,
  height = 300,
  innerRadius = 0,
  outerRadius = 80,
  showLabel = false,
  tooltip,
}: PieChartProps) {
  // Pré-calcula as porcentagens
  const dataWithPercentages = React.useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }))
  }, [data])

  // Formatter seguro que lida com undefined
  const tooltipFormatter = React.useCallback((
    value: any,
    name: string | undefined,
    props: any
  ) => {
    const safeValue = value || 0
    const safeName = name || ''
    const entry = props?.payload
    const percentage = entry?.percentage || 0

    return [`${safeValue.toLocaleString('pt-BR')} (${percentage.toFixed(1)}%)`, safeName]
  }, [])

  // Renderizador de label seguro
  const renderLabel = React.useCallback((entry: any) => {
    if (!showLabel) return ''
    
    const percentage = entry.percentage || 0
    return `${entry.name}: ${percentage.toFixed(0)}%`
  }, [showLabel])

  return (
    <ChartContainer>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={dataWithPercentages}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={showLabel ? renderLabel : false}
            >
              {dataWithPercentages.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={tooltipFormatter}
              content={tooltip ? ({ active, payload, label }: any) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  content={tooltip}
                />
              ) : undefined}
            />
            <Legend
              wrapperStyle={{
                paddingTop: 20,
                fontSize: 12,
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}