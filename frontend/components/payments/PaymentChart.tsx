'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentTransaction, PaymentStatus } from '@/lib/api/payments';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfDay, subDays } from 'date-fns';

interface PaymentChartProps {
  payments: PaymentTransaction[];
  days?: number;
}

export function PaymentChart({ payments, days = 30 }: PaymentChartProps) {
  // Aggregate payments by day
  const aggregateByDay = () => {
    const now = new Date();
    const daysAgo = subDays(now, days);

    // Create a map of dates to payment data
    const dateMap = new Map<
      string,
      { date: string; revenue: number; count: number; completed: number; failed: number }
    >();

    // Initialize all dates with 0 values
    for (let i = 0; i < days; i++) {
      const date = startOfDay(subDays(now, days - i - 1));
      const dateStr = format(date, 'yyyy-MM-dd');
      dateMap.set(dateStr, {
        date: format(date, 'MMM dd'),
        revenue: 0,
        count: 0,
        completed: 0,
        failed: 0,
      });
    }

    // Aggregate payment data
    payments.forEach((payment) => {
      const paymentDate = startOfDay(new Date(payment.created_at));
      if (paymentDate >= daysAgo) {
        const dateStr = format(paymentDate, 'yyyy-MM-dd');
        const existing = dateMap.get(dateStr);

        if (existing) {
          existing.count++;
          if (payment.status === PaymentStatus.COMPLETED) {
            existing.revenue += payment.amount;
            existing.completed++;
          } else if (payment.status === PaymentStatus.FAILED) {
            existing.failed++;
          }
        }
      }
    });

    return Array.from(dateMap.values());
  };

  const chartData = aggregateByDay();

  const formatCurrency = (value: number) => `₮${value.toLocaleString()}`;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue from completed payments (Last {days} days)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status Trend</CardTitle>
          <CardDescription>Daily payment count by status (Last {days} days)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} tickMargin={10} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
