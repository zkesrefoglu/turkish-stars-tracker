import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";

interface MarketValue {
  id: string;
  athlete_id: string;
  market_value: number;
  recorded_date: string;
  currency: string | null;
  value_change: number | null;
  value_change_percentage: number | null;
}

interface MarketValueChartProps {
  marketValues: MarketValue[];
}

import { formatMarketValue } from "@/lib/formatMarketValue";

// Alias for backward compatibility within the chart
const formatValue = (value: number): string => formatMarketValue(value);

export const MarketValueChart = ({ marketValues }: MarketValueChartProps) => {
  const chartData = useMemo(() => {
    return [...marketValues]
      .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())
      .map((mv) => ({
        date: mv.recorded_date,
        value: mv.market_value,
        formattedDate: format(new Date(mv.recorded_date), "MMM yyyy"),
        formattedValue: formatValue(mv.market_value),
      }));
  }, [marketValues]);

  if (chartData.length === 0) {
    return null;
  }

  const latestValue = marketValues[0];
  const previousValue = marketValues[1];
  const valueChange = latestValue && previousValue 
    ? latestValue.market_value - previousValue.market_value 
    : null;
  const percentChange = valueChange && previousValue 
    ? ((valueChange / previousValue.market_value) * 100) 
    : null;

  return (
    <div className="space-y-4">
      {/* Current Value Display */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-foreground">
            {formatValue(latestValue?.market_value || 0)}
          </div>
          <div className="text-sm text-muted-foreground">
            Current Market Value
          </div>
        </div>
        {valueChange !== null && (
          <div className={`text-right ${valueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <div className="text-lg font-semibold">
              {valueChange >= 0 ? '+' : ''}{formatValue(Math.abs(valueChange))}
            </div>
            <div className="text-sm">
              {percentChange !== null && (
                <>({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)</>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="marketValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatValue(value)}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip 
                formatter={(value: number) => [formatValue(value), 'Market Value']}
                labelFormatter={(label) => label}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#marketValueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Value History Table */}
      {chartData.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Value</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {[...marketValues].slice(0, 10).map((mv, index) => {
                const prevMv = marketValues[index + 1];
                const change = prevMv ? mv.market_value - prevMv.market_value : null;
                return (
                  <tr key={mv.id} className="border-b border-border/50">
                    <td className="py-2 text-foreground">
                      {format(new Date(mv.recorded_date), "MMM d, yyyy")}
                    </td>
                    <td className="py-2 text-right text-foreground font-medium">
                      {formatValue(mv.market_value)}
                    </td>
                    <td className={`py-2 text-right ${change !== null ? (change >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-muted-foreground'}`}>
                      {change !== null ? (
                        <>{change >= 0 ? '+' : ''}{formatValue(Math.abs(change))}</>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
