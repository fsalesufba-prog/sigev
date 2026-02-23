"use client"

import * as React from "react"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip } from "./chart-container"

interface LineChartProps {
  data: any[]
  xKey: string
  yKeys: Array<{
    key: string
    name: string
    color: string
    strokeWidth?: number
    type?: "linear" | "monotone" | "step" | "stepBefore" | "stepAfter"
    dot?: boolean
  }>
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  tooltip?: React.ComponentType<any>
  yAxisFormatter?: (value: any) => string
}

export function LineChart({
  data,
  xKey,
  yKeys,
  height = 300,
  showGrid = true,
  showLegend = true,
  tooltip,
  yAxisFormatter,
}: LineChartProps) {
  // Função segura para formatar valores do eixo Y
  const safeYAxisFormatter = React.useCallback((value: any): string => {
    if (yAxisFormatter) {
      return yAxisFormatter(value)
    }
    
    // Formatação padrão
    if (typeof value === 'number') {
      // Se for um número grande, formata com separador de milhar
      if (value >= 1000) {
        return new Intl.NumberFormat('pt-BR', {
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(value)
      }
      return value.toLocaleString('pt-BR')
    }
    
    return String(value)
  }, [yAxisFormatter])

  return (
    <ChartContainer>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis
              dataKey={xKey}
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={safeYAxisFormatter}
            />
            <Tooltip
              content={tooltip ? ({ active, payload, label }: any) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  content={tooltip}
                />
              ) : undefined}
              cursor={{ stroke: "#d1d5db", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{
                  paddingTop: 20,
                  fontSize: 12,
                }}
              />
            )}
            {yKeys.map((yKey, index) => (
              <Line
                key={yKey.key}
                type={yKey.type || "monotone"}
                dataKey={yKey.key}
                name={yKey.name}
                stroke={yKey.color}
                strokeWidth={yKey.strokeWidth || 2}
                dot={yKey.dot !== undefined ? yKey.dot : true}
                activeDot={{ r: 6 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}