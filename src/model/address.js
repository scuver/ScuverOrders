import firestore from '@react-native-firebase/firestore';
// import * as firebase from 'firebase';

export class Address {
  key: string;
  address: string;
  doorNumber: number;
  floor: string;
  postalCode: string;
  local: string;
  coordinates: firestore.GeoPoint;
}
