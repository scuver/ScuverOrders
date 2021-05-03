import React from 'react';
import {Button, Card, Paragraph, Text} from 'react-native-paper';
import {
  Alert,
  AppState,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {Order} from '../model/order';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import {User} from '../model/user';
import {Player} from '@react-native-community/audio-toolkit';
const Sound = require('react-native-sound');

Sound.setCategory('Alarm');

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
  opcao: {
    fontSize: 16,
    marginTop: '10%',
    color: '#50959d',
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
  notes: {
    fontSize: 20,
    marginTop: '10%',
    color: '#d55e1b',
  },
  hora: {
    fontSize: 20,
    textDecorationLine: 'underline',
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
  backgroundInterval;
  foregroundInterval;
  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      user: null,
      viewedOrders: 0,
      preparedOrders: 0,
      appState: AppState.currentState,
      player: new Player('whoosh.mp3', {
        continuesToPlayInBackground: true,
      }),
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
    AppState.addEventListener('change', this._handleAppStateChange);
    AsyncStorage.setItem('state', 'foreground');
    if (this.foregroundInterval) {
      clearInterval(this.foregroundInterval);
    }
    this.foregroundInterval = setInterval(() => {
      if (
        this.state.appState === 'active' ||
        this.state.appState === 'foreground'
      ) {
        if (this.state.pendingOrders) {
          // this.player = new Player('whoosh.mp3', {
          //   continuesToPlayInBackground: false,
          // });
          this.state.player.looping = true;
          this.state.player.play();
        } else {
          this.state.player.looping = false;
          this.state.player?.pause();
          if (!this.state.pendingOrders) {
            AsyncStorage.setItem('stop', 'true');
          }
        }
      }
    }, 5000);
  }

  _handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      AsyncStorage.setItem('state', 'foreground');
    } else {
      AsyncStorage.setItem('state', 'background');
      if (this.state.player) {
        this.state.player.looping = false;
        this.state.player.pause();
      }
    }
    this.setState({appState: nextAppState});
  };

  componentWillUnmount() {
    this._unsubscribe();
    AppState.removeEventListener('change', this._handleAppStateChange);
    if (this.foregroundInterval) {
      clearInterval(this.foregroundInterval);
    }
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
    }
  }

  getCurrentUser() {
    const self = this;
    AsyncStorage.getItem('user').then((u: any) => {
      const authUser = u && JSON.parse(u).user;

      if (authUser) {
        firestore()
          .collection('users')
          .where('email', '==', authUser.email.toLowerCase().trim())
          .get()
          .then((u) => {
            const user: User = u.docs[0] && u.docs[0].data();
            if (user) {
              firestore()
                .collection('shops')
                .doc(user.shopId)
                .get()
                .then((s) => {
                  const shop = s.data();
                  if (shop) {
                    this.setState({user, shop}, () => {
                      this.initMessaging.bind(self)();
                      this.subscribeOrders.bind(self)();
                    });
                  }
                });
            }
          });
      } else {
        this.props.navigation.navigate('Login');
      }
    });
  }

  initMessaging() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!');
      if (this.state.appState === 'background') {
        this.state.player.looping = true;
        this.state.player.play();
        AsyncStorage.removeItem('stop');
        let interval = setInterval(() => {
          AsyncStorage.getItem('stop').then((stop) => {
            if (stop) {
              this.state.player.looping = false;
              this.state.player?.pause();
              clearInterval(interval);
            } else {
              this.state.player.looping = true;
              this.state.player.play();
            }
          });
        }, 5000);
      }
      this.state.player.play();
      AsyncStorage.getItem('state').then((state) => {
        this.state.player.looping = true;
        this.state.player.play();
        if (state === 'background') {
          this.state.player.looping = true;
          this.state.player.play();
        } else {
          if (this.state.player) {
            this.state.player.looping = false;
            this.state.player.pause();
          }
        }
      });
    });

    AsyncStorage.getItem('fcm_token_scuver_order').then((u: any) => {
      console.log('u', u);
      if (!u) {
        console.log('Getting Firebase Token');
        messaging()
          .getToken()
          .then((fcmToken) => {
            if (fcmToken) {
              console.log('Your Firebase Token is:', fcmToken);
              AsyncStorage.setItem('fcm_token_scuver_order', fcmToken);
              let tks = this.state.shop.fcmTokens;
              if (!tks) {
                tks = [];
              }
              tks.push(fcmToken);
              firestore().collection('shops').doc(this.state.shop.uid).update({
                fcmTokens: tks,
              });
            } else {
              console.log('Failed', 'No token received');
            }
          });
      }
    });
  }

  subscribeOrders() {
    firestore()
      .collection('orders')
      .where('shop.uid', '==', this.state.shop.uid)
      .where('status', 'in', ['pending', 'viewed', 'ready', 'bringing'])
      .onSnapshot((s) => {
        const orders = [];
        let pendingOrders = 0;
        let viewedOrders = 0;
        let preparedOrders = 0;
        s.docs.forEach((doc) => {
          const order: Order = doc.data();
          order.status === 'pending'
            ? pendingOrders++
            : order.status === 'viewed'
            ? viewedOrders++
            : preparedOrders++;
          orders.push(this.renderOrder(order));
        });
        this.setState({
          orders,
          pendingOrders,
          viewedOrders,
          preparedOrders,
        });
      });
  }

  renderOrder(order: Order) {
    return (
      <Card key={order.uid} style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Estado: </Text>
            <Text
              style={
                order.status === 'pending'
                  ? styles.statePending
                  : order.status === 'ready'
                  ? styles.stateReady
                  : styles.stateViewed
              }>
              {states[order.status || 'pending']}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Hora de Entrega (no cliente): </Text>
            <Text style={styles.hora}>
              {order.arrivalExpectedAt.substring(
                order.arrivalExpectedAt.length - 5,
              )}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Referência: </Text>
            <Text style={styles.value}>
              {order.uid?.substring(order.uid.length - 4)}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Artigos: </Text>
            <Text>
              {order.orderItems.map((o) => {
                return (
                  <Paragraph style={styles.artigo} key={o.key}>
                    {'\n\t\t'}
                    {o.quantity} x {o?.name} - €{o.price.toFixed(2)} (cada)
                    {o.optionsSelected &&
                      o.optionsSelected.map((p) => {
                        return (
                          <>
                            {'\n\t\t\t\t'}
                            {p && p.map ? (
                              p.map((opt) => {
                                return (
                                  <Text style={styles.opcao}>
                                    {opt?.quantity} x {opt?.name}
                                  </Text>
                                );
                              })
                            ) : (
                              <Text style={styles.opcao}>
                                {p?.quantity} x {p?.name}
                              </Text>
                            )}
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
            <Text style={styles.value}>€{order.subTotal} (s/entrega)</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Notas: </Text>
            <Text style={styles.notes}>{order.notes}</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Cliente: </Text>
            <Text style={styles.value}>
              {(order.user && order.user.name) || 'Não registou nome.'} -{' '}
              <Text
                style={styles.link}
                onPress={() =>
                  Linking.openURL(`tel:${order.user.phoneNumber}`)
                }>
                {order.user.phoneNumber}
              </Text>
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Telefone Cliente: </Text>
            <Text style={styles.value}>{order.phoneNumber}</Text>
          </Paragraph>
          {order.type === 'delivery' && order.driver && (
            <>
              <Paragraph style={styles.paragraph}>
                <Text style={styles.label}>Estafeta: </Text>
                <Text style={styles.value}>
                  {order.driver.name || order.driver.email} -{' '}
                  <Text
                    style={styles.link}
                    onPress={() =>
                      Linking.openURL(`tel:${order.driver.phoneNumber}`)
                    }>
                    {order.driver.phoneNumber}
                  </Text>
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
          {order.type !== 'delivery' &&
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

  viewed(order: Order) {
    let message = 'Confirma que visualizou a encomenda?';
    Alert.alert(
      'Começar Encomenda',
      message,
      [
        {
          text: 'Não',
          onPress: () => console.log('Não começa.'),
          style: 'cancel',
        },
        {
          text: 'Sim',
          onPress: () => {
            order.log.push('Viewed at ' + new Date());
            order.status = 'viewed';
            firestore().collection('orders').doc(order.uid).update({
              log: order.log,
              status: order.status,
            });
          },
        },
      ],
      {cancelable: false},
    );
  }

  ready(order: Order) {
    let message =
      'Confirma que a encomenda está pronta para entrega (ou estará pronta em menos de 10 minutos)?';
    if (order.type === 'delivery') {
      message +=
        '\n\nAo confirmar irá ser chamado um estafeta para recolher a encomenda.';
    }
    if (order.type !== 'delivery') {
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
            order.log.push('Ready at ' + new Date());
            order.status = 'ready';
            firestore().collection('orders').doc(order.uid).update({
              log: order.log,
              status: order.status,
            });
          },
        },
      ],
      {cancelable: false},
    );
  }

  complete(order: Order) {
    order.log.push('Completed at ' + new Date());
    order.status = 'completed';
    firestore().collection('orders').doc(order.uid).update({
      log: order.log,
      status: order.status,
    });
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
            </>
          )}
          {this.state && this.state.orders}
        </ScrollView>
      </SafeAreaView>
    );
  }
}
