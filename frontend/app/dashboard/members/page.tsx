'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  Download,
  UserCheck,
  UserX,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Member, Membership } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);

  const membersPerPage = 20;

  useEffect(() => {
    const fetchMembersData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const membersResponse = await apiClient.getMembers({
          limit: membersPerPage,
          offset: (currentPage - 1) * membersPerPage,
          search: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          group_id: groupFilter === 'all' ? undefined : groupFilter,
        });

        setMembers(membersResponse.members);
        setTotalMembers(membersResponse.total);
      } catch (err: any) {
        console.error('Failed to fetch members data:', err);
        setError('Failed to load members data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembersData();
  }, [currentPage, searchQuery, statusFilter, groupFilter]);

  const getActiveMemberships = (member: Member) => {
    return member.memberships?.filter(m => m.status === 'active') || [];
  };

  const getMemberStatus = (member: Member) => {
    const activeMemberships = getActiveMemberships(member);
    if (activeMemberships.length > 0) return 'active';
    return 'inactive';
  };

  // Get unique groups from all members for filter
  const allGroups = Array.from(
    new Map(
      members.flatMap(m => m.memberships || [])
        .filter(ms => ms.group)
        .map(ms => [ms.group!.id, ms.group!])
    ).values()
  );

  const getMemberStatusBadge = (member: Member) => {
    const status = getMemberStatus(member);
    switch (status) {
      case 'active':
        return <Badge variant="success">Active Member</Badge>;
      case 'inactive':
        return <Badge variant="danger">Inactive</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const totalPages = Math.ceil(totalMembers / membersPerPage);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Members</h1>
            <p className="text-gray-600">Manage your community members</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error}
        </div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600">
            Manage your community members and their subscriptions
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => getMemberStatus(m) === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => getMemberStatus(m) === 'inactive').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allGroups.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search members by name, username, or Telegram ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {allGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({totalMembers})</CardTitle>
          <CardDescription>
            All members across your Telegram groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Members will appear here once they join your groups'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => {
                const activeMemberships = getActiveMemberships(member);
                const memberGroups = Array.from(
                  new Set(member.memberships?.filter(m => m.group).map(m => m.group!.group_name) || [])
                );

                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-blue-600 font-medium">
                          {member.first_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </p>
                          {member.username && (
                            <span className="text-xs text-gray-500">
                              @{member.username}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <p className="text-xs text-gray-500">
                            ID: {member.telegram_user_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            Joined: {new Date(member.created_at).toLocaleDateString()}
                          </p>
                          {activeMemberships.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {activeMemberships.length} active membership{activeMemberships.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        {memberGroups.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Groups:</span>
                            <div className="flex gap-1 flex-wrap">
                              {memberGroups.map((groupName, idx) => (
                                <Badge key={idx} variant="default">
                                  {groupName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      {getMemberStatusBadge(member)}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/members/${member.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Manage Memberships
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Send Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-700">
            Showing {(currentPage - 1) * membersPerPage + 1} to{' '}
            {Math.min(currentPage * membersPerPage, totalMembers)} of {totalMembers} members
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}