import {Item} from './item';
import {Option} from './option';

export class OrderItem extends Item {
  quantity: number;
  optionsSelected: Array<Array<Option>>;
}
