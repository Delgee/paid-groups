import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';
import {
  Membership,
  MembershipStatus,
} from '../membership/entities/membership.entity';
import { Member } from '../membership/entities/member.entity';
import { MembershipPlan } from '../membership-plan/entities/membership-plan.entity';
import { TelegramGroup } from '../telegram-groups/telegram-groups.entity';

export interface DashboardMetrics {
  active_members: number;
  total_revenue: number;
  monthly_revenue: number;
  churn_rate: number;
  trial_conversion_rate: number;
  top_performing_groups: GroupMetrics[];
}

export interface GroupMetrics {
  group_id: string;
  group_name: string;
  member_count: number;
  revenue: number;
  conversion_rate: number;
}

export interface RevenueMetrics {
  current_period: number;
  previous_period: number;
  growth_percentage: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  daily_revenue: DailyRevenue[];
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  transaction_count: number;
}

export interface MembershipMetrics {
  total_memberships: number;
  active_memberships: number;
  trial_memberships: number;
  expired_memberships: number;
  churn_rate: number;
  average_lifetime_value: number;
}

export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  averagePayment: number;
  revenueGrowth: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(MembershipPlan)
    private readonly membershipPlanRepository: Repository<MembershipPlan>,
    @InjectRepository(TelegramGroup)
    private readonly telegramGroupRepository: Repository<TelegramGroup>,
  ) {}

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Active members count
    const activeMembers = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
    });

    // Total revenue (all time)
    const totalRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    const totalRevenue = parseFloat(totalRevenueResult?.total || '0');

    // Monthly revenue (current month)
    const monthlyRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at >= :currentMonth', { currentMonth })
      .getRawOne();

    const monthlyRevenue = parseFloat(monthlyRevenueResult?.total || '0');

    // Churn rate
    const churnRate = await this.calculateChurnRate(tenantId);

    // Trial conversion rate
    const trialConversionRate =
      await this.calculateTrialConversionRate(tenantId);

    // Top performing groups
    const topPerformingGroups = await this.getTopPerformingGroups(tenantId, 5);

    return {
      active_members: activeMembers,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      churn_rate: churnRate,
      trial_conversion_rate: trialConversionRate,
      top_performing_groups: topPerformingGroups,
    };
  }

  /**
   * Get revenue metrics including MRR and ARR
   */
  async getRevenueMetrics(
    tenantId: string,
    days: number = 30,
  ): Promise<RevenueMetrics> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current period revenue
    const currentPeriodResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at >= :currentMonthStart', { currentMonthStart })
      .getRawOne();

    const currentPeriod = parseFloat(currentPeriodResult?.total || '0');

    // Previous period revenue
    const previousPeriodResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at >= :previousMonthStart', {
        previousMonthStart,
      })
      .andWhere('payment.paid_at <= :previousMonthEnd', { previousMonthEnd })
      .getRawOne();

    const previousPeriod = parseFloat(previousPeriodResult?.total || '0');

    // Growth percentage
    const growthPercentage =
      previousPeriod > 0
        ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
        : 0;

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = await this.calculateMRR(tenantId);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Daily revenue for the specified period
    const dailyRevenue = await this.getDailyRevenue(tenantId, days);

    return {
      current_period: currentPeriod,
      previous_period: previousPeriod,
      growth_percentage: growthPercentage,
      mrr,
      arr,
      daily_revenue: dailyRevenue,
    };
  }

  /**
   * Get membership metrics including churn rate
   */
  async getMembershipMetrics(tenantId: string): Promise<MembershipMetrics> {
    // Total memberships
    const totalMemberships = await this.membershipRepository.count({
      where: { tenant_id: tenantId },
    });

    // Active memberships
    const activeMemberships = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
    });

    // Trial memberships
    const trialMemberships = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.TRIAL,
      },
    });

    // Expired memberships
    const expiredMemberships = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.EXPIRED,
      },
    });

    // Churn rate
    const churnRate = await this.calculateChurnRate(tenantId);

    // Average lifetime value
    const averageLifetimeValue = await this.calculateAverageLTV(tenantId);

    return {
      total_memberships: totalMemberships,
      active_memberships: activeMemberships,
      trial_memberships: trialMemberships,
      expired_memberships: expiredMemberships,
      churn_rate: churnRate,
      average_lifetime_value: averageLifetimeValue,
    };
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(tenantId: string): Promise<PaymentStats> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total revenue (all completed payments)
    const totalRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    const totalRevenue = parseFloat(totalRevenueResult?.total || '0');

    // Total payments count
    const totalPayments = await this.paymentRepository.count({
      where: { tenant_id: tenantId },
    });

    // Completed payments
    const completedPayments = await this.paymentRepository.count({
      where: {
        tenant_id: tenantId,
        status: PaymentStatus.COMPLETED,
      },
    });

    // Pending payments
    const pendingPayments = await this.paymentRepository.count({
      where: {
        tenant_id: tenantId,
        status: PaymentStatus.PENDING,
      },
    });

    // Failed payments
    const failedPayments = await this.paymentRepository.count({
      where: {
        tenant_id: tenantId,
        status: PaymentStatus.FAILED,
      },
    });

    // Average payment amount
    const averagePaymentResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('AVG(payment.amount_mnt)', 'average')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    const averagePayment = parseFloat(averagePaymentResult?.average || '0');

    // Current month revenue
    const currentMonthRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at >= :currentMonth', { currentMonth })
      .getRawOne();

    const currentMonthRevenue = parseFloat(
      currentMonthRevenueResult?.total || '0',
    );

    // Previous month revenue
    const previousMonthRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_mnt)', 'total')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at >= :previousMonth', { previousMonth })
      .andWhere('payment.paid_at <= :previousMonthEnd', { previousMonthEnd })
      .getRawOne();

    const previousMonthRevenue = parseFloat(
      previousMonthRevenueResult?.total || '0',
    );

    // Revenue growth percentage
    const revenueGrowth =
      previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) *
          100
        : 0;

    return {
      totalRevenue,
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      averagePayment,
      revenueGrowth,
    };
  }

  /**
   * Calculate Monthly Recurring Revenue
   */
  private async calculateMRR(tenantId: string): Promise<number> {
    // Get all active memberships
    const activeMemberships = await this.membershipRepository.find({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['plan'],
    });

    let mrr = 0;

    for (const membership of activeMemberships) {
      if (membership.plan && membership.plan.price) {
        // Convert price to monthly recurring revenue based on duration
        const durationInDays = membership.plan.duration_days || 30;
        const monthlyValue = (membership.plan.price / durationInDays) * 30;
        mrr += monthlyValue;
      }
    }

    return mrr;
  }

  /**
   * Calculate churn rate (percentage of members who churned in the last 30 days)
   */
  private async calculateChurnRate(tenantId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Members at the start of the period
    const membersAtStart = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        created_at: LessThan(thirtyDaysAgo),
      },
    });

    if (membersAtStart === 0) {
      return 0;
    }

    // Members who churned in the last 30 days
    const churnedMembers = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.EXPIRED,
        expires_at: Between(thirtyDaysAgo, new Date()),
      },
    });

    return (churnedMembers / membersAtStart) * 100;
  }

  /**
   * Calculate trial conversion rate
   */
  private async calculateTrialConversionRate(
    tenantId: string,
  ): Promise<number> {
    // Total trial memberships created
    const totalTrials = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
      },
    });

    if (totalTrials === 0) {
      return 0;
    }

    // Trials that converted to paid
    const convertedTrials = await this.membershipRepository.count({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
    });

    return (convertedTrials / totalTrials) * 100;
  }

  /**
   * Calculate average customer lifetime value
   */
  private async calculateAverageLTV(tenantId: string): Promise<number> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('AVG(payment.amount_mnt)', 'average')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .getRawOne();

    return parseFloat(result?.average || '0');
  }

  /**
   * Get daily revenue for the specified number of days
   */
  private async getDailyRevenue(
    tenantId: string,
    days: number,
  ): Promise<DailyRevenue[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.paid_at)', 'date')
      .addSelect('SUM(payment.amount_mnt)', 'revenue')
      .addSelect('COUNT(*)', 'transaction_count')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paid_at >= :startDate', { startDate })
      .groupBy('DATE(payment.paid_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue || '0'),
      transaction_count: parseInt(row.transaction_count || '0', 10),
    }));
  }

  /**
   * Get top performing groups by revenue
   */
  private async getTopPerformingGroups(
    tenantId: string,
    limit: number = 5,
  ): Promise<GroupMetrics[]> {
    const results = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.membership', 'membership')
      .leftJoin('membership.group', 'group')
      .select('group.id', 'group_id')
      .addSelect('group.group_name', 'group_name')
      .addSelect('COUNT(DISTINCT membership.member_id)', 'member_count')
      .addSelect('SUM(payment.amount_mnt)', 'revenue')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('group.id IS NOT NULL')
      .groupBy('group.id')
      .addGroupBy('group.group_name')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      group_id: row.group_id,
      group_name: row.group_name || 'Unknown Group',
      member_count: parseInt(row.member_count || '0', 10),
      revenue: parseFloat(row.revenue || '0'),
      conversion_rate: 0, // TODO: Calculate actual conversion rate
    }));
  }
}
