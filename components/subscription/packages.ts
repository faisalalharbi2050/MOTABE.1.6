import { PackageTier, PaymentPeriod } from '../../types';

export interface PackageFeature {
  name: string;
  includedIn: PackageTier[];
}

export const PACKAGE_FEATURES: PackageFeature[] = [
  { name: 'التوقيت الزمني للفصل واليوم الدراسي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'خطط المواد الدراسية جاهزة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إضافة الفصول', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إدارة المعلمين والطلاب وإضافتهم بسهولة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إدارة الإداريين وإضافتهم بسهولة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول الحصص', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول الانتظار', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول الإشراف اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إنشاء جدول المناوبة اليومية', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'الانتظار اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إدارة ومنح الصلاحيات وتفويض المهام', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'التقارير والإحصائيات', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'الطباعة والتصدير', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال الجداول للمعلمين وأولياء الأمور', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال التكليف بالإشراف اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال تذكير يومي بالإشراف اليومي', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال التكليف بالمناوبة اليومية', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال تذكير يومي بالمناوبة اليومية', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'إرسال الانتظار للمنتظرين الكترونيًا', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'التوقيع الالكتروني للجداول والانتظار', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'رصيد مجاني للرسائل النصية 10 رسائل', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'رصيد مجاني لرسائل الواتساب 50 رسالة', includedIn: ['basic', 'advanced', 'premium'] },
  { name: 'باقات الرسائل حسب احتياجك', includedIn: ['basic', 'advanced', 'premium'] },
  
  // Advanced features
  { name: 'متابعة أعمال المعلمين', includedIn: ['advanced', 'premium'] },
  { name: 'المجتمعات المهنية', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة تأخر الطلاب', includedIn: ['advanced', 'premium'] },
  { name: 'تحويل طالب للموجه الطلابي', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة غياب الطلاب', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة استئذان الطلاب', includedIn: ['advanced', 'premium'] },
  { name: 'رصد السلوك', includedIn: ['advanced', 'premium'] },
  { name: 'إدارة الاختبارات', includedIn: ['advanced', 'premium'] },
  { name: 'تحليل النتائج', includedIn: ['advanced', 'premium'] },
  { name: 'الكشوف الدراسية', includedIn: ['advanced', 'premium'] },
];

export const PACKAGE_PRICING: Record<PackageTier, Record<PaymentPeriod, number>> = {
  basic: {
    monthly: 89,
    semester: 194,
    yearly: 369,
  },
  advanced: {
    monthly: 149, // Placeholder since user only provided basic pricing and said "جميع مزايا الباقة الأساسية بالاضافة..."
    semester: 299, 
    yearly: 599, 
  },
  premium: {
    monthly: 199,
    semester: 399,
    yearly: 899,
  }
};

export const PACKAGE_NAMES: Record<PackageTier, string> = {
  basic: 'الباقة الأساسية',
  advanced: 'الباقة المتقدمة',
  premium: 'الباقة الشاملة',
};

// Returns period in days
export const getPeriodDays = (period: PaymentPeriod): number => {
  switch(period) {
    case 'monthly': return 30;
    case 'semester': return 120; // 4 months assumption
    case 'yearly': return 365;
  }
};

export const calculateProRata = (
  currentPackage: PackageTier,
  currentPeriod: PaymentPeriod | 'trial', // trial has no cost
  daysRemaining: number,
  newPackage: PackageTier,
  newPeriod: PaymentPeriod
) => {
  let remainingValue = 0;
  
  if (currentPeriod !== 'trial') {
    const currentPrice = PACKAGE_PRICING[currentPackage][currentPeriod];
    const currentTotalDays = getPeriodDays(currentPeriod);
    const dailyRate = currentPrice / currentTotalDays;
    remainingValue = dailyRate * Math.max(0, daysRemaining);
  }
  
  const newPrice = PACKAGE_PRICING[newPackage][newPeriod];
  const finalPrice = Math.max(0, newPrice - remainingValue);
  
  return {
    remainingValue: Math.round(remainingValue * 100) / 100, // round 2 decimals
    newPrice,
    finalPrice: Math.round(finalPrice * 100) / 100
  };
};
