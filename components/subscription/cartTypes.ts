import { PackageTier, PaymentPeriod } from '../../types';
import { MessagePackage } from '../messaging/messagePackages';

export type SubscriptionCartPlan = {
  tier: PackageTier;
  period: PaymentPeriod;
  newPrice: number;
  finalPrice: number;
  remainingValue: number;
};

export type SubscriptionCart = {
  plan?: SubscriptionCartPlan;
  messagePackage?: MessagePackage;
};
