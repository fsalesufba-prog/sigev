"use client"

import * as React from "react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip } from "./chart-container"

interface BarChartProps {
  data: any[]
  xKey: string
  yKeys: Array<{
    key: string
    name: string
    color: string
    stackId?: string
  }>
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  tooltip?: React.ComponentType<any>
  barSize?: number
  stacked?: boolean
}

export function BarChart({
  data,
  xKey,
  yKeys,
  height = 300,
  showGrid = true,
  showLegend = true,
  tooltip,
  barSize = 40,
  stacked = false,
}: BarChartProps) {
  return (
    <ChartContainer>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data}>
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
              tickFormatter={(value) => `${value}`}
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
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
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
              <Bar
                key={yKey.key}
                dataKey={yKey.key}
                name={yKey.name}
                fill={yKey.color}
                stackId={stacked ? "stack" : undefined}
                radius={[4, 4, 0, 0]}
                barSize={barSize}
              >
                {data.map((entry, cellIndex) => (
                  <Cell
                    key={`cell-${cellIndex}`}
                    fill={yKey.color}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}