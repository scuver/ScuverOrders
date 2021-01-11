import {ItemOption} from './itemOption';

export class Item {
  key: string;
  id: number;
  name: string;
  description: string;
  category: string;
  tax: number;
  price: number;
  available: boolean = true;
  amountMainOptionsRequired: number = 0;
  options: ItemOption[] = [];
  picture: string;
  isWeightBased: boolean = false;
  minWeight: number = 1;
  maxWeight: number = 5;
}
