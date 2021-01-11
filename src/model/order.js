import {OrderItem} from './orderItem';
import {Address} from './address';

export class Order {
  key: string;
  restaurantKey: string;
  userKey: string;
  items: OrderItem[];
  address: Address;
  createdAt: string;
  reference: number;
  completedAt: string;
  paymentMethod: string;
  phoneNumber: string;
  deliveryDate: string;
  orderType: string;
  status: string;
  notes: string;
  table: string;
  invoiceReference: string;
  deliveryReference: string;
  userFCMTokens = [];
  restaurantFCMTokens = [];
  restaurantName = '';
  userName = '';
  restaurantAddress: Address;
  userFiscalNumber = '';
  sentToDelivery = false;
  subTotal: number;
  total: number;
  promotion: {code: string, amount: number} = {};
}
