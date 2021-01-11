import React from 'react';
import {Button, Card, Paragraph, Text} from 'react-native-paper';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {Order} from '../model/order';
import moment from 'moment';
import database from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';
import {DataTable} from 'react-native-paper';

const styles = StyleSheet.create({
  scrollView: {
    textAlign: 'center',
    padding: '2%',
  },
  button: {
    marginLeft: 'auto',
    // position: 'absolute',
    // right: 0,
    // height: 300,
    // marginBottom: '5%',
  },
  card: {
    margin: '1%',
    marginTop: '5%',
  },
  label: {
    fontWeight: 'bold',
  },
  artigo: {
    fontSize: 18,
    marginTop: '10%',
  },
  statePending: {
    color: '#ff0022',
  },
  stateViewed: {
    color: '#ff8b00',
  },
  stateReady: {
    color: '#76ff00',
  },
  link: {
    color: '#50959d',
  },
  para: {
    marginBottom: '2%',
  },
  itemsTable: {
    position: 'relative',
    flex: 0,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 10,
  },
});

const states = {
  completed: 'Entregue',
  pending: 'Pendente',
  viewed: 'Em Preparação',
  sent: 'Pronta para Entrega',
  ready: 'Pronta para Entrega',
  assigned: 'A Recolher',
  bringing: 'Atribuida ao Estafeta',
  delivered: 'Entregue',
};

export default class HomeScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      user: null,
      viewedOrders: 0,
      preparedOrders: 0,
    };

    //firebase.database().settings({experimentalForceLongPolling: true});
  }

  componentDidMount() {
    this._unsubscribe = this.props.navigation.addListener('focus', () => {
      this.getCurrentUser();
    });
    this.getCurrentUser();
    if (!AsyncStorage.getItem('visited')) {
      AsyncStorage.setItem('visited', true);
      this.forceUpdate();
    }
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  getCurrentUser() {
    const self = this;
    AsyncStorage.getItem('user').then((u: any) => {
      const authUser = u && JSON.parse(u).user;

      if (authUser) {
        database()
          .ref(
            '/user/' + authUser.email.toLowerCase().trim().split('.').join('_'),
          )
          .once('value')
          .then((snapshot) => {
            const user = snapshot.val();
            console.log('KEY', user);
            if (user) {
              database()
                .ref('/restaurant/' + user.restaurantKey)
                .once('value')
                .then((snapshot) => {
                  const restaurant = snapshot.val();
                  // console.log('RESTAURANT', restaurant);
                  this.setState({user, restaurant}, () => {
                    this.initMessaging.bind(self)();
                    this.subscribeOrders.bind(self)();
                  });
                });
            }
          });
      } else {
        Alert.alert('Info', 'Por favor efetue o login.', null, {
          cancelable: true,
        });
        this.props.navigation.navigate('Login');
      }
    });
  }

  initMessaging() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
    });
    messaging().onMessage(async (remoteMessage) => {
      Alert.alert(
        remoteMessage.notification.title,
        remoteMessage.notification.body,
      );
    });

    AsyncStorage.getItem('fcm_token').then((u: any) => {
      console.log('u', u);
      if (!u) {
        console.log('Getting Firebase Token');
        messaging()
          .getToken()
          .then((fcmToken) => {
            if (fcmToken) {
              console.log('Your Firebase Token is:', fcmToken);
              AsyncStorage.setItem('fcm_token', fcmToken);
              let tks = this.state.restaurant.fcmTokens;
              if (!tks) {
                tks = [];
              }
              tks.push(fcmToken);
              database()
                .ref('/restaurant/' + this.state.restaurant.key)
                .update({
                  fcmTokens: tks,
                });
            } else {
              console.log('Failed', 'No token received');
            }
          });
      }
    });
  }

  formatHours(date) {
    return moment(date).format('HH:mm');
  }

  subscribeOrders() {
    console.log('STATE REST', this.state.restaurant);

    database()
      .ref('/order')
      .orderByChild('restaurantKey')
      .equalTo(this.state.restaurant.key)
      .on('value', (results) => {
        const orders = [];
        let pendingOrders = 0;
        let viewedOrders = 0;
        let preparedOrders = 0;
        let deliveringOrder = null;
        results.forEach((doc: DataSnapshot) => {
          const order: Order = doc.val();
          if (order.status !== 'delivered' && order.status !== 'completed') {
            order.status === 'pending'
              ? pendingOrders++
              : order.status === 'viewed'
              ? viewedOrders++
              : preparedOrders++;
            orders.push(this.renderOrder(order));
          }
        });
        this.setState({
          orders,
          pendingOrders,
          viewedOrders,
          preparedOrders,
          deliveringOrder,
        });
      });
  }

  renderOrder(order: Order) {
    return (
      <Card key={order.key} style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Estado: </Text>
            <Text
              style={
                order.status === 'pending'
                  ? styles.statePending
                  : order.status === 'ready' || order.status === 'sent'
                  ? styles.stateReady
                  : styles.stateViewed
              }>
              {states[order.status || 'pending']}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Hora de Entrega (no cliente): </Text>
            <Text style={styles.value}>
              {this.formatHours(order.deliveryDate)}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Referência: </Text>
            <Text style={styles.value}>{order.reference}</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Artigos: </Text>
            <Text>
              {order.items.map((o) => {
                return (
                  <Paragraph style={styles.artigo} key={o.key}>
                    {'\n\t\t'}
                    {o.quantity} x {o?.name} - €{o.price.toFixed(2)}
                    {o.optionsSelected &&
                      o.optionsSelected.map((p) => {
                        return (
                          <>
                            {'\n\t\t\t\t'}
                            {p &&
                              p.map((opt) => {
                                return <>[{opt?.name}]</>;
                              })}
                          </>
                        );
                      })}
                  </Paragraph>
                );
              })}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Total: </Text>
            <Text style={styles.value}>€{this.calculateCost(order)}</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Notas: </Text>
            <Text style={styles.value}>{order.notes}</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Cliente: </Text>
            <Text style={styles.value}>
              {order.userName || 'Não registou nome.'}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Telefone Cliente: </Text>
            <Text style={styles.value}>{order.phoneNumber}</Text>
          </Paragraph>
          {order.orderType === 'delivery' &&
            (order.status === 'sent' ||
              order.status === 'ready' ||
              order.status === 'assigned' ||
              order.status === 'bringing') && (
              <>
                <Paragraph style={styles.paragraph}>
                  <Text style={styles.label}>Estafeta: </Text>
                  <Text style={styles.value}>
                    {order.driver
                      ? order.driver
                      : 'Ainda não foi aceite por nenhum estafeta.'}
                  </Text>
                </Paragraph>
              </>
            )}
        </Card.Content>
        <Card.Actions>
          {order.status === 'pending' && (
            <Button
              style={styles.button}
              mode={'contained'}
              onPress={() => this.viewed(order)}>
              Visualizado
            </Button>
          )}
          {order.status === 'viewed' && (
            <Button
              style={styles.button}
              mode={'contained'}
              onPress={() => this.ready(order)}>
              Preparado
            </Button>
          )}
          {order.orderType === 'delivery' &&
            (order.status === 'sent' ||
              order.status === 'ready' ||
              order.status === 'assigned' ||
              order.status === 'bringing') && (
              <>
                <Button
                  style={styles.button}
                  mode={'contained'}
                  onPress={() => this.openDrivers()}>
                  Ver Estafetas
                </Button>
              </>
            )}
          {order.orderType !== 'delivery' &&
            (order.status === 'sent' || order.status === 'ready') && (
              <Button
                style={styles.button}
                mode={'contained'}
                onPress={() => this.complete(order)}>
                Entregue
              </Button>
            )}
        </Card.Actions>
      </Card>
    );
  }

  openDrivers() {
    Linking.openURL('https://scuverdeliver.web.app/drivers');
  }

  viewed(order: Order) {
    database()
      .ref('/order/' + order.key)
      .update({
        status: 'viewed',
        viewedAt: new Date(),
      });
  }

  ready(order: Order) {
    let message =
      'Confirma que a encomenda está pronta para entrega (ou estará pronta em menos de 10 minutos)?';
    if (order.orderType === 'delivery') {
      message +=
        '\n\nAo confirmar irá ser chamado um estafeta para recolher a encomenda.';
    }
    if (order.orderType !== 'delivery') {
      message +=
        '\n\nAo confirmar será dada indicação ao cliente que pode recolher a encomenda.';
    }
    Alert.alert(
      'Encomenda Pronta',
      message,
      [
        {
          text: 'Não',
          onPress: () => console.log('Encomenda não está pronta.'),
          style: 'cancel',
        },
        {
          text: 'Sim',
          onPress: () => {
            database()
              .ref('/order/' + order.key)
              .update({
                status: 'sent',
                readyAt: new Date(),
              });
          },
        },
      ],
      {cancelable: false},
    );
  }

  complete(order: Order) {
    database()
      .ref('/order/' + order.key)
      .update({
        status: 'complete',
        completedAt: new Date(),
      });
  }

  orderWithinDistance(order: Order) {
    if (
      order.restaurantAddress &&
      order.restaurantAddress.coordinates &&
      order.restaurantAddress.coordinates.latitude
    ) {
      const driverRadius =
        (this.state.user && this.state.user.realDeliveryRadius) || 3;
      const distance = this.haversineDistance(
        order.restaurantAddress.coordinates.latitude,
        order.restaurantAddress.coordinates.longitude,
      );
      const isWhithinRadius = distance < driverRadius;
      return isWhithinRadius;
    }
  }

  calculateCost(order) {
    let cost =
      order.total ||
      order.subTotal +
        (order.deliveryFee === 0
          ? 0
          : order.deliveryFee
          ? order.deliveryFee
          : 1.75);
    if (order.promotion && !order.promotion.used) {
      cost -= order.promotion.amount;
    }
    return cost;
  }

  haversineDistance(destLat, destLng) {
    const toRadian = (angle) => (Math.PI / 180) * angle;
    const distance = (a, b) => (Math.PI / 180) * (a - b);
    const RADIUS_OF_EARTH_IN_KM = 6371;

    const dLat = distance(this.state.latitude, destLat);
    const dLon = distance(this.state.longitude, destLng);

    const lat1 = toRadian(this.state.latitude);
    const lat2 = toRadian(destLat);

    // Haversine Formula
    const a =
      Math.pow(Math.sin(dLat / 2), 2) +
      Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.asin(Math.sqrt(a));

    return RADIUS_OF_EARTH_IN_KM * c;
  }

  render() {
    return (
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          {this.state && !this.state.deliveringOrder && (
            <>
              <Paragraph>
                <Text style={styles.label}>Encomendas Pendentes: </Text>
                <Text style={styles.value}>
                  {this.state && this.state.pendingOrders}
                </Text>
              </Paragraph>
              {/*<Paragraph>*/}
              {/*  <Text style={styles.label}>Encomendas em Preparação: </Text>*/}
              {/*  <Text style={styles.value}>*/}
              {/*    {this.state && this.state.viewedOrders}*/}
              {/*  </Text>*/}
              {/*</Paragraph>*/}
              {/*<Paragraph>*/}
              {/*  <Text style={styles.label}>Encomendas para Entrega: </Text>*/}
              {/*  <Text style={styles.value}>*/}
              {/*    {this.state && this.state.preparedOrders}*/}
              {/*  </Text>*/}
              {/*</Paragraph>*/}
            </>
          )}
          {this.state && this.state.deliveringOrder
            ? this.renderOrder(this.state.deliveringOrder)
            : this.state.orders}
        </ScrollView>
      </SafeAreaView>
    );
  }
}
