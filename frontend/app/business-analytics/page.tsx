'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Star,
  Award,
  Calculator,
} from 'lucide-react';

// Pricing Model Calculations
// Assuming average tenant makes 10M MNT/month from their paid groups

const AVERAGE_TENANT_REVENUE = 10000000; // 10M MNT/month per tenant
const AVERAGE_TENANT_PROFIT = AVERAGE_TENANT_REVENUE * 0.7; // 70% profit margin for tenants

// Pricing Models
const pricingModels = [
  {
    name: 'Тогтмол төлбөр',
    nameEn: 'Fixed Fee Only',
    description: 'Зөвх�� сарын тогтмол хураамж',
    monthlyFee: 100000, // 100K MNT/month
    commissionRate: 0,
    color: '#3b82f6',
    pros: [
      'Тодорхой, таамаглах боломжтой орлого',
      'Хялбар ойлгогдох үнэ',
      'Том tenant-үүд илүү их төлнө',
    ],
    cons: [
      'Бага орлоготой tenant-үүдэд үнэтэй',
      'Платформын амжилттай холбогдохгүй',
      'Өсөлтийн хязгаарлагдмал боломж',
    ],
  },
  {
    name: 'Хувь хураамж',
    nameEn: 'Commission Only',
    description: 'Зөвхөн tenant-ийн ашгаас хувь',
    monthlyFee: 0,
    commissionRate: 0.10, // 10% of profit
    color: '#8b5cf6',
    pros: [
      'Tenant амжилттай үед л төлнө',
      'Платформын өсөлттэй холбогдсон',
      'Эхлэгчдэд хялбар эхлэх',
    ],
    cons: [
      'Таамаглах боломжгүй орлого',
      'Том хувь хураамж шаардагдана (15-20%)',
      'Tenant-ийн орлогыг хянах шаардлагатай',
    ],
  },
  {
    name: 'Холимог загвар (Сонгосон)',
    nameEn: 'Hybrid Model (Recommended)',
    description: 'Бага тогтмол төлбөр + бага хувь',
    monthlyFee: 50000, // 50K MNT/month
    commissionRate: 0.05, // 5% of profit
    color: '#10b981',
    pros: [
      'Таамаглах боломжтой үндсэн орлого',
      'Өсөлтийн боломжтой нэмэлт орлого',
      'Tenant болон платформд ашигтай',
      'Өрсөлдөөнт үнэ',
    ],
    cons: [
      'Арай илүү төвөгтэй ойлгоход',
      'Хоёр төрлийн төлбөрийн систем',
    ],
  },
  {
    name: 'Түвшин дээр суурилсан',
    nameEn: 'Tiered Model',
    description: 'Орлогын түвшинээр өөр өөр хувь',
    monthlyFee: 30000, // 30K MNT/month base
    commissionRate: 0, // Variable by tier
    tiers: [
      { max: 5000000, rate: 0.08, name: '< 5M: 8%' },
      { max: 15000000, rate: 0.06, name: '5-15M: 6%' },
      { max: Infinity, rate: 0.04, name: '> 15M: 4%' },
    ],
    color: '#f59e0b',
    pros: [
      'Шударга - том үйлчлүүлэгч бага хувь төлнө',
      'Өсөлтийг урамшуулна',
      'Өрсөлдөөнт том tenant-үүдэд',
    ],
    cons: [
      'Хамгийн төвөгтэй тооцоолол',
      'Шилжих цэгүүд маргаантай байж болно',
    ],
  },
];

// Calculate revenue for each model
const calculateModelRevenue = (model: any, tenantsCount: number, avgTenantProfit: number) => {
  let revenue = model.monthlyFee * tenantsCount;

  if (model.tiers) {
    // Tiered calculation - simplified average
    const avgCommission = model.tiers.reduce((sum: number, tier: any) => sum + tier.rate, 0) / model.tiers.length;
    revenue += avgTenantProfit * tenantsCount * avgCommission;
  } else if (model.commissionRate > 0) {
    revenue += avgTenantProfit * tenantsCount * model.commissionRate;
  }

  return revenue;
};

// 3-year projections for each model
const generateProjections = () => {
  const years = [
    { year: '1-р жил', tenants: 200 },
    { year: '2-р жил', tenants: 500 },
    { year: '3-р жил', tenants: 1000 },
  ];

  return pricingModels.map((model) => ({
    name: model.name,
    nameEn: model.nameEn,
    color: model.color,
    projections: years.map((y) => ({
      year: y.year,
      tenants: y.tenants,
      revenue: calculateModelRevenue(model, y.tenants, AVERAGE_TENANT_PROFIT),
    })),
  }));
};

const projections = generateProjections();

// Comparison data for radar chart
const comparisonData = [
  {
    metric: 'Tenant-д ээлтэй',
    'Тогтмол төлбөр': 60,
    'Хувь хураамж': 80,
    'Холимог загвар': 95,
    'Түвшин дээр': 85,
  },
  {
    metric: 'Таамаглагдах орлого',
    'Тогтмол төлбөр': 100,
    'Хувь хураамж': 40,
    'Холимог загвар': 85,
    'Түвшин дээр': 70,
  },
  {
    metric: 'Өсөлтийн боломж',
    'Тогтмол төлбөр': 50,
    'Хувь хураамж': 90,
    'Холимог загвар': 85,
    'Түвшин дээр': 95,
  },
  {
    metric: 'Хялбар ойлгох',
    'Тогтмол төлбөр': 100,
    'Хувь хураамж': 90,
    'Холимог загвар': 75,
    'Түвшин дээр': 60,
  },
  {
    metric: 'Өрсөлдөөн чадвар',
    'Тогтмол төлбөр': 65,
    'Хувь хураамж': 75,
    'Холимог загвар': 90,
    'Түвшин дээр': 80,
  },
];

// Format MNT
const formatMNT = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} тэрбум ₮`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} сая ₮`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} мянга ₮`;
  }
  return `${value.toLocaleString('mn-MN')} ₮`;
};

export default function PublicBusinessAnalyticsPage() {
  const [selectedModel, setSelectedModel] = useState(pricingModels[2]); // Hybrid model default

  const selectedProjection = projections.find((p) => p.name === selectedModel.name);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              Бизнесийн шинжилгээ 2025
            </Badge>
            <h1 className="text-5xl font-bold mb-6">
              Telegram Группийн SaaS Платформ
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Монголын зах зээлд анхны Telegram контент мөнгөжүүлэх платформ.
              <br />
              Оновчтой үнийн загвар сонголт ба санхүүгийн шинжилгээ.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Үнийн загвар үзэх
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Таамаглал үзэх
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Зорилтот зах зээл
                  </CardTitle>
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">10-15K</div>
                <p className="text-xs text-muted-foreground mt-1">Монголд боломжит tenant-үүд</p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Сонгосон загвар
                  </CardTitle>
                  <Star className="h-5 w-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">Холимог</div>
                <p className="text-xs text-muted-foreground mt-1">50K/сар + 5% ашгаас</p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    3-р жилийн орлого
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">400 сая ₮</div>
                <p className="text-xs text-muted-foreground mt-1">1,000 tenant-тэй</p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ашгийн хувь
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">70%+</div>
                <p className="text-xs text-muted-foreground mt-1">Цар хүрээнд EBITDA</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Models Comparison */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Үнийн загварын харьцуулалт</h2>
              <p className="text-xl text-muted-foreground">
                4 өөр үнийн загварыг дүн шинжилгээ хийж оновчтой сонголтыг тогтоолоо
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-12">
              {pricingModels.map((model, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedModel.name === model.name
                      ? 'ring-2 ring-offset-2 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    borderTop: `4px solid ${model.color}`,
                  }}
                  onClick={() => setSelectedModel(model)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{model.name}</CardTitle>
                        <CardDescription className="mt-1">{model.description}</CardDescription>
                      </div>
                      {selectedModel.name === model.name && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Сонгосон
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold" style={{ color: model.color }}>
                        {formatMNT(model.monthlyFee)}
                      </span>
                      <span className="text-muted-foreground">/сар</span>
                      {model.commissionRate > 0 && (
                        <span className="text-lg font-semibold text-muted-foreground">
                          + {(model.commissionRate * 100).toFixed(0)}% ашгаас
                        </span>
                      )}
                    </div>

                    {model.tiers && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Түвшнүүд:</p>
                        {model.tiers.map((tier: any, i: number) => (
                          <p key={i} className="text-sm text-muted-foreground">
                            • {tier.name}
                          </p>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">✓ Давуу тал:</p>
                      <ul className="space-y-1">
                        {model.pros.map((pro: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {pro}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">✗ Сул тал:</p>
                      <ul className="space-y-1">
                        {model.cons.map((con: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Model Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Загварын харьцуулалт (5 шалгуур)</CardTitle>
                <CardDescription>Өндөр оноо = илүү сайн</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={comparisonData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Тогтмол төлбөр"
                      dataKey="Тогтмол төлбөр"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Хувь хураамж"
                      dataKey="Хувь хураамж"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Холимог загвар"
                      dataKey="Холимог загвар"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.5}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Түвшин дээр"
                      dataKey="Түвшин дээр"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Revenue Projections */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">3 жилийн орлогын төсөөлөл</h2>
              <p className="text-xl text-muted-foreground">
                Бүх 4 үнийн загварын орлогын харьцуулалт
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Орлогын өсөлт загвар бүрээр</CardTitle>
                <CardDescription>
                  Таамаглал: Дундаж tenant сард 7 сая ₮ ашиг олно (10 сая ₮ орлого × 70% ашиг)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={[
                      {
                        year: '1-р жил (200 tenant)',
                        'Тогтмол төлбөр': calculateModelRevenue(pricingModels[0], 200, AVERAGE_TENANT_PROFIT),
                        'Хувь хураамж': calculateModelRevenue(pricingModels[1], 200, AVERAGE_TENANT_PROFIT),
                        'Холимог загвар': calculateModelRevenue(pricingModels[2], 200, AVERAGE_TENANT_PROFIT),
                        'Түвшин дээр': calculateModelRevenue(pricingModels[3], 200, AVERAGE_TENANT_PROFIT),
                      },
                      {
                        year: '2-р жил (500 tenant)',
                        'Тогтмол төлбөр': calculateModelRevenue(pricingModels[0], 500, AVERAGE_TENANT_PROFIT),
                        'Хувь хураамж': calculateModelRevenue(pricingModels[1], 500, AVERAGE_TENANT_PROFIT),
                        'Холимог загвар': calculateModelRevenue(pricingModels[2], 500, AVERAGE_TENANT_PROFIT),
                        'Түвшин дээр': calculateModelRevenue(pricingModels[3], 500, AVERAGE_TENANT_PROFIT),
                      },
                      {
                        year: '3-р жил (1000 tenant)',
                        'Тогтмол төлбөр': calculateModelRevenue(pricingModels[0], 1000, AVERAGE_TENANT_PROFIT),
                        'Хувь хураамж': calculateModelRevenue(pricingModels[1], 1000, AVERAGE_TENANT_PROFIT),
                        'Холимог загвар': calculateModelRevenue(pricingModels[2], 1000, AVERAGE_TENANT_PROFIT),
                        'Түвшин дээр': calculateModelRevenue(pricingModels[3], 1000, AVERAGE_TENANT_PROFIT),
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatMNT(value)} />
                    <Tooltip formatter={(value: number) => formatMNT(value)} />
                    <Legend />
                    <Bar dataKey="Тогтмол төлбөр" fill="#3b82f6" />
                    <Bar dataKey="Хувь хураамж" fill="#8b5cf6" />
                    <Bar dataKey="Холимог загвар" fill="#10b981" />
                    <Bar dataKey="Түвшин дээр" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Selected Model Details */}
            {selectedProjection && (
              <Card className="border-t-4" style={{ borderTopColor: selectedModel.color }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-6 w-6" style={{ color: selectedModel.color }} />
                    {selectedModel.name} - Дэлгэрэнгүй төсөөлөл
                  </CardTitle>
                  <CardDescription>{selectedModel.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Жил</th>
                          <th className="text-right p-3">Tenant тоо</th>
                          <th className="text-right p-3">Сарын орлого (MRR)</th>
                          <th className="text-right p-3">Жилийн орлого (ARR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProjection.projections.map((proj, index) => (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3 font-medium">{proj.year}</td>
                            <td className="text-right p-3">{proj.tenants.toLocaleString('mn-MN')}</td>
                            <td className="text-right p-3 font-semibold" style={{ color: selectedModel.color }}>
                              {formatMNT(proj.revenue)}
                            </td>
                            <td className="text-right p-3 font-bold">
                              {formatMNT(proj.revenue * 12)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Why Hybrid Model */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
                <Star className="h-3 w-3 mr-1" />
                Зөвлөмж
              </Badge>
              <h2 className="text-4xl font-bold mb-4">Яагаад холимог загварыг сонгосон бэ?</h2>
              <p className="text-xl text-muted-foreground">
                Тэнцвэртэй, шударга, өсөлттэй хамтран ажиллах загвар
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Tenant-үүдэд ашигтай
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Бага тогтмол төлбөр (50K ₮/сар):</strong> Анхлан эхлэгчид болон бага
                    орлоготой tenant-үүд амархан хандах боломжтой.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Бага хувь хураамж (5%):</strong> Том орлоготой tenant-үүд ч маш их
                    төлөхгүй, өрсөлдөөнт үнэ хэвээр үлдэнэ.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Жишээ:</strong> 10 сая ₮ ашигтай tenant сард зөвхөн 50K + 350K = 400K ₮
                    төлнө (нийт ашгийн 4% л).
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-5 w-5" />
                    Платформд ашигтай
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Таамаглагдах үндсэн орлого:</strong> Сарын 50K × tenant тоо нь
                    зардлаа хангахад хангалттай тогтвортой орлого.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Өсөлттэй холбогдсон:</strong> Tenant амжилттай болох тусам платформ ч
                    амжилттай болно (5% хувь нэмэгддэг).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Масштабтай:</strong> 1000 tenant-тэй 3-р жилд 400+ сая ₮/жил орлого
                    (70%+ ашгийн хувьтай).
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 bg-green-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Calculator className="h-8 w-8 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Тооцоолол жишээ</h3>
                    <p className="mb-4">
                      Tenant сард 20 сая ₮ орлого олно, 70% ашигтай (14 сая ₮ ашиг):
                    </p>
                    <div className="space-y-2 bg-green-700 p-4 rounded-lg">
                      <div className="flex justify-between">
                        <span>Тогтмол төлбөр:</span>
                        <span className="font-bold">50,000 ₮</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Хувь хураамж (5% × 14M):</span>
                        <span className="font-bold">700,000 ₮</span>
                      </div>
                      <div className="flex justify-between border-t border-green-500 pt-2">
                        <span className="font-bold">Нийт сарын төлбөр:</span>
                        <span className="font-bold text-xl">750,000 ₮</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-200">
                        <span>Ашгийн хувь:</span>
                        <span>5.4% (маш шударга!)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Current Solutions Comparison */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                Өрсөлдөгч шинжилгээ
              </Badge>
              <h2 className="text-4xl font-bold mb-4">Одоогийн шийдлүүд vs Бидний платформ</h2>
              <p className="text-xl text-muted-foreground">
                Монголын контент бүтээгчид одоо юу ашиглаж байна? Бидний давуу тал юу вэ?
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-12">
              {/* Manual Telegram Management */}
              <Card className="relative border-2 border-red-200">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    Хуучин арга
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Гараар удирдах</CardTitle>
                  <CardDescription>Telegram группийг гараар удирдах</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-600">0 ₮</span>
                      <span className="text-muted-foreground">/сар</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Үнэгүй боловч цаг зарцуулна</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-700">❌ Асуудлууд:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Төлбөрийг гараар шалгах хэрэгтэй</li>
                      <li>• Гишүүнийг гараар нэмэх/хасах</li>
                      <li>• Хугацаа дуусахыг санах хэрэгтэй</li>
                      <li>• Алдаа гарах магадлал өндөр</li>
                      <li>• Их цаг зарцуулна (өдөрт 2-3 цаг)</li>
                      <li>• Өсөхөд хэцүү (100+ гишүүнтэй)</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      "Өдөр бүр төлбөр шалгаж, гишүүн нэмж байна. Өсөх тусам удирдах боломжгүй болж
                      байна."
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Skool.com */}
              <Card className="relative border-2 border-orange-200">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                    Олон улсын
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Skool.com</CardTitle>
                  <CardDescription>Олон улсын community платформ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-orange-600">339K ₮</span>
                      <span className="text-muted-foreground">/сар</span>
                    </div>
                    <p className="text-sm text-muted-foreground">$99/сар + 2.9% хураамж</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-orange-700">⚠️ Монголд саад:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Англи хэл заавал шаардлагатай</li>
                      <li>• Олон улсын дебит карт хэрэгтэй</li>
                      <li>• Монголын төлбөрийн систем дэмждэггүй</li>
                      <li>• Үнэ үнэхээр өндөр (339K vs 50K)</li>
                      <li>• Telegram-аас шилжих хэрэгтэй</li>
                      <li>• Хэрэглэгчид шинэ платформ сурах</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-green-700">✓ Давуу тал:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Олон функц (courses, gamification)</li>
                      <li>• Дэлхий даяар алдартай</li>
                      <li>• Video hosting орсон</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      "Бүртгүүлэх гэтэл англиар бөглөх хэрэгтэй. Олон улсын карт байхгүй учраас
                      бүртгүүлж чадсангүй."
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Our Platform */}
              <Card className="relative border-2 border-green-300 shadow-lg">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-600 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Шилдэг сонголт
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-green-700">Бидний платформ</CardTitle>
                  <CardDescription>Монголд зориулсан Telegram автоматжуулалт</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-green-600">50K ₮</span>
                      <span className="text-muted-foreground">/сар</span>
                    </div>
                    <p className="text-sm text-muted-foreground">+ 5% ашгаас (маш шударга!)</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-green-700">✅ Бидний давуу тал:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Монгол хэл дээр бүхэлдээ</li>
                      <li>• QPay интеграци (3.2M хэрэглэгч)</li>
                      <li>• Telegram-д шууд ажиллана</li>
                      <li>• Шилжих шаардлагагүй</li>
                      <li>• Бүх зүйл автомат (төлбөр, гишүүн)</li>
                      <li>• 85% хямд (50K vs 339K)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-blue-700">🚀 Функцууд:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Автомат гишүүн удирдлага</li>
                      <li>• Төлбөрийн автоматжуулалт</li>
                      <li>• Хугацаа дуусах мэдэгдэл</li>
                      <li>• Багц төлөвлөгөө (сар/жил)</li>
                      <li>• Тайлан, статистик</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t bg-green-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">
                      💡 Жишээ тооцоолол:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      10 сая ₮ ашигтай tenant → 50K + 350K = 400K төлнө
                      <br />
                      <span className="font-semibold text-green-700">
                        Skool-оос 7.5 дахин хямд!
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Feature Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Дэлгэрэнгүй харьцуулалт</CardTitle>
                <CardDescription>Функц бүрийн харьцуулалт</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2">
                        <th className="text-left p-3 font-semibold">Функц</th>
                        <th className="text-center p-3 font-semibold">Гараар удирдах</th>
                        <th className="text-center p-3 font-semibold">Skool.com</th>
                        <th className="text-center p-3 font-semibold text-green-700">
                          Бидний платформ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Монгол хэл</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">QPay төлбөр</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Олон улсын карт шаардлага</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3 text-red-600">✅ (саад)</td>
                        <td className="text-center p-3 font-semibold text-green-600">❌</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Telegram-д шууд ажиллах</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Автомат гишүүн удирдлага</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Автомат төлбөр баталгаажуулалт</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Хугацаа дуусах мэдэгдэл</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Багц төлөвлөгөө (сар/жил)</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Тайлан, статистик</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3 font-semibold text-green-600">✅</td>
                      </tr>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-3">Хэрэглэгчид шилжих хэрэгтэй</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3 text-red-600">✅ (саад)</td>
                        <td className="text-center p-3 font-semibold text-green-600">❌</td>
                      </tr>
                      <tr className="border-b-2 hover:bg-slate-50 bg-blue-50">
                        <td className="p-3 font-bold">Сарын зардал (10M ашигтай tenant)</td>
                        <td className="text-center p-3 font-bold">0 ₮<br/><span className="text-xs text-muted-foreground">(+2-3 цаг/өдөр)</span></td>
                        <td className="text-center p-3 font-bold text-orange-600">~639K ₮<br/><span className="text-xs text-muted-foreground">(339K+300K хураамж)</span></td>
                        <td className="text-center p-3 font-bold text-green-600">400K ₮<br/><span className="text-xs text-muted-foreground">(50K+350K)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Key Insight Card */}
            <Card className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-12 w-12 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Яагаад бид онцгой вэ?</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold mb-2">🇲🇳 Монголд зориулсан</p>
                        <p className="text-sm text-blue-100">
                          Англи хэл шаардлагагүй. Олон улсын карт хэрэггүй. QPay-ээр хялбархан
                          төлнө. Бүх зүйл монголоор.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold mb-2">💰 Хямд үнэ</p>
                        <p className="text-sm text-blue-100">
                          Skool-оос 7.5 дахин хямд (50K vs 339K). Гараар удирдахаас 2-3 цаг/өдөр
                          хэмнэнэ.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold mb-2">🚀 Telegram-native</p>
                        <p className="text-sm text-blue-100">
                          Хэрэглэгчид шилжих шаардлагагүй. Telegram дээр л үлдэнэ. Контент
                          бүтээгч ч амар.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold mb-2">🤖 Бүрэн автомат</p>
                        <p className="text-sm text-blue-100">
                          Төлбөр, гишүүн удирдлага, хугацаа дуусах - бүгд автомат. Та контент
                          бүтээхэд л анхаар.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Зах зээлийн боломж</h2>
              <p className="text-xl text-muted-foreground">Монгол дахь Telegram эдийн засаг</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Хүн ам</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">3.53M</div>
                  <p className="text-sm text-muted-foreground">Нийт хүн ам</p>
                  <div className="mt-4 text-3xl font-bold text-green-600">2.70M</div>
                  <p className="text-sm text-muted-foreground">Сошиал медиа хэрэглэгчид (76.5%)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">QPay нэвтрэлт</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">3.2M</div>
                  <p className="text-sm text-muted-foreground">QPay хэрэглэгчид</p>
                  <div className="mt-4 text-3xl font-bold text-green-600">99.9%</div>
                  <p className="text-sm text-muted-foreground">Төлбөрийн амжилтын хувь</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Зорилтот зах зээл</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">10-15K</div>
                  <p className="text-sm text-muted-foreground">Боломжит tenant-үүд</p>
                  <div className="mt-4 text-3xl font-bold text-green-600">1B+</div>
                  <p className="text-sm text-muted-foreground">Telegram дэлхий (2025)</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Яагаад одоо тохиромжтой үе вэ?</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-left">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">Telegram 1 тэрбум хэрэглэгч</p>
                        <p className="text-sm text-blue-100">Дэлхийн өсөлтийн үе</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">QPay бэлэн дэд бүтэц</p>
                        <p className="text-sm text-blue-100">3.2M хэрэглэгч, 99.9% амжилт</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">Бүтээгчдийн эдийн засаг</p>
                        <p className="text-sm text-blue-100">$250B+ дэлхий даяар өсч байна</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">Анхны давуу тал</p>
                        <p className="text-sm text-blue-100">Монголд өрсөлдөгч байхгүй</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Бэлэн үү?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            80% бэлэн платформ, оновчлогдсон үнийн загвар, тодорхой зах зээл.
            <br />
            Эхлүүлэхэд бэлэн.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
              Дэлгэрэнгүй мэдээлэл авах
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Бизнес төлөвлөгөө татах
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-400">
            © 2025 Telegram Групп SaaS Platform. Бүх эрх хуулиар хамгаалагдсан.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Энэ бизнесийн шинжилгээ нь дотоод хэрэглээний зорилгоор бэлтгэгдсэн.
          </p>
        </div>
      </footer>
    </div>
  );
}
