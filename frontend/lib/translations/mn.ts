// Mongolian translations
export const mn = {
  // Business Analytics
  businessAnalytics: {
    title: 'Бизнесийн Шинжилгээ',
    subtitle: 'Зах зээлийн боломж, санхүүгийн төсөөлөл, ашигт ажиллагааны шинжилгээ',

    // Tabs
    tabs: {
      overview: 'Ерөнхий',
      market: 'Зах зээл',
      financial: 'Санхүү',
      competition: 'Өрсөлдөөн',
      projections: 'Төсөөлөл',
    },

    // Market Analysis
    market: {
      title: 'Зах зээлийн боломж',
      mongoliaMarket: 'Монголын зах зээл',
      totalPopulation: 'Нийт хүн ам',
      internetUsers: 'Интернет хэрэглэгчид',
      socialMediaUsers: 'Сошиал медиа хэрэглэгчид',
      qpayUsers: 'QPay хэрэглэгчид',
      potentialCustomers: 'Боломжит хэрэглэгчид',
      telegramUsers: 'Telegram хэрэглэгчид (дэлхий)',

      statistics: {
        population: '3.53 сая',
        internet: '2.93 сая',
        socialMedia: '2.7 сая',
        qpay: '3.2 сая',
        potential: '10,000-15,000',
        telegram: '1 тэрбум',
      },

      penetration: 'Нэвтрэлт',
      marketSize: 'Зах зээлийн хэмжээ',
    },

    // Financial Projections
    financial: {
      title: 'Санхүүгийн төсөөлөл',
      revenue: 'Орлого',
      costs: 'Зардал',
      profit: 'Ашиг',
      margin: 'Ашгийн хувь',
      customers: 'Хэрэглэгчид',

      breakdown: {
        title: 'Зардлын задаргаа',
        infrastructure: 'Дэд бүтэц',
        team: 'Баг',
        marketing: 'Маркетинг',
        operations: 'Үйл ажиллагаа',
      },

      projections: {
        conservative: 'Консерватив',
        optimistic: 'Өөдрөг',
        year1: '1-р жил',
        year2: '2-р жил',
        year3: '3-р жил',
      },

      metrics: {
        mrr: 'Сарын орлого',
        arr: 'Жилийн орлого',
        ebitda: 'EBITDA',
        grossMargin: 'Ерөнхий ашиг',
        operatingCosts: 'Үйл ажиллагааны зардал',
      },
    },

    // Pricing
    pricing: {
      title: 'Үнийн стратеги',
      monthly: '/сар',
      plans: {
        free: 'Үнэгүй',
        starter: 'Анхлан',
        pro: 'Мэргэжлийн',
        enterprise: 'Байгууллага',
      },
      features: {
        bots: 'бот',
        groups: 'бүлэг',
        members: 'гишүүн',
        unlimited: 'Хязгааргүй',
      },
    },

    // Competition
    competition: {
      title: 'Өрсөлдөгч шинжилгээ',
      ourPlatform: 'Манай платформ',
      advantages: 'Давуу тал',
      competitors: 'Өрсөлдөгчид',

      features: {
        localPayment: 'Орон нутгийн төлбөр',
        localCurrency: 'Орон нутгийн мөнгөн тэмдэгт',
        endToEnd: 'Иж бүрэн шийдэл',
        multiProject: 'Олон төсөл',
        botBased: 'Бот дээр суурилсан',
        enterprise: 'Байгууллагын түвшний',
      },
    },

    // ROI
    roi: {
      title: 'Хөрөнгө оруулалтын өгөөж',
      investment: 'Хөрөнгө оруулалт',
      breakEven: 'Тэнцэл цэг',
      profitability: 'Ашигт ажиллагаа',
      exitValue: 'Гарах үнэ цэнэ',
      returnMultiple: 'Өгөөжийн үржвэр',
      timeline: 'Хугацаа',

      bootstrap: {
        title: 'Bootstrap арга',
        investment: '68.5 сая ₮',
        breakEven: '6-9 сар',
        year3Profit: '1.07 тэрбум ₮/жил',
        exitValue: '10-17 тэрбум ₮',
        multiple: '150-250x',
      },

      funded: {
        title: 'Санхүүжилттэй арга',
        investment: '513.75 сая ₮',
        breakEven: '12-18 сар',
        year3Profit: '1.6 тэрбум ₮/жил',
        exitValue: '17-27 тэрбум ₮',
        multiple: '5-8x',
      },
    },

    // Unit Economics
    unitEconomics: {
      title: 'Нэгжийн эдийн засаг',
      ltv: 'Хэрэглэгчийн насан туршийн үнэ цэнэ',
      cac: 'Хэрэглэгч олж авах зардал',
      ratio: 'LTV/CAC харьцаа',
      payback: 'Нөхөх хугацаа',
      grossMargin: 'Ерөнхий ашиг',

      values: {
        ltv: '1.68-2.36 сая ₮',
        cac: '171-257 мянга ₮',
        ratio: '7-10x',
        payback: '1-2 сар',
        margin: '85-90%',
      },

      excellent: 'Маш сайн',
      good: 'Сайн',
      healthy: 'Эрүүл',
    },

    // Recommendations
    recommendations: {
      title: 'Зөвлөмж',
      decision: 'Шийдвэр',
      go: 'ЯВАХ',
      reasoning: 'Үндэслэл',

      reasons: [
        'Үйлдвэрлэлд бэлэн платформ (80% дууссан)',
        'Тодорхой ашигт ажиллагааны зам',
        'Сайн нэгжийн эдийн засаг (LTV/CAC 7-10x)',
        'Монгол зах зээлд анхны давуу тал',
        'Өндөр ашгийн хувь (72% цар хүрээнд)',
        'Бага эрсдэл ($20K bootstrap)',
      ],

      nextSteps: 'Дараагийн алхамууд',
      immediate: 'Яаралтай (30 хоног)',
      shortTerm: 'Богино хугацаа (3 сар)',
      mediumTerm: 'Дунд хугацаа (6-12 сар)',
    },

    // Key Metrics
    keyMetrics: {
      title: 'Гол үзүүлэлтүүд',
      target: 'Зорилт',
      current: 'Одоогийн',
      status: 'Төлөв байдал',
    },

    // Charts
    charts: {
      revenueGrowth: 'Орлогын өсөлт',
      customerGrowth: 'Хэрэглэгчдийн өсөлт',
      profitMargins: 'Ашгийн хувь',
      costBreakdown: 'Зардлын задаргаа',
      marketSize: 'Зах зээлийн хэмжээ',
      competitivePosition: 'Өрсөлдөх байр суурь',
    },

    // Common
    common: {
      year: 'жил',
      month: 'сар',
      months: 'сар',
      customers: 'хэрэглэгчид',
      million: 'сая',
      billion: 'тэрбум',
      currency: '₮',
      percentage: '%',
      loading: 'Ачааллаж байна...',
      error: 'Алдаа гарлаа',
      noData: 'Өгөгдөл алга',
    },
  },
};

export type Translations = typeof mn;
