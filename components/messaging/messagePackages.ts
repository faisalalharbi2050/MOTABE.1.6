export type MessagePackage = {
  name: string;
  sms: number;
  wa: number;
  price: number;
  desc: string;
  recommended?: boolean;
};

export const MESSAGE_PACKAGES: MessagePackage[] = [
  { name: 'أساسية', sms: 1000, wa: 10000, price: 289, desc: 'رصيد يكفي المدارس بأعداد صغيرة' },
  { name: 'متقدمة', sms: 5000, wa: 20000, price: 749, desc: 'رصيد يكفي المدارس بأعداد متوسطة', recommended: true },
  { name: 'احترافية', sms: 10000, wa: 30000, price: 994, desc: 'رصيد يكفي المدارس بأعداد كبيرة' },
];
