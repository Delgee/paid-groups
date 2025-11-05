'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, CreditCard, AlertCircle } from 'lucide-react';

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  averagePayment: number;
  revenueGrowth: number; // Percentage
}

interface PaymentStatsCardProps {
  stats?: PaymentStats;
  currency?: string;
}

export function PaymentStatsCard({ stats, currency = 'MNT' }: PaymentStatsCardProps) {
  // Provide default values if stats is undefined
  const defaultStats: PaymentStats = {
    totalRevenue: 0,
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    averagePayment: 0,
    revenueGrowth: 0,
  };

  const paymentStats = stats || defaultStats;

  const successRate = paymentStats.totalPayments > 0
    ? ((paymentStats.completedPayments / paymentStats.totalPayments) * 100).toFixed(1)
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mn-MN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(paymentStats.totalRevenue)} {currency}
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {paymentStats.revenueGrowth >= 0 ? (
              <>
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                <span className="text-green-500">+{paymentStats.revenueGrowth}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                <span className="text-red-500">{paymentStats.revenueGrowth}%</span>
              </>
            )}
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{paymentStats.totalPayments}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {paymentStats.completedPayments} completed
          </p>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {paymentStats.pendingPayments} pending
          </p>
        </CardContent>
      </Card>

      {/* Failed Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{paymentStats.failedPayments}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg: {formatCurrency(paymentStats.averagePayment)} {currency}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
