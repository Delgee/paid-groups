'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentStats } from '@/lib/api/payments';
import { DollarSign, TrendingUp, Clock, XCircle } from 'lucide-react';

interface PaymentStatsCardsProps {
  stats: PaymentStats;
  isLoading?: boolean;
}

export function PaymentStatsCards({ stats, isLoading }: PaymentStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Revenue',
      value: isLoading ? '...' : `₮${stats.totalRevenue.toLocaleString()}`,
      description: 'From completed payments',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Completed',
      value: isLoading ? '...' : stats.completed.toString(),
      description: 'Successful payments',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending',
      value: isLoading ? '...' : stats.pending.toString(),
      description: 'Awaiting payment',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Failed',
      value: isLoading ? '...' : stats.failed.toString(),
      description: 'Payment failures',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
