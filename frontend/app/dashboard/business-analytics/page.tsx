'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { mn } from '@/lib/translations/mn';

const t = mn.businessAnalytics;

// Exchange rate: 1 USD = 3,425 MNT
const EXCHANGE_RATE = 3425;

// Market Data
const marketData = {
  population: 3530000,
  internetUsers: 2930000,
  socialMediaUsers: 2700000,
  qpayUsers: 3200000,
  telegramGlobal: 1000000000,
  potentialCustomers: 12500, // mid-point of 10K-15K
};

const marketPenetrationData = [
  { name: 'Нийт хүн ам', value: 3530000, percentage: 100, color: '#94a3b8' },
  { name: 'Интернет', value: 2930000, percentage: 83, color: '#60a5fa' },
  { name: 'Сошиал медиа', value: 2700000, percentage: 76.5, color: '#34d399' },
  { name: 'QPay', value: 3200000, percentage: 90, color: '#fbbf24' },
];

// Financial Projections (in MNT)
const revenueProjections = [
  {
    year: '1-р жил',
    conservative: 177756750, // $51,900
    optimistic: 445250000, // $130,000
    costs: 132878700, // $38,808
    customers: 200,
  },
  {
    year: '2-р жил',
    conservative: 739800000, // $216,000
    optimistic: 1183620000, // $345,600
    costs: 205500000, // $60,000
    customers: 500,
  },
  {
    year: '3-р жил',
    conservative: 1479600000, // $432,000
    optimistic: 2219400000, // $648,000
    costs: 411000000, // $120,000
    customers: 1000,
  },
];

// Customer Growth
const customerGrowthData = [
  { month: '1-р сар', customers: 10, mrr: 1233750 },
  { month: '2-р сар', customers: 25, mrr: 3084375 },
  { month: '3-р сар', customers: 40, mrr: 4935000 },
  { month: '4-р сар', customers: 55, mrr: 6785625 },
  { month: '5-р сар', customers: 70, mrr: 8636250 },
  { month: '6-р сар', customers: 100, mrr: 12337500 },
  { month: '7-р сар', customers: 125, mrr: 15421875 },
  { month: '8-р сар', customers: 150, mrr: 18506250 },
  { month: '9-р сар', customers: 175, mrr: 21590625 },
  { month: '10-р сар', customers: 200, mrr: 24675000 },
  { month: '11-р сар', customers: 225, mrr: 27759375 },
  { month: '12-р сар', customers: 250, mrr: 30843750 },
];

// Cost Breakdown (Monthly, in MNT)
const costBreakdownData = [
  { name: 'Дэд бүтэц', value: 2518500, percentage: 23.2, color: '#3b82f6' },
  { name: 'Баг', value: 6850000, percentage: 63.2, color: '#8b5cf6' },
  { name: 'Маркетинг', value: 685000, percentage: 6.3, color: '#ec4899' },
  { name: 'Үйл ажиллагаа', value: 785250, percentage: 7.3, color: '#14b8a6' },
];

// Pricing Plans (in MNT)
const pricingPlans = [
  {
    name: 'Үнэгүй',
    price: 0,
    features: ['1 бот', '5 бүлэг', '1K гишүүн'],
    color: '#94a3b8',
  },
  {
    name: 'Анхлан',
    price: 65075, // $19
    features: ['3 бот', '15 бүлэг', '10K гишүүн'],
    color: '#60a5fa',
  },
  {
    name: 'Мэргэжлийн',
    price: 167825, // $49
    features: ['10 бот', '50 бүлэг', '50K гишүүн'],
    color: '#8b5cf6',
  },
  {
    name: 'Байгууллага',
    price: 339075, // $99
    features: ['Хязгааргүй', 'White-label', 'Давуу дэмжлэг'],
    color: '#ec4899',
  },
];

// Competitor Comparison
const competitorData = [
  { name: 'Манай платформ', score: 95, features: 8, price: 65075 },
  { name: 'InviteMember', score: 75, features: 6, price: 0 },
  { name: 'TGmembership', score: 70, features: 5, price: 0 },
  { name: 'MyMembers', score: 65, features: 5, price: 0 },
  { name: 'Patreon', score: 60, features: 7, price: 137063 },
];

// Unit Economics
const unitEconomics = {
  ltv: 1678250, // $490
  cac: 256875, // $75
  ratio: 6.5,
  payback: 1.5,
  grossMargin: 88,
};

// Break-even Analysis
const breakEvenData = [
  { customers: 0, revenue: 0, costs: 3234000, profit: -3234000 },
  { customers: 30, revenue: 3701250, costs: 3234000, profit: 467250 },
  { customers: 60, revenue: 7402500, costs: 3234000, profit: 4168500 },
  { customers: 90, revenue: 11103750, costs: 3234000, profit: 7869750 },
  { customers: 120, revenue: 14805000, costs: 3234000, profit: 11571000 },
  { customers: 150, revenue: 18506250, costs: 3234000, profit: 15272250 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

// Format large numbers in Mongolian style
const formatMNT = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} тэрбум ₮`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} сая ₮`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} мянга ₮`;
  }
  return `${value.toLocaleString('mn-MN')} ₮`;
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString('mn-MN');
};

export default function BusinessAnalyticsPage() {
  const [scenario, setScenario] = useState<'conservative' | 'optimistic'>('conservative');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Зах зээлийн хэмжээ</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10-15K</div>
            <p className="text-xs text-muted-foreground">Боломжит хэрэглэгчид</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">3-р жилийн орлого</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMNT(1479600000)}</div>
            <p className="text-xs text-muted-foreground">1,000 хэрэглэгчтэй</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Тэнцэх цэг</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6-9 сар</div>
            <p className="text-xs text-muted-foreground">90 хэрэглэгчтэй</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ашгийн хувь</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72%</div>
            <p className="text-xs text-muted-foreground">Цар хүрээнд EBITDA</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t.tabs.overview}</TabsTrigger>
          <TabsTrigger value="market">{t.tabs.market}</TabsTrigger>
          <TabsTrigger value="financial">{t.tabs.financial}</TabsTrigger>
          <TabsTrigger value="competition">{t.tabs.competition}</TabsTrigger>
          <TabsTrigger value="roi">{t.roi.title}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Projections */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t.charts.revenueGrowth}</CardTitle>
                  <CardDescription>3 жилийн санхүүгийн төсөөлөл</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={scenario === 'conservative' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setScenario('conservative')}
                  >
                    Консерватив
                  </Badge>
                  <Badge
                    variant={scenario === 'optimistic' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setScenario('optimistic')}
                  >
                    Өөдрөг
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueProjections}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatMNT(value)} />
                  <Tooltip
                    formatter={(value: number) => formatMNT(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey={scenario}
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Орлого"
                  />
                  <Area
                    type="monotone"
                    dataKey="costs"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorCost)"
                    name="Зардал"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Customer Growth */}
          <Card>
            <CardHeader>
              <CardTitle>{t.charts.customerGrowth}</CardTitle>
              <CardDescription>Эхний жилийн хэрэглэгчдийн өсөлт болон сарын орлого</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={customerGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatMNT(value)} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'Сарын орлого' ? formatMNT(value) : value
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="customers"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Хэрэглэгчид"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="mrr"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Сарын орлого"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Break-even Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Тэнцэх цэгийн шинжилгээ</CardTitle>
              <CardDescription>90 хэрэглэгчтэй ашигт болно (6-9 сар)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={breakEvenData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="customers" label={{ value: 'Хэрэглэгчид', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(value) => formatMNT(value)} />
                  <Tooltip formatter={(value: number) => formatMNT(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Орлого" />
                  <Line type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={2} name="Зардал" />
                  <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} name="Ашиг" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Tab */}
        <TabsContent value="market" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Market Size */}
            <Card>
              <CardHeader>
                <CardTitle>{t.market.title}</CardTitle>
                <CardDescription>Монголын дижитал зах зээл</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marketPenetrationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                    <Bar dataKey="value" name="Хэрэглэгчид">
                      {marketPenetrationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Market Penetration */}
            <Card>
              <CardHeader>
                <CardTitle>Нэвтрэлтийн хувь</CardTitle>
                <CardDescription>Монголын хүн амд эзлэх хувь</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={marketPenetrationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {marketPenetrationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Market Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Зах зээлийн статистик</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.market.totalPopulation}</p>
                  <p className="text-2xl font-bold">{t.market.statistics.population}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.market.internetUsers}</p>
                  <p className="text-2xl font-bold">{t.market.statistics.internet}</p>
                  <Badge variant="secondary">83% нэвтрэлт</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.market.socialMediaUsers}</p>
                  <p className="text-2xl font-bold">{t.market.statistics.socialMedia}</p>
                  <Badge variant="secondary">76.5% нэвтрэлт</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.market.qpayUsers}</p>
                  <p className="text-2xl font-bold">{t.market.statistics.qpay}</p>
                  <Badge variant="secondary">90%+ нэвтрэлт</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.market.potentialCustomers}</p>
                  <p className="text-2xl font-bold">{t.market.statistics.potential}</p>
                  <Badge variant="default">Зорилтот зах зээл</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.market.telegramUsers}</p>
                  <p className="text-2xl font-bold">{t.market.statistics.telegram}</p>
                  <Badge variant="secondary">Дэлхийн хэмжээнд</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          {/* Cost Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t.financial.breakdown.title}</CardTitle>
                <CardDescription>Сарын үйл ажиллагааны зардал</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMNT(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pricing Plans */}
            <Card>
              <CardHeader>
                <CardTitle>{t.pricing.title}</CardTitle>
                <CardDescription>Сарын хураамж</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pricingPlans.map((plan, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">{plan.features.join(', ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatMNT(plan.price)}</p>
                        <p className="text-xs text-muted-foreground">/сар</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Unit Economics */}
          <Card>
            <CardHeader>
              <CardTitle>{t.unitEconomics.title}</CardTitle>
              <CardDescription>Нэг хэрэглэгчийн эдийн засаг</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{t.unitEconomics.ltv}</p>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{formatMNT(unitEconomics.ltv)}</p>
                  <Badge variant="outline" className="bg-green-50">
                    {t.unitEconomics.excellent}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{t.unitEconomics.cac}</p>
                    <TrendingDown className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold">{formatMNT(unitEconomics.cac)}</p>
                  <Badge variant="outline" className="bg-orange-50">
                    Зорилтот
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{t.unitEconomics.ratio}</p>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{unitEconomics.ratio}x</p>
                  <Badge variant="outline" className="bg-green-50">
                    {t.unitEconomics.healthy} (зорилт: 3:1)
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.unitEconomics.payback}</p>
                  <p className="text-2xl font-bold">{unitEconomics.payback} сар</p>
                  <Badge variant="outline" className="bg-green-50">
                    {t.unitEconomics.excellent}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t.unitEconomics.grossMargin}</p>
                  <p className="text-2xl font-bold">{unitEconomics.grossMargin}%</p>
                  <Badge variant="outline" className="bg-green-50">
                    Өндөр (SaaS дундаж: 70-80%)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3-Year Projections Table */}
          <Card>
            <CardHeader>
              <CardTitle>3 жилийн санхүүгийн төсөөлөл</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Үзүүлэлт</th>
                      <th className="text-right p-2">1-р жил</th>
                      <th className="text-right p-2">2-р жил</th>
                      <th className="text-right p-2">3-р жил</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Хэрэглэгчид</td>
                      <td className="text-right p-2">200</td>
                      <td className="text-right p-2">500</td>
                      <td className="text-right p-2">1,000</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Орлого</td>
                      <td className="text-right p-2">{formatMNT(177756750)}</td>
                      <td className="text-right p-2">{formatMNT(739800000)}</td>
                      <td className="text-right p-2">{formatMNT(1479600000)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Зардал</td>
                      <td className="text-right p-2">{formatMNT(132878700)}</td>
                      <td className="text-right p-2">{formatMNT(205500000)}</td>
                      <td className="text-right p-2">{formatMNT(411000000)}</td>
                    </tr>
                    <tr className="border-b bg-green-50">
                      <td className="p-2 font-bold">Ашиг</td>
                      <td className="text-right p-2 font-bold">{formatMNT(44878050)}</td>
                      <td className="text-right p-2 font-bold">{formatMNT(534300000)}</td>
                      <td className="text-right p-2 font-bold">{formatMNT(1068600000)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Ашгийн хувь</td>
                      <td className="text-right p-2">25%</td>
                      <td className="text-right p-2">72%</td>
                      <td className="text-right p-2">72%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competition Tab */}
        <TabsContent value="competition" className="space-y-4">
          {/* Competitor Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>{t.competition.title}</CardTitle>
              <CardDescription>Онооны харьцуулалт (100 дээр тооцсон)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={competitorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8b5cf6" name="Нийт оноо" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Our Advantages */}
          <Card>
            <CardHeader>
              <CardTitle>{t.competition.advantages}</CardTitle>
              <CardDescription>Яагаад бид ялах вэ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Орон нутгийн төлбөр</p>
                    <p className="text-sm text-muted-foreground">
                      QPay интеграци (3.2 сая хэрэглэгч, 99.9% амжилт)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Орон нутгийн мөнгөн тэмдэгт</p>
                    <p className="text-sm text-muted-foreground">
                      MNT дэмжлэг (валют солилцооны хураамжгүй)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Иж бүрэн шийдэл</p>
                    <p className="text-sm text-muted-foreground">
                      Бүртгэл → Төлбөр → Удирдлага (эцээс төгсгөл)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Олон төсөл</p>
                    <p className="text-sm text-muted-foreground">
                      Нэг данс, олон бот/бүлэг удирдах
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Бот дээр суурилсан</p>
                    <p className="text-sm text-muted-foreground">
                      Telegram-д шууд, хялбар хэрэглээ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Байгууллагын түвшин</p>
                    <p className="text-sm text-muted-foreground">
                      Multi-tenant, audit logging, analytics
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Position */}
          <Card>
            <CardHeader>
              <CardTitle>Зах зээл дээрх байр суурь</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
                  <p className="font-semibold text-lg">
                    "Монгол дахь Telegram контент бүтээгчдэд зориулсан Shopify"
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Анхны давуу тал, орон нутгийн төлбөрийн шийдэл, байгууллагын түвшний аюулгүй байдал
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Tab */}
        <TabsContent value="roi" className="space-y-4">
          {/* Investment Options */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bootstrap Option */}
            <Card className="border-2 border-green-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t.roi.bootstrap.title}</CardTitle>
                  <Badge variant="default" className="bg-green-600">
                    Зөвлөмж
                  </Badge>
                </div>
                <CardDescription>Бага хөрөнгө оруулалт, өндөр өгөөж</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t.roi.investment}</p>
                  <p className="text-2xl font-bold">{t.roi.bootstrap.investment}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.roi.breakEven}</p>
                  <p className="text-xl font-semibold">{t.roi.bootstrap.breakEven}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">3-р жилийн ашиг</p>
                  <p className="text-xl font-semibold">{t.roi.bootstrap.year3Profit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.roi.exitValue}</p>
                  <p className="text-xl font-semibold">{t.roi.bootstrap.exitValue}</p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{t.roi.returnMultiple}</p>
                  <p className="text-3xl font-bold text-green-600">{t.roi.bootstrap.multiple}</p>
                </div>
              </CardContent>
            </Card>

            {/* Funded Option */}
            <Card>
              <CardHeader>
                <CardTitle>{t.roi.funded.title}</CardTitle>
                <CardDescription>Хурдан өсөлт, багийн өргөтгөл</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t.roi.investment}</p>
                  <p className="text-2xl font-bold">{t.roi.funded.investment}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.roi.breakEven}</p>
                  <p className="text-xl font-semibold">{t.roi.funded.breakEven}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">3-р жилийн ашиг</p>
                  <p className="text-xl font-semibold">{t.roi.funded.year3Profit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.roi.exitValue}</p>
                  <p className="text-xl font-semibold">{t.roi.funded.exitValue}</p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{t.roi.returnMultiple}</p>
                  <p className="text-3xl font-bold text-purple-600">{t.roi.funded.multiple}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <CardTitle>{t.recommendations.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t.recommendations.decision}</p>
                <Badge className="text-lg px-4 py-2 bg-green-600">✅ {t.recommendations.go} - BOOTSTRAP АРГА</Badge>
              </div>
              <div>
                <p className="font-semibold mb-2">{t.recommendations.reasoning}:</p>
                <ul className="space-y-2">
                  {t.recommendations.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Хөгжлийн хуваарь</CardTitle>
              <CardDescription>18 сарын төлөвлөгөө</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 text-green-700 rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold">Сар 1-3: Бета ашиллуулалт</p>
                    <p className="text-sm text-muted-foreground">
                      25 төлбөрт хэрэглэгч, үнэгүй PRO tier санал, анхны хэрэглэгчдийн санал хүсэлт цуглуулах
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold">Сар 4-6: Олон нийтийн ашиллуулалт</p>
                    <p className="text-sm text-muted-foreground">
                      75 төлбөрт хэрэглэгч, маркетинг кампанит ажил эхлүүлэх, CAC оновчлох
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 text-purple-700 rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold">Сар 7-9: Тэнцэл цэг</p>
                    <p className="text-sm text-muted-foreground">
                      90+ төлбөрт хэрэглэгч, ашигт болох, өсөлтөд анхаарах
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 text-orange-700 rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-semibold">Сар 10-12: Өсөлт</p>
                    <p className="text-sm text-muted-foreground">
                      200 төлбөрт хэрэглэгч, сарын орлого 24.7 сая ₮, 25% ашгийн хувь
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 text-pink-700 rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                    5
                  </div>
                  <div>
                    <p className="font-semibold">2-3-р жил: Цар хүрээ</p>
                    <p className="text-sm text-muted-foreground">
                      500-1,000 хэрэглэгч, 72% ашгийн хувь, 3-5 жилд гарах стратеги
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
