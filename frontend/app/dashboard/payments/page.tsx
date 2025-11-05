'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  paymentApi,
  paymentQueryKeys,
  PaymentFilters as PaymentFiltersType,
} from '@/lib/api/payments';
import { projectApi } from '@/lib/api/projects';
import { PaymentStatsCards } from '@/components/payments/PaymentStatsCards';
import { PaymentChart } from '@/components/payments/PaymentChart';
import { PaymentFilters } from '@/components/payments/PaymentFilters';
import { PaymentList } from '@/components/payments/PaymentList';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PaymentsPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<PaymentFiltersType>({});

  // Fetch payments with filters
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    refetch: refetchPayments,
    isFetching,
  } = useQuery({
    queryKey: paymentQueryKeys.list(filters),
    queryFn: () => paymentApi.getAll(filters),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll(),
  });

  const projects = projectsData?.data || [];

  // Calculate statistics
  const stats = paymentApi.calculateStats(payments);

  const handleFilterChange = (newFilters: PaymentFiltersType) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleRefresh = () => {
    refetchPayments();
    toast.success('Payment data has been refreshed');
  };

  const handleExport = () => {
    // Export payments to CSV
    const csvHeaders = [
      'Date',
      'User Name',
      'Username',
      'Plan',
      'Amount',
      'Status',
      'Payment Method',
      'Duration (days)',
      'Transaction ID',
    ];

    const csvRows = payments.map((payment) => {
      const userName = payment.telegram_first_name || payment.telegram_last_name
        ? `${payment.telegram_first_name || ''} ${payment.telegram_last_name || ''}`.trim()
        : payment.telegram_username || `User ${payment.telegram_user_id}`;

      return [
        new Date(payment.created_at).toISOString(),
        userName,
        payment.telegram_username || '',
        payment.snapshot_plan_name,
        payment.amount.toString(),
        payment.status,
        payment.qpay_payment_method || '',
        payment.snapshot_duration_days.toString(),
        payment.qpay_transaction_id || payment.qpay_invoice_id || '',
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `payments_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${payments.length} payments to CSV`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Monitor and manage your payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="refresh-payments-button"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            disabled={payments.length === 0}
            data-testid="export-payments-button"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <PaymentStatsCards stats={stats} isLoading={paymentsLoading} />

      {/* Charts */}
      {payments.length > 0 && <PaymentChart payments={payments} days={30} />}

      {/* Filters */}
      <PaymentFilters
        filters={filters}
        projects={projects}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Payment List */}
      <PaymentList payments={payments} isLoading={paymentsLoading} />
    </div>
  );
}
