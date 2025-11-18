import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, SubscriptionStatus } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { Project } from '../project/entities/project.entity';
import { Member } from '../membership/entities/member.entity';
import { Membership, MembershipStatus } from '../membership/entities/membership.entity';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';

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
      payments,
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
      this.paymentRepository.find(),
    ]);

    const totalRevenue = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, payment) => sum + Number(payment.amount_mnt), 0);

    const successfulPayments = payments.filter(
      (p) => p.status === PaymentStatus.COMPLETED,
    ).length;

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
      total_payments: payments.length,
      successful_payments: successfulPayments,
    };
  }

  async getRevenueStats(days: number = 30): Promise<RevenueStats> {
    this.logger.log(`Fetching revenue statistics for last ${days} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paid_at >= :startDate', { startDate })
      .andWhere('payment.paid_at <= :endDate', { endDate })
      .getMany();

    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.amount_mnt),
      0,
    );

    // Monthly revenue (last 30 days)
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    const monthlyRevenue = payments
      .filter((p) => new Date(p.paid_at) >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount_mnt), 0);

    // Yearly revenue (last 365 days)
    const yearStart = new Date();
    yearStart.setDate(yearStart.getDate() - 365);
    const yearlyPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paid_at >= :yearStart', { yearStart })
      .getMany();
    const yearlyRevenue = yearlyPayments.reduce(
      (sum, p) => sum + Number(p.amount_mnt),
      0,
    );

    const averageTransaction =
      payments.length > 0 ? totalRevenue / payments.length : 0;

    // Payment trends by day
    const trendMap = new Map<string, { revenue: number; count: number }>();
    payments.forEach((payment) => {
      const date = new Date(payment.paid_at).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { revenue: 0, count: 0 };
      trendMap.set(date, {
        revenue: existing.revenue + Number(payment.amount_mnt),
        count: existing.count + 1,
      });
    });

    const paymentTrends = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        payment_count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      yearly_revenue: yearlyRevenue,
      average_transaction: Math.round(averageTransaction),
      payment_trends: paymentTrends,
    };
  }

  async getTenantActivity(limit: number = 10): Promise<TenantActivity[]> {
    this.logger.log(`Fetching tenant activity (limit: ${limit})`);

    const tenants = await this.tenantRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
    });

    const activities = await Promise.all(
      tenants.map(async (tenant) => {
        const [projects, members, payments] = await Promise.all([
          this.projectRepository.count({ where: { tenant_id: tenant.id } }),
          this.memberRepository.count({ where: { tenant_id: tenant.id } }),
          this.paymentRepository.find({
            where: { tenant_id: tenant.id, status: PaymentStatus.COMPLETED },
          }),
        ]);

        const totalRevenue = payments.reduce(
          (sum, p) => sum + Number(p.amount_mnt),
          0,
        );

        // Get last activity (most recent payment or membership)
        const lastPayment = await this.paymentRepository.findOne({
          where: { tenant_id: tenant.id },
          order: { paid_at: 'DESC' },
        });

        return {
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          company_name: tenant.company_name,
          subscription_tier: tenant.subscription_tier,
          subscription_status: tenant.subscription_status,
          total_projects: projects,
          total_members: members,
          total_revenue: totalRevenue,
          last_activity: lastPayment?.paid_at || tenant.updated_at,
          created_at: tenant.created_at,
        };
      }),
    );

    return activities.sort(
      (a, b) =>
        new Date(b.last_activity).getTime() -
        new Date(a.last_activity).getTime(),
    );
  }
}
