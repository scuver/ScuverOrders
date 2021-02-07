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
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import {User} from '../model/user';

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
      .where('shopId', '==', this.state.shop.uid)
      .get()
      .then((s) => {
        const orders = [];
        let pendingOrders = 0;
        let viewedOrders = 0;
        let preparedOrders = 0;
        let deliveringOrder = null;
        s.docs.forEach((doc) => {
          const order: Order = doc.data();
          if (order.status !== 'completed') {
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
                  : order.status === 'ready'
                  ? styles.stateReady
                  : styles.stateViewed
              }>
              {states[order.status || 'pending']}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Hora de Entrega (no cliente): </Text>
            <Text style={styles.value}>{order.arrivalExpectedAt}</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Referência: </Text>
            <Text style={styles.value}>{order.uid}</Text>
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
            <Text style={styles.value}>€{order.subTotal} (s/entrega)</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Notas: </Text>
            <Text style={styles.value}>{order.notes}</Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Cliente: </Text>
            <Text style={styles.value}>
              {(order.user && order.user.name) || 'Não registou nome.'}
            </Text>
          </Paragraph>
          <Paragraph style={styles.paragraph}>
            <Text style={styles.label}>Telefone Cliente: </Text>
            <Text style={styles.value}>{order.phoneNumber}</Text>
          </Paragraph>
          {order.type === 'delivery' &&
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
    let message = 'Confirma que irá começar a preparar a encomenda?';
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
