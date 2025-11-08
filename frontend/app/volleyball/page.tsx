'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Video,
  Newspaper,
  CreditCard,
  CheckCircle,
  Zap,
  BarChart3,
  MessageSquare,
  Trophy,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function VolleyballPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-orange-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

        <div className="relative px-4 pt-20 pb-32 sm:px-6 lg:px-8 lg:pt-32 lg:pb-40">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <div className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white border border-white/20 mb-8">
                <Trophy className="h-4 w-4 mr-2 text-yellow-300" />
                Монголын Волейболын Холбоонд зориулсан шийдэл
              </div>

              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl mb-6">
                Волейболын мэдээ,
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-200 bg-clip-text text-transparent mt-2">
                  шууд дамжуулалт болон
                </span>
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-200 bg-clip-text text-transparent">
                  Premium контент
                </span>
              </h1>

              <p className="mt-6 text-xl leading-8 text-orange-100 max-w-3xl mx-auto">
                Манай платформ нь таны фэнүүдэд мэдээ, шууд дамжуулалт болон эксклюзив контентыг
                хүргэх, мөн автомат төлбөрийн системээр орлого олох бүрэн боломжийг танд олгоно.
              </p>
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

      {/* What We Provide */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Бид юу санал болгож байна вэ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Волейболын холбоонд зориулсан цогц платформ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* News Website */}
            <Card className="border-2 border-gray-200 hover:border-orange-300 transition-all hover:shadow-xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Newspaper className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Мэдээний вэбсайт
                </h3>
                <p className="text-gray-600 text-center mb-6 leading-relaxed">
                  Волейболын тоглолт, мэдээ, онцлох агшин, багийн мэдээллийг
                  хурдан шуурхай хүргэх вэбсайт.
                </p>

                {/* News Website Image */}
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-6 shadow-lg">
                  <img
                    src="/images/website.png"
                    alt="News website homepage with volleyball articles, match results, and team standings"
                    className="w-full h-auto"
                  />
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Тоглолтын үр дүн, хуваарь
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Багийн мэдээлэл, тоглогчид
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Мэдээ, зураг, видео контент
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Paid Groups */}
            <Card className="border-2 border-orange-400 hover:border-orange-500 transition-all hover:shadow-xl ring-2 ring-orange-200">
              <CardContent className="p-8">
                <div className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700 font-semibold mb-4">
                  🔥 Онцлох
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Premium Telegram бүлэг
                </h3>
                <p className="text-gray-600 text-center mb-6 leading-relaxed">
                  Төлбөртэй гишүүдэд зориулсан эксклюзив контент, дүн шинжилгээ,
                  тоглолтын цаад талын мэдээлэл.
                </p>

                {/* Telegram Group Image */}
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-6 shadow-lg">
                  <img
                    src="/images/telegram.png"
                    alt="Telegram group with volleyball discussions, exclusive content, and member interactions"
                    className="w-full h-auto"
                  />
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                    Тоглолтын дэлгэрэнгүй дүн шинжилгээ
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                    Дасгалжуулагчийн санал бодол
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                    Тоглогчдын ярилцлага, цаад талын мэдээлэл
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                    Автомат төлбөр, эрх удирдлага
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Live Streaming */}
            <Card className="border-2 border-gray-200 hover:border-purple-300 transition-all hover:shadow-xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Video className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Шууд дамжуулалт
                </h3>
                <p className="text-gray-600 text-center mb-6 leading-relaxed">
                  Волейболын тоглолтыг шууд дамжуулж, төлбөртэй систем
                  дээр монетизаци хийх боломж.
                </p>

                {/* Live Streaming Image */}
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-6 shadow-lg">
                  <img
                    src="/images/live.png"
                    alt="Live volleyball match streaming interface with viewer count and chat"
                    className="w-full h-auto"
                  />
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Тоглолтын шууд дамжуулалт
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    HD чанар
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Дахин үзэх, highlight боломж
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works for Volleyball */}
      <div className="py-24 bg-gradient-to-br from-gray-50 to-orange-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Хэрхэн ажиллах вэ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Волейболын холбоонд зориулсан хялбар шийдэл
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Fans */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 text-white rounded-xl text-xl font-bold mb-6">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Фэнүүдэд
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </span>
                  <div>
                    <p className="text-gray-700">
                      <strong>Вэбсайтаас мэдээ уншиж</strong>, тоглолтын үр дүн, хуваарь харна
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </span>
                  <div>
                    <p className="text-gray-700">
                      <strong>Premium гишүүнчлэл авч</strong>, эксклюзив контент үзнэ
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </span>
                  <div>
                    <p className="text-gray-700">
                      <strong>Telegram бүлэгт</strong> автоматаар нэмэгдэж, дүн шинжилгээ уншина
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold mr-3">
                    4
                  </span>
                  <div>
                    <p className="text-gray-700">
                      <strong>Тоглолтыг шууд</strong> дамжуулалтаар үзнэ
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* For Association */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 shadow-lg text-white">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-orange-600 rounded-xl text-xl font-bold mb-6">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold mb-4">
                Холбоонд
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mr-3">
                    1
                  </span>
                  <div>
                    <p className="text-orange-50">
                      <strong className="text-white">Мэдээ, контент нийтлэж</strong>, фэнүүдтэй шууд харилцана
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mr-3">
                    2
                  </span>
                  <div>
                    <p className="text-orange-50">
                      <strong className="text-white">Төлбөрийн төлөвлөгөө үүсгэж</strong>, автомат орлого олно
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mr-3">
                    3
                  </span>
                  <div>
                    <p className="text-orange-50">
                      <strong className="text-white">Premium контент</strong> бүхий Telegram бүлэг ажиллуулна
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold mr-3">
                    4
                  </span>
                  <div>
                    <p className="text-orange-50">
                      <strong className="text-white">Аналитик мэдээлэл</strong> харж, шийдвэр гаргана
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features for Volleyball */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Системийн боломжууд
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Волейболын холбоонд зориулсан тусгай функцүүд
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Auto Payment */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Автомат төлбөр
              </h3>
              <p className="text-gray-600 text-sm">
                QPay-ээр төлбөр хүлээн авч, фэнүүд автоматаар Premium бүлэгт нэмэгдэнэ
              </p>
            </div>

            {/* Member Management */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Гишүүдийн удирдлага
              </h3>
              <p className="text-gray-600 text-sm">
                Хэдэн гишүүнтэй, хэн төлсөн гэдгийг бодит цагт харах, эрх автомат дуусгавар болно
              </p>
            </div>

            {/* Analytics */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Аналитик мэдээлэл
              </h3>
              <p className="text-gray-600 text-sm">
                Орлого, гишүүдийн өсөлт, төлбөрийн статистикийг график, тайлангаар харна
              </p>
            </div>

            {/* Content Management */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Newspaper className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Контент удирдлага
              </h3>
              <p className="text-gray-600 text-sm">
                Мэдээ, зураг, видео нийтлэх, засварлах, устгах бүгдийг хялбараар
              </p>
            </div>

            {/* Schedule */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100/50 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Тоглолтын хуваарь
              </h3>
              <p className="text-gray-600 text-sm">
                Тоглолтын хуваарь, үр дүн, багийн мэдээллийг зохион байгуулна
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-gradient-to-br from-orange-50 to-red-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Яагаад манай платформыг сонгох вэ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Волейболын холбоонд тохирсон бүх боломж нэг дороос
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Орлого нэмэгдүүлэх
                  </h3>
                  <p className="text-gray-600">
                    Premium гишүүнчлэл, шууд дамжуулалтын эрх зарж, тогтвортой орлого олоорой.
                    Төлбөр автоматаар цуглуулагдаж, та зөвхөн контент бүтээхэд анхаарна.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Фэн нийгэмлэг бүтээх
                  </h3>
                  <p className="text-gray-600">
                    Telegram бүлэгт фэнүүдээ нэгтгэж, тоглолтын дараах ярилцлага,
                    дүн шинжилгээ, онцлох агшингуудаа хуваалцаарай.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Цаг хэмнэх
                  </h3>
                  <p className="text-gray-600">
                    Төлбөр цуглуулах, гишүүд удирдах, мэдээ хүргэх бүх зүйл автоматжиж,
                    та волейболыг хөгжүүлэхэд анхаарч чадна.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Мэдээлэлд суурилсан шийдвэр
                  </h3>
                  <p className="text-gray-600">
                    Хэдэн фэнтэй, ямар контент илүү сонирхолтой, орлого хэрхэн өсч байгааг
                    харж, ухаалаг шийдвэр гаргаарай.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Example Scenario */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Жишээ сценар
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Волейболын тоглолтын өдөр
            </p>
          </div>

          {/* Scenario Image Placeholder */}
          <div className="relative rounded-2xl border-4 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-white p-16 text-center shadow-xl mb-12">
            <Trophy className="w-32 h-32 text-orange-300 mx-auto mb-6" />
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border-l-4 border-blue-400">
                <Calendar className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Тоглолтын 3 хоногийн өмнө</p>
                  <p className="text-sm text-gray-600">Вэбсайтад мэдээ нийтлэгдэж, бүх гишүүдэд автомат сануулга явна</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border-l-4 border-purple-400">
                <Video className="h-8 w-8 text-purple-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Тоглолтын өдөр</p>
                  <p className="text-sm text-gray-600">Шууд дамжуулалт эхэлж, Premium гишүүд HD чанараар үзнэ</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border-l-4 border-green-400">
                <MessageSquare className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Тоглолтын дараа</p>
                  <p className="text-sm text-gray-600">Telegram бүлэгт дүн шинжилгээ, онцлох агшингууд нийтлэгдэнэ</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border-l-4 border-orange-400">
                <BarChart3 className="h-8 w-8 text-orange-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Статистик</p>
                  <p className="text-sm text-gray-600">Хэдэн үзэгч байсан гэдгийг бодит цагт харна</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Trophy className="w-20 h-20 text-white/80 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Монголын Волейболын Холбоонтой хамтран ажиллъя
          </h2>
          <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Таны фэнүүдэд мэдээ, шууд дамжуулалт болон эксклюзив контент хүргэх
            бүрэн платформыг бэлэн болгоё. Бид танд туслахад бэлэн байна.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-orange-100 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Монголд зориулсан платформ
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              QPay төлбөрийн систем
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Бүрэн техникийн дэмжлэг
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-white font-bold text-xl mb-2">Telegram Groups Platform</h3>
            <p className="text-gray-400 mb-6">
              Монголын Волейболын Холбоонд зориулсан шийдэл
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="mailto:info@telegramgroups.mn" className="hover:text-white transition-colors">
                Холбоо барих
              </a>
              <span className="text-gray-600">·</span>
              <Link href="/taniltsuulga" className="hover:text-white transition-colors">
                Ерөнхий танилцуулга
              </Link>
              <span className="text-gray-600">·</span>
              <Link href="/register" className="hover:text-white transition-colors">
                Бүртгүүлэх
              </Link>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              © 2025 Telegram Groups SaaS. Бүх эрх хуулиар хамгаалагдсан.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
