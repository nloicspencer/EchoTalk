import firestore from '@react-native-firebase/firestore';

export const db = firestore();
export const echosCollection = db.collection('echos');
