import {Address} from './address';
import {Delivery} from './delivery';
import {WorkingPeriod} from './working-period';

export class Restaurant {
  name: string;
  fiscalNumber: string;
  address: Address;
  tel: string;
  email: string;
  key: string;
  settingsKey: string;
  suspendOrders: boolean;
  deliveryEnabled: boolean;
  onlinePaymentStatus: boolean;
  stripeId: string;
  iban: string;
  delivery: Delivery;
  timetable: WorkingPeriod[];
  deliveryTime: string;
  closingDays: any;
  minimumOrder: number;
  inRestaurantOrdersEnabled: boolean;
  businessType: string;
  fcmTokens = [];
  dinnerDisabled = false;
}
