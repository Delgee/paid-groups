'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  Clock,
  Star,
  MessageSquare
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

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
                Монгол улсын анхны Telegram бүлгийн удирдлагын платформ
              </div>

              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl mb-6">
                Telegram бүлгээ
                <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                  мэргэжлийн түвшинд
                </span>
                удирдаарай
              </h1>

              <p className="mt-6 text-xl leading-8 text-blue-100 max-w-3xl mx-auto">
                Автомат төлбөрийн систем, гишүүдийн удирдлага, аналитик мэдээлэл -
                бүгдийг нэг платформд. Telegram бүлгээ орлоготой болгох хамгийн хялбар арга.
              </p>

              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 h-auto"
                >
                  <Link href="/register" className="flex items-center gap-2">
                    Үнэгүй эхлэх
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6 h-auto"
                >
                  <Link href="/login">
                    Нэвтрэх
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">500+</div>
                  <div className="text-sm text-blue-200">Идэвхтэй бүлэг</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">50К+</div>
                  <div className="text-sm text-blue-200">Гишүүд</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">₮100M+</div>
                  <div className="text-sm text-blue-200">Сарын орлого</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">99.9%</div>
                  <div className="text-sm text-blue-200">Ажиллах хувь</div>
                </div>
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

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Танд хэрэгтэй бүх зүйл нэг дороос
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Telegram бүлгийн удирдлагад зориулсан бүрэн функцтэй платформ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl shadow-sm p-8 hover:shadow-xl transition-all duration-300 border border-blue-100 hover:border-blue-200 hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Ботын удирдлага
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Өөрийн Telegram ботоо хялбараар бүртгэж, тохируулж, бүлгүүдээ удирдаарай.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl shadow-sm p-8 hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-200 hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Автомат төлбөр
              </h3>
              <p className="text-gray-600 leading-relaxed">
                QPay-ээр дамжуулан автоматаар төлбөр хүлээн авч, гишүүдээ удирдаарай.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl shadow-sm p-8 hover:shadow-xl transition-all duration-300 border border-purple-100 hover:border-purple-200 hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Гишүүдийн хяналт
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Гишүүдийн эрх автоматаар дуусгавар болж, шинэчлэгдэх тул санаа зоволтгүй.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl shadow-sm p-8 hover:shadow-xl transition-all duration-300 border border-orange-100 hover:border-orange-200 hover:-translate-y-1">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Аналитик мэдээлэл
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Орлого, гишүүд, төлбөрийн мэдээллийг бодит цагийн аналитикаар харах.
              </p>
            </div>
          </div>

          {/* Additional Features Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-4 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Найдвартай аюулгүй байдал</h4>
                <p className="text-sm text-gray-600">Бүх мэдээлэл шифрлэгдсэн, найдвартай хадгалагддаг</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Хурдан ажиллагаа</h4>
                <p className="text-sm text-gray-600">5 секундэд гишүүд автоматаар нэмэгдэнэ</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">24/7 ажиллагаа</h4>
                <p className="text-sm text-gray-600">Автомат систем үргэлж ажиллаж байдаг</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Хэрхэн ажилладаг вэ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              3 хялбар алхамаар эхэл
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector Lines - Hidden on mobile */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 -translate-y-1/2 z-0"></div>

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full text-3xl font-bold mb-6 shadow-xl mx-auto">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Бүртгүүлэх</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                Имэйл хаягаараа бүртгүүлж, платформд нэвтрэх
              </p>
            </div>

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-full text-3xl font-bold mb-6 shadow-xl mx-auto">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Тохируулах</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                Telegram ботоо холбож, төлбөрийн төлөвлөгөө үүсгэх
              </p>
            </div>

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full text-3xl font-bold mb-6 shadow-xl mx-auto">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Орлого олох</h3>
              <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                Бүх зүйл автоматжиж, орлого хүлээн аваарай
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Тохиромжтой үнийн санал
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Хэмжээнээсээ үл хамааран бүх бизнест тохиромжтой
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="rounded-2xl border-2 border-gray-200 p-8 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Эхлэх</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₮29,000</span>
                <span className="text-gray-600">/сар</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">1 Telegram бот</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">500 хүртэл гишүүн</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Үндсэн аналитик</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">QPay холболт</span>
                </li>
              </ul>
              <Button asChild className="w-full" variant="outline">
                <Link href="/register">Сонгох</Link>
              </Button>
            </div>

            {/* Professional Plan - Featured */}
            <div className="rounded-2xl border-2 border-blue-500 p-8 relative shadow-xl bg-gradient-to-b from-blue-50/50 to-white">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Хамгийн алдартай
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Мэргэжлийн</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₮79,000</span>
                <span className="text-gray-600">/сар</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">5 хүртэл Telegram бот</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">5,000 хүртэл гишүүн</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Дэлгэрэнгүй аналитик</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Олон төлбөрийн хэрэгсэл</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Тусгай дэмжлэг</span>
                </li>
              </ul>
              <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                <Link href="/register">Сонгох</Link>
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl border-2 border-gray-200 p-8 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Байгууллага</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Тохирох</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Хязгааргүй бот</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Хязгааргүй гишүүн</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Бүрэн аналитик + AI</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">Захиалгат функц</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-600">24/7 дэмжлэг</span>
                </li>
              </ul>
              <Button asChild className="w-full" variant="outline">
                <Link href="/register">Холбогдох</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Хэрэглэгчдийн сэтгэгдэл
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Платформоо ашиглаж байгаа контент үүсгэгчид юу хэлж байна вэ?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Энэ платформ маш хялбар бөгөөд хүчирхэг. Telegram бүлгээ удирдах цаг заваа 80% багассан. Гайхалтай!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  Б
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Болдбаатар</div>
                  <div className="text-sm text-gray-600">Санхүүгийн зөвлөх</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Автомат төлбөрийн систем үнэхээр гайхалтай. Одоо би контент бүтээхэд л анхаарч, бүх зүйл өөрөө ажилладаг."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  С
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Сарангэрэл</div>
                  <div className="text-sm text-gray-600">Хөгжмийн багш</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Аналитик мэдээлэл маш их ашигтай. Бизнесийнхээ өсөлтийг бодитоор харж чадаж байна. Баярлалаа!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  Э
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">Эрдэнэбат</div>
                  <div className="text-sm text-gray-600">Фитнесс дасгалжуулагч</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Өнөөдөр эхэлж, маргааш орлого олоорой
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Мянга мянган контент үүсгэгчид Telegram бүлгээ орлого болгож байна.
            Та ч бидэнтэй нэгдээрэй!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-10 py-7 h-auto w-full sm:w-auto"
            >
              <Link href="/register" className="flex items-center gap-2">
                Үнэгүй эхлэх
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm text-lg px-10 py-7 h-auto w-full sm:w-auto"
            >
              <Link href="/login" className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Дэмжлэг авах
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-blue-100 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Кредит карт шаардлагагүй
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              14 хоногийн туршилт үнэгүй
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Хэзээ ч цуцлах боломжтой
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
                <li><Link href="/features" className="hover:text-white transition-colors">Боломжууд</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Үнийн санал</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Баримт бичиг</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Компани</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="hover:text-white transition-colors">Бидний тухай</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Блог</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Ажлын байр</Link></li>
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

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Telegram Groups SaaS. Бүх эрх хуулиар хамгаалагдсан.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Telegram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.756 8.278c-.132.593-.473.741-.957.461l-2.645-1.951-1.276 1.228c-.141.141-.259.259-.532.259l.19-2.696 4.898-4.426c.213-.189-.047-.295-.33-.106l-6.057 3.814-2.609-.816c-.568-.177-.579-.568.119-.841l10.213-3.939c.473-.177.886.106.732.841z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
