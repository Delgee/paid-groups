import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, SubscriptionStatus } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { Project } from '../project/entities/project.entity';
import { Member } from '../membership/entities/member.entity';
import { Membership, MembershipStatus } from '../membership/entities/membership.entity';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';

// Constants for date calculations and limits
const DAYS_IN_MONTH = 30;
const DAYS_IN_YEAR = 365;
const DEFAULT_ACTIVITY_LIMIT = 10;
const MAX_ACTIVITY_LIMIT = 100;
const DEFAULT_REVENUE_DAYS = 30;
const MAX_REVENUE_DAYS = 365;

export interface SystemStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_projects: number;
  active_projects: number;
  total_members: number;
  total_memberships: number;
  active_memberships: number;
  total_revenue: number;
  total_payments: number;
  successful_payments: number;
}

export interface RevenueStats {
  total_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  average_transaction: number;
  payment_trends: Array<{
    date: string;
    revenue: number;
    payment_count: number;
  }>;
}

export interface TenantActivity {
  tenant_id: string;
  tenant_name: string;
  company_name: string;
  subscription_tier: string;
  subscription_status: string;
  total_projects: number;
  total_members: number;
  total_revenue: number;
  last_activity: Date;
  created_at: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async getSystemStats(): Promise<SystemStats> {
    this.logger.log('Fetching system-wide statistics');

    // Use aggregation queries to avoid loading all data into memory
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalProjects,
      activeProjects,
      totalMembers,
      totalMemberships,
      activeMemberships,
      totalPayments,
      successfulPayments,
      revenueResult,
    ] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({
        where: { subscription_status: SubscriptionStatus.ACTIVE },
      }),
      this.tenantRepository.count({
        where: { subscription_status: SubscriptionStatus.SUSPENDED },
      }),
      this.userRepository.count(),
      this.projectRepository.count(),
      this.projectRepository.count({ where: { is_active: true } }),
      this.memberRepository.count(),
      this.membershipRepository.count(),
      this.membershipRepository.count({ where: { status: MembershipStatus.ACTIVE } }),
      this.paymentRepository.count(),
      this.paymentRepository.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount_mnt), 0)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getRawOne(),
    ]);

    const totalRevenue = Number(revenueResult?.total || 0);

    return {
      total_tenants: totalTenants,
      active_tenants: activeTenants,
      suspended_tenants: suspendedTenants,
      total_users: totalUsers,
      total_projects: totalProjects,
      active_projects: activeProjects,
      total_members: totalMembers,
      total_memberships: totalMemberships,
      active_memberships: activeMemberships,
      total_revenue: totalRevenue,
      total_payments: totalPayments,
      successful_payments: successfulPayments,
    };
  }

  async getRevenueStats(days: number = DEFAULT_REVENUE_DAYS): Promise<RevenueStats> {
    this.logger.log(`Fetching revenue statistics for last ${days} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - DAYS_IN_MONTH);

    const yearStart = new Date();
    yearStart.setDate(yearStart.getDate() - DAYS_IN_YEAR);

    // Fetch all revenue data in parallel using aggregation
    const [totalRevenueResult, monthlyRevenueResult, yearlyRevenueResult, paymentCount, dailyTrends] = await Promise.all([
      // Total revenue for requested period
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount_mnt), 0)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.paid_at >= :startDate', { startDate })
        .andWhere('payment.paid_at <= :endDate', { endDate })
        .getRawOne(),

      // Monthly revenue (last 30 days)
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount_mnt), 0)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.paid_at >= :monthStart', { monthStart })
        .getRawOne(),

      // Yearly revenue (last 365 days)
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount_mnt), 0)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.paid_at >= :yearStart', { yearStart })
        .getRawOne(),

      // Payment count for average calculation
      this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.paid_at >= :startDate', { startDate })
        .andWhere('payment.paid_at <= :endDate', { endDate })
        .getCount(),

      // Daily trends using GROUP BY
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('DATE(payment.paid_at)', 'date')
        .addSelect('SUM(payment.amount_mnt)', 'revenue')
        .addSelect('COUNT(*)', 'payment_count')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .andWhere('payment.paid_at >= :startDate', { startDate })
        .andWhere('payment.paid_at <= :endDate', { endDate })
        .groupBy('DATE(payment.paid_at)')
        .orderBy('DATE(payment.paid_at)', 'ASC')
        .getRawMany(),
    ]);

    const totalRevenue = Number(totalRevenueResult?.total || 0);
    const monthlyRevenue = Number(monthlyRevenueResult?.total || 0);
    const yearlyRevenue = Number(yearlyRevenueResult?.total || 0);
    const averageTransaction = paymentCount > 0 ? Math.round(totalRevenue / paymentCount) : 0;

    const paymentTrends = dailyTrends.map((trend) => ({
      date: trend.date,
      revenue: Number(trend.revenue),
      payment_count: Number(trend.payment_count),
    }));

    return {
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      yearly_revenue: yearlyRevenue,
      average_transaction: averageTransaction,
      payment_trends: paymentTrends,
    };
  }

  async getTenantActivity(limit: number = DEFAULT_ACTIVITY_LIMIT): Promise<TenantActivity[]> {
    this.logger.log(`Fetching tenant activity (limit: ${limit})`);

    // Cap the limit to prevent excessive queries
    const cappedLimit = Math.min(limit, MAX_ACTIVITY_LIMIT);

    const tenants = await this.tenantRepository.find({
      order: { created_at: 'DESC' },
      take: cappedLimit,
    });

    if (tenants.length === 0) {
      return [];
    }

    const tenantIds = tenants.map(t => t.id);

    // Fetch all data in parallel with optimized queries to avoid N+1 problem
    const [projectCounts, memberCounts, revenueSums, lastActivities] = await Promise.all([
      // Get project counts for all tenants in one query
      this.projectRepository
        .createQueryBuilder('project')
        .select('project.tenant_id', 'tenant_id')
        .addSelect('COUNT(*)', 'count')
        .where('project.tenant_id IN (:...tenantIds)', { tenantIds })
        .groupBy('project.tenant_id')
        .getRawMany(),

      // Get member counts for all tenants in one query
      this.memberRepository
        .createQueryBuilder('member')
        .select('member.tenant_id', 'tenant_id')
        .addSelect('COUNT(*)', 'count')
        .where('member.tenant_id IN (:...tenantIds)', { tenantIds })
        .groupBy('member.tenant_id')
        .getRawMany(),

      // Get revenue sums for all tenants in one query
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.tenant_id', 'tenant_id')
        .addSelect('COALESCE(SUM(payment.amount_mnt), 0)', 'total')
        .where('payment.tenant_id IN (:...tenantIds)', { tenantIds })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .groupBy('payment.tenant_id')
        .getRawMany(),

      // Get last payment date for all tenants in one query
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.tenant_id', 'tenant_id')
        .addSelect('MAX(payment.paid_at)', 'last_paid_at')
        .where('payment.tenant_id IN (:...tenantIds)', { tenantIds })
        .groupBy('payment.tenant_id')
        .getRawMany(),
    ]);

    // Create lookup maps for O(1) access
    const projectCountMap = new Map(projectCounts.map(p => [p.tenant_id, Number(p.count)]));
    const memberCountMap = new Map(memberCounts.map(m => [m.tenant_id, Number(m.count)]));
    const revenueMap = new Map(revenueSums.map(r => [r.tenant_id, Number(r.total)]));
    const lastActivityMap = new Map(lastActivities.map(a => [a.tenant_id, a.last_paid_at]));

    // Map tenants to activity records
    const activities = tenants.map((tenant) => ({
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      company_name: tenant.company_name,
      subscription_tier: tenant.subscription_tier,
      subscription_status: tenant.subscription_status,
      total_projects: projectCountMap.get(tenant.id) || 0,
      total_members: memberCountMap.get(tenant.id) || 0,
      total_revenue: revenueMap.get(tenant.id) || 0,
      last_activity: lastActivityMap.get(tenant.id) || tenant.updated_at,
      created_at: tenant.created_at,
    }));

    // Sort by last activity
    return activities.sort(
      (a, b) =>
        new Date(b.last_activity).getTime() -
        new Date(a.last_activity).getTime(),
    );
  }
}
