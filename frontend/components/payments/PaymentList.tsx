'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentTransaction, PaymentStatus } from '@/lib/api/payments';
import { format } from 'date-fns';
import { ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentListProps {
  payments: PaymentTransaction[];
  isLoading?: boolean;
}

export function PaymentList({ payments, isLoading }: PaymentListProps) {
  const getStatusBadge = (status: PaymentStatus) => {
    const variants: Record<
      PaymentStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      [PaymentStatus.COMPLETED]: { variant: 'default', label: 'Completed' },
      [PaymentStatus.PENDING]: { variant: 'secondary', label: 'Pending' },
      [PaymentStatus.FAILED]: { variant: 'destructive', label: 'Failed' },
      [PaymentStatus.REFUNDED]: { variant: 'outline', label: 'Refunded' },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className="font-medium">
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return `₮${amount.toLocaleString()}`;
  };

  const getUserName = (payment: PaymentTransaction) => {
    if (payment.telegram_first_name || payment.telegram_last_name) {
      return `${payment.telegram_first_name || ''} ${payment.telegram_last_name || ''}`.trim();
    }
    return payment.telegram_username || `User ${payment.telegram_user_id}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">Loading payments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No payments found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Transactions</CardTitle>
        <p className="text-sm text-muted-foreground">
          {payments.length} transaction{payments.length !== 1 ? 's' : ''} found
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), 'HH:mm:ss')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{getUserName(payment)}</span>
                        {payment.telegram_username && (
                          <span className="text-xs text-muted-foreground">
                            @{payment.telegram_username}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{payment.snapshot_plan_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {payment.snapshot_duration_days} days
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    {payment.qpay_payment_method ? (
                      <span className="capitalize">
                        {payment.qpay_payment_method.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.membership_starts_at && payment.membership_expires_at ? (
                      <div className="flex flex-col text-xs">
                        <span>
                          Start: {format(new Date(payment.membership_starts_at), 'MMM dd')}
                        </span>
                        <span>
                          End: {format(new Date(payment.membership_expires_at), 'MMM dd')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.payment_link && payment.status === PaymentStatus.PENDING && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8"
                      >
                        <a
                          href={payment.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
