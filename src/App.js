import React, {useEffect} from 'react';
import {Linking, StatusBar, StyleSheet} from 'react-native';
import {DefaultTheme, Provider as PaperProvider} from 'react-native-paper';
import NavigationContainer from '@react-navigation/native/src/NavigationContainer';
import LoginScreen from './screens/LoginScreen';
import {createStackNavigator} from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import firebase from '@react-native-firebase/app';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AdminScreen from './screens/AdminScreen';

const firebaseConfig = {
  apiKey: 'AIzaSyDxiMAmLUqiYpWyDipDljWYRsYvKCho7Y0',
  authDomain: 'scuver-data.firebaseapp.com',
  databaseURL:
    'https://scuver-data-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'scuver-data',
  storageBucket: 'scuver-data.appspot.com',
  messagingSenderId: '326732084118',
  appId: '1:326732084118:web:2ad29e73e90879d830e3b7',
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const Stack = createStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#5e8d93',
    accent: '#eb9f12',
  },
};

// const signOut = (navigationRef) => {
//   Alert.alert(
//     'Sair',
//     'Tem a certeza que quer sair? \n\n Nota: Esta acção não irá suspender as encomendas. Para tal terá de o fazer na área de adminitração.',
//     [
//       {
//         text: 'Não',
//         onPress: () => console.log('Cancelado.'),
//         style: 'cancel',
//       },
//       {
//         text: 'Sim',
//         onPress: () => {
//           firebase
//             .auth()
//             .signOut()
//             .then(() => {
//               console.log('Signed Out');
//               AsyncStorage.removeItem('user');
//               AsyncStorage.removeItem('visited');
//               // NavigationActions.reset({
//               //   key: null,
//               //   index: 0,
//               //   actions: [NavigationActions.navigate({routeName: 'Login'})],
//               // });
//             })
//             .catch((err: any) => {
//               console.log('err', err);
//               // NavigationActions.reset({
//               //   key: null,
//               //   index: 0,
//               //   actions: [NavigationActions.navigate({routeName: 'Login'})],
//               // });
//             });
//         },
//       },
//     ],
//     {cancelable: false},
//   );
// };

const Tab = createBottomTabNavigator();

const App = () => {
  const navigationRef = React.useRef(null);

  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer ref={navigationRef}>
        <Tab.Navigator
          initialRouteName={'Encomendas'}
          screenOptions={({route}) => ({
            tabBarIcon: ({focused, color, size}) => {
              let iconName;

              if (route.name === 'Encomendas') {
                iconName = focused ? 'file-tray-outline' : 'file-tray';
              } else if (route.name === 'Login') {
                iconName = focused ? 'person-outline' : 'person';
              } else if (route.name === 'Admin') {
                iconName = focused ? 'cog-outline' : 'cog';
              }

              // You can return any component that you like here!
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
          tabBarOptions={{
            activeTintColor: '#50959d',
            inactiveTintColor: 'gray',
          }}>
          <Tab.Screen name="Login" component={LoginScreen} />
          <Tab.Screen name="Encomendas" component={HomeScreen} />
          <Tab.Screen name="Admin" component={AdminScreen} />
        </Tab.Navigator>
        {/*<Stack.Navigator initialRouteName={'Home'}>*/}
        {/*  <Stack.Screen*/}
        {/*    name="Home"*/}
        {/*    component={HomeScreen}*/}
        {/*    options={{headerShown: false}}*/}
        {/*  />*/}
        {/*  <Stack.Screen*/}
        {/*    name="Login"*/}
        {/*    component={LoginScreen}*/}
        {/*    options={{headerShown: false}}*/}
        {/*  />*/}
        {/*</Stack.Navigator>*/}
      </NavigationContainer>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  button: {
    marginLeft: '10%',
    backgroundColor: 'rgba(200,50,50,.8)',
  },
  appbar: {
    marginTop: '5%',
  },
  appbarTitle: {
    color: '#ffffff',
    textAlign: 'center',
    marginLeft: '30%',
  },
  scrollView: {
    textAlign: 'center',
    padding: '2%',
  },
});

export default App;
