'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bot,
  CreditCard,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  MessageSquare,
  Lock,
  Bell,
  DollarSign,
  Target,
  Gauge,
  ChevronRight,
  Settings,
  Database,
  Cloud
} from 'lucide-react';

export default function ProductIntroPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

        <div className="relative px-4 pt-20 pb-32 sm:px-6 lg:px-8 lg:pt-32 lg:pb-40">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <div className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white border border-white/20 mb-8">
                <Zap className="h-4 w-4 mr-2 text-yellow-300" />
                Telegram Groups Management Platform
              </div>

              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl mb-6">
                Telegram бүлгийн удирдлагын
                <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent mt-2">
                  бүрэн шийдэл
                </span>
              </h1>

              <p className="mt-6 text-xl leading-8 text-blue-100 max-w-3xl mx-auto">
                Контент бүтээгчид болон онлайн багш нарт зориулсан автомат төлбөрийн систем,
                гишүүдийн удирдлага, аналитик мэдээлэл бүхий SaaS платформ.
                Telegram бүлгээ орлого олох хэрэгслээ болго.
              </p>

              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 h-auto"
                >
                  <Link href="/register" className="flex items-center gap-2">
                    Үнэгүй туршилт эхлүүлэх
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6 h-auto"
                >
                  <a href="mailto:info@telegramgroups.mn">
                    Холбогдох
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Problem Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Telegram бүлэг удирдахад тулгардаг асуудлууд
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  <p className="text-gray-700 text-lg">
                    <strong>Төлбөр хүлээн авах</strong> - Гар аргаар банкны мэдээлэл шалгах, баталгаажуулах
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  <p className="text-gray-700 text-lg">
                    <strong>Гишүүдийн эрх удирдах</strong> - Сар бүр гараар гишүүд нэмэх, хасах
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  <p className="text-gray-700 text-lg">
                    <strong>Мэдээлэл хянах</strong> - Хэдэн гишүүн төлсөн, хэдэн орлого орсон гэдгийг мэдэхгүй
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                  <p className="text-gray-700 text-lg">
                    <strong>Цаг зарцуулалт</strong> - Контент бүтээхийн оронд удирдлагад цаг зарцуулна
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Screenshot Placeholder: Problem Illustration */}
              <div className="relative rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6 mx-auto"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6 mx-auto"></div>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Screenshot needed
                </div>
                <p className="mt-6 text-sm text-gray-600 font-medium">
                  📸 REPLACE WITH: Telegram admin manually managing payments<br/>
                  (Show cluttered chat with payment confirmations, confused admin)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Solution Section */}
      <div className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Бидний шийдэл
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Бүх зүйлийг автоматжуулж, та зөвхөн контент бүтээхэд анхаарна
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div className="relative order-2 lg:order-1">
              {/* Screenshot Placeholder: Dashboard Overview */}
              <div className="relative rounded-2xl border-4 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-white p-12 text-center shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <BarChart3 className="w-20 h-20 text-blue-400" />
                  <div className="space-y-2 w-full">
                    <div className="h-6 bg-blue-200 rounded animate-pulse"></div>
                    <div className="h-6 bg-blue-200 rounded animate-pulse w-5/6 mx-auto"></div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="h-20 bg-blue-100 rounded"></div>
                      <div className="h-20 bg-green-100 rounded"></div>
                      <div className="h-20 bg-purple-100 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Screenshot needed
                </div>
                <p className="mt-6 text-sm text-gray-600 font-medium">
                  📸 REPLACE WITH: Main dashboard screenshot<br/>
                  (Show revenue chart, member stats, payment overview, analytics)
                </p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-700 font-semibold mb-4">
                <Zap className="h-4 w-4 mr-2" />
                Бүрэн автоматжуулалт
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Цогц удирдлагын систем
              </h3>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Төлбөр хүлээн авалт, гишүүд нэмэх, эрх дуусгах, мэдээлэл харах гэх мэт
                бүх үйлдлүүд автоматаар явагдана. Та зөвхөн контент бүтээхэд анхаарна.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  QPay төлбөрийн систем автомат холбогдсон
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  Гишүүд төлбөр төлмөгцөө автоматаар нэмэгдэнэ
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  Эрх дуусахад автоматаар бүлгээс хасагдана
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  Бодит цагийн аналитик, тайлан, мэдээлэл
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Үндсэн боломжууд
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Telegram бүлгийн удирдлагад хэрэгтэй бүх зүйл нэг платформд
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Feature 1: Payment Processing */}
            <Card className="border-2 border-gray-200 hover:border-blue-300 transition-all hover:shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Автомат төлбөрийн систем
                  </h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  QPay-ээр дамжуулан автоматаар төлбөр хүлээн авч, гишүүдээ удирдаарай.
                  Төлбөр төлмөгцөө гишүүд автоматаар бүлэгт нэмэгдэнэ.
                </p>

                {/* Screenshot Placeholder: Payment Flow */}
                <div className="relative rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-8 text-center">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-16 h-16 rounded bg-green-200 animate-pulse"></div>
                    <ChevronRight className="text-green-400 h-8 w-8" />
                    <div className="w-16 h-16 rounded bg-green-200 animate-pulse"></div>
                    <ChevronRight className="text-green-400 h-8 w-8" />
                    <div className="w-16 h-16 rounded bg-green-200 animate-pulse"></div>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                    Screenshot
                  </div>
                  <p className="mt-4 text-xs text-gray-600 font-medium">
                    📸 QPay payment flow: User clicks → QPay QR → Auto-added to group
                  </p>
                </div>

                <ul className="mt-6 space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    QPay, Монпэй, банкны шилжүүлэг дэмжинэ
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Төлбөр автоматаар баталгаажина
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Нэхэмжлэх автоматаар үүсгэгдэнэ
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2: Member Management */}
            <Card className="border-2 border-gray-200 hover:border-purple-300 transition-all hover:shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Гишүүдийн удирдлага
                  </h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Гишүүдийн эрх автоматаар дуусгавар болж, шинэчлэгдэх тул санаа зоволтгүй.
                  Бүх мэдээлэл нэг дороос харагдана.
                </p>

                {/* Screenshot Placeholder: Members List */}
                <div className="relative rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 p-8 text-center">
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-3 bg-white p-3 rounded">
                        <div className="w-10 h-10 rounded-full bg-purple-200"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-purple-100 rounded w-3/4"></div>
                          <div className="h-2 bg-purple-50 rounded w-1/2 mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-2 right-2 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                    Screenshot
                  </div>
                  <p className="mt-4 text-xs text-gray-600 font-medium">
                    📸 Members list with status, expiry date, payment history
                  </p>
                </div>

                <ul className="mt-6 space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                    Автомат эрх дуусгавар хяналт
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                    Гишүүдийн төлбөрийн түүх
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                    Сануулга мессеж автоматаар илгээнэ
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3: Analytics */}
            <Card className="border-2 border-gray-200 hover:border-orange-300 transition-all hover:shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Аналитик мэдээлэл
                  </h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Орлого, гишүүд, төлбөрийн мэдээллийг бодит цагийн аналитикаар харах.
                  Шийдвэр гаргахад тань туслана.
                </p>

                {/* Screenshot Placeholder: Analytics Dashboard */}
                <div className="relative rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-8 text-center">
                  <div className="space-y-4">
                    <div className="h-32 bg-white rounded p-4">
                      <div className="h-full bg-gradient-to-r from-orange-200 to-orange-300 rounded"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 bg-white rounded"></div>
                      <div className="h-16 bg-white rounded"></div>
                      <div className="h-16 bg-white rounded"></div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded">
                    Screenshot
                  </div>
                  <p className="mt-4 text-xs text-gray-600 font-medium">
                    📸 Analytics dashboard: Revenue chart, member growth, KPIs
                  </p>
                </div>

                <ul className="mt-6 space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-orange-500 mr-2" />
                    Орлогын график, төсөөлөл
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-orange-500 mr-2" />
                    Гишүүдийн өсөлт, унасан тоо
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-orange-500 mr-2" />
                    Төлбөрийн амжилттай хувь
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 4: Bot Management */}
            <Card className="border-2 border-gray-200 hover:border-blue-300 transition-all hover:shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Telegram Bot удирдлага
                  </h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Өөрийн Telegram ботоо хялбараар бүртгэж, тохируулж, олон бүлгээ
                  нэг дороос удирдаарай.
                </p>

                {/* Screenshot Placeholder: Bot Settings */}
                <div className="relative rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-blue-200"></div>
                        <div className="text-left">
                          <div className="h-3 bg-blue-200 rounded w-24"></div>
                          <div className="h-2 bg-blue-100 rounded w-16 mt-1"></div>
                        </div>
                      </div>
                      <Settings className="text-blue-300 h-6 w-6" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 bg-white rounded"></div>
                      <div className="h-12 bg-white rounded"></div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                    Screenshot
                  </div>
                  <p className="mt-4 text-xs text-gray-600 font-medium">
                    📸 Bot configuration page: Bot token, commands, groups list
                  </p>
                </div>

                <ul className="mt-6 space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                    Хялбар ботын тохиргоо
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                    Олон бүлэг удирдах боломж
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                    Захиалгат команд үүсгэх
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works - Detailed */}
      <div className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Хэрхэн ажилладаг вэ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              5 минутад бүх зүйлийг тохируулж, бэлэн болно
            </p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-xl text-xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Бүртгүүлж, бот үүсгэх
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Имэйл хаягаараа бүртгүүлж, Telegram Bot API-аас ботоо бүртгүүлэх.
                  Bot token-оо манай платформд холбоно.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      @BotFather-аас шинэ бот үүсгэх буюу одоо байгаа ботоо холбох
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Bot token-оо манай платформд оруулж баталгаажуулах
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Ботын нэр, тайлбар, команд тохируулах
                    </span>
                  </li>
                </ul>
              </div>

              <div className="relative">
                {/* Screenshot Placeholder: Bot Setup */}
                <div className="relative rounded-2xl border-4 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-white p-12 text-center shadow-xl">
                  <Bot className="w-24 h-24 text-blue-400 mx-auto mb-6" />
                  <div className="space-y-3">
                    <div className="h-12 bg-blue-100 rounded"></div>
                    <div className="h-12 bg-blue-100 rounded"></div>
                    <div className="h-16 bg-gradient-to-r from-blue-200 to-blue-300 rounded"></div>
                  </div>
                  <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                    Screenshot needed
                  </div>
                  <p className="mt-6 text-sm text-gray-600 font-medium">
                    📸 Bot registration form: Token input, bot info, verification
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                {/* Screenshot Placeholder: Payment Plans */}
                <div className="relative rounded-2xl border-4 border-dashed border-green-300 bg-gradient-to-br from-green-50 to-white p-12 text-center shadow-xl">
                  <DollarSign className="w-24 h-24 text-green-400 mx-auto mb-6" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-xl border-2 border-green-200">
                      <div className="h-4 bg-green-100 rounded mb-2"></div>
                      <div className="h-8 bg-green-200 rounded mb-2"></div>
                      <div className="h-3 bg-green-100 rounded"></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border-2 border-green-200">
                      <div className="h-4 bg-green-100 rounded mb-2"></div>
                      <div className="h-8 bg-green-200 rounded mb-2"></div>
                      <div className="h-3 bg-green-100 rounded"></div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                    Screenshot needed
                  </div>
                  <p className="mt-6 text-sm text-gray-600 font-medium">
                    📸 Payment plans setup: Monthly/Yearly plans, pricing, QPay config
                  </p>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 text-white rounded-xl text-xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Төлбөрийн төлөвлөгөө тохируулах
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Сар бүр эсвэл жил бүрийн төлбөрийн төлөвлөгөө үүсгэж, үнийн санал тавих.
                  QPay данс холбож автомат төлбөр хүлээн авах.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Өөр өөр төлбөрийн төлөвлөгөө үүсгэх (сар, 3 сар, жил)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      QPay мерчант данс холбож баталгаажуулах
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Хөнгөлөлт, промо код тохируулах боломжтой
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 text-white rounded-xl text-xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Telegram бүлэг холбох
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Ботоо бүлэгтээ admin эрхээр нэмж, бүлгээ платформд холбоно.
                  Төлбөрийн төлөвлөгөө сонгож идэвхжүүлнэ.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Telegram бүлэгтээ ботыг admin эрхээр нэмэх
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Бүлгийн мэдээллийг платформд оруулж баталгаажуулах
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Төлбөрийн төлөвлөгөө сонгож, автомат удирдлага эхлүүлэх
                    </span>
                  </li>
                </ul>
              </div>

              <div className="relative">
                {/* Screenshot Placeholder: Group Connection */}
                <div className="relative rounded-2xl border-4 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-xl">
                  <MessageSquare className="w-24 h-24 text-purple-400 mx-auto mb-6" />
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-xl border-2 border-purple-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-purple-200"></div>
                        <div className="flex-1 text-left">
                          <div className="h-3 bg-purple-200 rounded w-3/4"></div>
                          <div className="h-2 bg-purple-100 rounded w-1/2 mt-1"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-12 bg-purple-100 rounded"></div>
                  </div>
                  <div className="absolute top-4 right-4 bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
                    Screenshot needed
                  </div>
                  <p className="mt-6 text-sm text-gray-600 font-medium">
                    📸 Group connection: Chat ID input, plan selection, activation
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                {/* Screenshot Placeholder: Live Operations */}
                <div className="relative rounded-2xl border-4 border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 to-white p-12 text-center shadow-xl">
                  <Zap className="w-24 h-24 text-indigo-400 mx-auto mb-6" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white p-3 rounded border-l-4 border-green-400">
                      <span className="text-xs text-gray-600">Төлбөр төлөгдлөө</span>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between bg-white p-3 rounded border-l-4 border-blue-400">
                      <span className="text-xs text-gray-600">Гишүүн нэмэгдлээ</span>
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex items-center justify-between bg-white p-3 rounded border-l-4 border-purple-400">
                      <span className="text-xs text-gray-600">Сануулга илгээгдлээ</span>
                      <Bell className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                    Screenshot needed
                  </div>
                  <p className="mt-6 text-sm text-gray-600 font-medium">
                    📸 Real-time activity feed: Payment notifications, member joins, alerts
                  </p>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 text-white rounded-xl text-xl font-bold mb-4">
                  4
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Автоматаар ажиллана
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Одоо бүх зүйл автоматаар ажиллана. Төлбөр төлөгдөх бүрт гишүүд нэмэгдэх,
                  эрх дуусахад хасагдах, мэдээлэл шинэчлэгдэнэ.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Төлбөр төлөгдмөгцөө 5 секундэд гишүүн нэмэгдэнэ
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Эрх дуусахаас 3 хоногийн өмнө сануулга явна
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Орлого, гишүүдийн мэдээлэл бодит цагт харагдана
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Хэн ашиглах вэ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Төрөл бүрийн контент бүтээгч, багш нарт тохиромжтой
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Онлайн багш нар
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  Хичээлийн материал хуваалцдаг, сургалт явуулдаг багш нарт тохиромжтой.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Суралцагчдын эрх автомат удирддаг
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Сар бүрийн төлбөр автомат цуглуулна
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Контент бүтээгч
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  Premium контент үүсгэж, subscribe системээр орлого олдог creators.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Олон төлбөрийн төлөвлөгөө санал болгоно
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Subscribers-ын мэдээлэл харна
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Бизнес эрхлэгчид
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  VIP клиент бүлэг, дэмжлэг үзүүлдэг компаниуд.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Олон бүлэг нэг дороос удирдана
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Бизнесийн аналитик, тайлан харна
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Технологи ба найдвартай байдал
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Дэлхийн жишигт нийцсэн технологи ашигладаг
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all">
              <Cloud className="h-12 w-12 text-blue-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900">Cloud хостинг</h4>
              <p className="text-sm text-gray-600 mt-1">99.9% uptime</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all">
              <Lock className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900">SSL шифрлэлт</h4>
              <p className="text-sm text-gray-600 mt-1">Аюулгүй холболт</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all">
              <Database className="h-12 w-12 text-purple-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900">Нөөц хадгалалт</h4>
              <p className="text-sm text-gray-600 mt-1">Өдөр бүр backup</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-all">
              <Gauge className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900">Хурдан ажиллагаа</h4>
              <p className="text-sm text-gray-600 mt-1">&lt;1s хариу өгөх хугацаа</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
            <Shield className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h3 className="text-3xl font-bold mb-4">
              Таны мэдээлэл бидэнд аюулгүй
            </h3>
            <p className="text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              Бүх төлбөр, гишүүдийн мэдээлэл шифрлэгдсэн, олон улсын стандартыг
              баримталдаг. PCI DSS compliance, GDPR ready, SOC 2 certification.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                PCI DSS Compliant
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                GDPR Ready
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                256-bit Encryption
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Daily Backups
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing CTA */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Таны бизнест тохирсон үнийн санал
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Бид таны хэрэгцээнд тохирсон уян хатан үнийн санал боловсруулна
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12 border-2 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Үнэгүй туршилт</h4>
                  <p className="text-gray-600">14 хоног бүх функцийг туршаарай</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Картын мэдээлэл шаардлагагүй</h4>
                  <p className="text-gray-600">Туршилт үед төлбөр төлөхгүй</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Техникийн дэмжлэг</h4>
                  <p className="text-gray-600">Имэйл, Telegram-аар холбогдоно</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Сургалт үнэгүй</h4>
                  <p className="text-gray-600">Системийг ашиглахад заана</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-10 py-7 h-auto shadow-xl"
              >
                <Link href="/register" className="flex items-center gap-2">
                  14 хоногийн туршилт эхлүүлэх
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <p className="text-gray-600 mt-4 text-sm">
                Картын мэдээлэл шаардлагагүй · 2 минутад бүртгэгдэнэ · Хүссэн үедээ цуцлах боломжтой
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-24 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Түгээмэл асуултууд
            </h2>
            <p className="text-xl text-gray-600">
              Таны асуултад хариулъя
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Хэрхэн эхлэх вэ?
              </h3>
              <p className="text-gray-600">
                Имэйл хаягаараа бүртгүүлж, Telegram ботоо холбоод, төлбөрийн төлөвлөгөө
                тохируулаад бэлэн. 5 минут хангалттай.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Ямар төлбөрийн системтэй ажилладаг вэ?
              </h3>
              <p className="text-gray-600">
                Одоогоор QPay-тэй ажилладаг. Удахгүй Монпэй болон бусад төлбөрийн
                системүүдийг дэмжих болно.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Техникийн мэдлэг шаардлагатай юу?
              </h3>
              <p className="text-gray-600">
                Үгүй. Бүх зүйл маш энгийн, ойлгомжтой байхаар хийгдсэн. Telegram
                ашиглаж чаддаг бол хангалттай.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Хэдэн бүлэг удирдаж болох вэ?
              </h3>
              <p className="text-gray-600">
                Хязгааргүй. Нэг платформоос хэдэн ч бүлгээ удирдаж болно. Бүлэг бүрт
                өөр өөр төлбөрийн төлөвлөгөө тавьж болно.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Миний мэдээлэл аюулгүй юу?
              </h3>
              <p className="text-gray-600">
                Тийм. Бүх мэдээлэл шифрлэгдсэн, олон улсын стандартыг баримталдаг.
                Төлбөрийн мэдээлэл PCI DSS стандартаар хамгаалагдсан.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Хэрэв тусламж хэрэгтэй бол?
              </h3>
              <p className="text-gray-600">
                Манай дэмжлэгийн баг имэйл болон Telegram-аар 24/7 бэлэн байдаг.
                Мөн video сургалт, гарын авлага бэлтгэсэн.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Өнөөдөр эхлээд Telegram бүлгээ<br/>орлоготой болго
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            14 хоногийн үнэгүй туршилт. Картын мэдээлэл шаардлагагүй.
            Хүссэн үедээ цуцлах боломжтой.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-10 py-7 h-auto w-full sm:w-auto"
            >
              <Link href="/register" className="flex items-center gap-2">
                Үнэгүй туршилт эхлүүлэх
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm text-lg px-10 py-7 h-auto w-full sm:w-auto"
            >
              <a href="mailto:info@telegramgroups.mn" className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Асуулт асуух
              </a>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-blue-100 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Картын мэдээлэл шаардлагагүй
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              2 минутад бүртгэгдэнэ
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Бүрэн дэмжлэг үнэгүй
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-white font-bold text-xl mb-4">Telegram Groups</h3>
              <p className="text-gray-400 leading-relaxed">
                Монгол улсын анхны Telegram бүлгийн удирдлагын платформ.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Платформ</h4>
              <ul className="space-y-3">
                <li><Link href="/taniltsuulga" className="hover:text-white transition-colors">Танилцуулга</Link></li>
                <li><Link href="/features" className="hover:text-white transition-colors">Боломжууд</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Үнийн санал</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Баримт бичиг</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Компани</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="hover:text-white transition-colors">Бидний тухай</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Блог</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Холбоо барих</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Дэмжлэг</h4>
              <ul className="space-y-3">
                <li><Link href="/help" className="hover:text-white transition-colors">Тусламж</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Дэмжлэгийн төв</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Нууцлал</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Үйлчилгээний нөхцөл</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Telegram Groups SaaS. Бүх эрх хуулиар хамгаалагдсан.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
