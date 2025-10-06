'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  MessageCircle, 
  Calendar,
  CreditCard,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Member, Membership } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Simple Badge component
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [memberResponse, membershipsResponse] = await Promise.all([
          apiClient.getMember(memberId),
          apiClient.getMemberships({ member_id: memberId })
        ]);

        setMember(memberResponse);
        setMemberships(membershipsResponse.memberships);
      } catch (err: any) {
        console.error('Failed to fetch member data:', err);
        setError(err?.response?.status === 404 ? 'Member not found' : 'Failed to load member data');
      } finally {
        setIsLoading(false);
      }
    };

    if (memberId) {
      fetchMemberData();
    }
  }, [memberId]);

  const getMembershipStatusBadge = (membership: Membership) => {
    switch (membership.status) {
      case 'active':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'cancelled':
        return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'pending':
        return <Badge variant="warning"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-gray-200 rounded-lg h-64"></div>
            <div className="bg-gray-200 rounded-lg h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error || 'Member not found'}
        </div>
        <Button onClick={() => router.push('/dashboard/members')}>
          Back to Members
        </Button>
      </div>
    );
  }

  const activeMemberships = memberships.filter(m => m.status === 'active');
  // const expiredMemberships = memberships.filter(m => m.status === 'expired');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/members">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium text-lg">
                {member.first_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {member.first_name} {member.last_name}
              </h1>
              <div className="flex items-center gap-2 text-gray-600">
                {member.username && (
                  <span>@{member.username}</span>
                )}
                <span>•</span>
                <span>ID: {member.telegram_user_id}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          {member.username && (
            <Button
              variant="outline"
              onClick={() => window.open(`https://t.me/${member.username}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Telegram
            </Button>
          )}
        </div>
      </div>

      {/* Member Status */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={member.is_active ? 'success' : 'danger'}>
              {member.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Account status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Memberships</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMemberships.length}</div>
            <p className="text-xs text-muted-foreground">
              Current subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Memberships</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberships.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDate(member.created_at)}
            </div>
            <p className="text-xs text-muted-foreground">
              Join date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Details and Memberships */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Member Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
              <CardDescription>
                Personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-sm">{member.first_name} {member.last_name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Username</label>
                <p className="text-sm">
                  {member.username ? `@${member.username}` : 'No username'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Telegram User ID</label>
                <p className="text-sm font-mono">{member.telegram_user_id}</p>
              </div>

              {member.phone_number && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-sm">{member.phone_number}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Account Type</label>
                <p className="text-sm">
                  {member.is_bot ? 'Bot' : 'User'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge variant={member.is_active ? 'success' : 'danger'}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-sm">{formatDateTime(member.created_at)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">{formatDateTime(member.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Memberships */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Memberships</CardTitle>
                <CardDescription>
                  Subscription history and current memberships
                </CardDescription>
              </div>
              <Button size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Add Membership
              </Button>
            </CardHeader>
            <CardContent>
              {memberships.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No memberships</h3>
                  <p className="text-gray-500 mb-4">
                    This member doesn&apos;t have any memberships yet.
                  </p>
                  <Button>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Membership
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {memberships.map((membership) => (
                    <div key={membership.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {membership.plan?.name || 'Unknown Plan'}
                            </h4>
                            {getMembershipStatusBadge(membership)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {membership.group?.group_name || 'Unknown Group'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>
                            {membership.plan?.price
                              ? `${new Intl.NumberFormat('mn-MN').format(membership.plan.price)} ₮`
                              : 'Free'} /
                            {membership.plan?.duration_days ? ` ${membership.plan.duration_days} days` : ' month'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-gray-500">Started</label>
                          <p>
                            {membership.started_at 
                              ? formatDate(membership.started_at)
                              : 'Not started'
                            }
                          </p>
                        </div>
                        <div>
                          <label className="text-gray-500">Expires</label>
                          <p className={membership.status === 'expired' ? 'text-red-600' : ''}>
                            {membership.expires_at 
                              ? formatDate(membership.expires_at)
                              : 'No expiration'
                            }
                          </p>
                        </div>
                      </div>

                      {membership.plan?.description && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            {membership.plan.description}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common actions for managing this member
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="justify-start">
            <MessageCircle className="mr-2 h-4 w-4" />
            Send Message
          </Button>
          <Button variant="outline" className="justify-start">
            <CreditCard className="mr-2 h-4 w-4" />
            Add Membership
          </Button>
          <Button variant="outline" className="justify-start">
            <Clock className="mr-2 h-4 w-4" />
            View Activity Log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}