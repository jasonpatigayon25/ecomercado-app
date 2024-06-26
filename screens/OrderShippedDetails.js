import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, SafeAreaView, Platform, Alert, Modal, Button, Animated} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, getDoc, doc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import moment from 'moment';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';  

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const OrderShippedDetails = ({ route, navigation }) => {
  const { order, products } = route.params;

  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);
  

  useEffect(() => {
    checkIfTimeExceeded();
  }, []);  

  
  const checkIfTimeExceeded = async () => {
    const currentTime = new Date();
  
    if (order.deliveredStatus === 'Processing') {
      const deliveryEndTime = moment(order.deliveryEnd.toDate()).add(1, 'day');
      if (currentTime > deliveryEndTime && order.status !== 'Approved') {
        try {
          const orderRef = doc(db, 'orders', order.id);
          await updateDoc(orderRef, { status: 'Approved' });
          Alert.alert(
            'Time Exceeded',
            'The delivery time has already exceeded. The order has been automatically moved back to the Deliver tab. Please set the delivery time again.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SellerOrderManagement'),
              },
            ]
          );
        } catch (error) {
          console.error('Error updating order status:', error);
        }
      }
    } else if (order.deliveredStatus === 'Waiting') {
      const threeDaysAgo = moment().subtract(3, 'days');
      const dateDelivered = moment(order.dateDelivered.toDate());
      if (dateDelivered.isBefore(threeDaysAgo)) {
        Alert.alert(
          'Confirmation Reminder',
          "Buyer hasn't confirmed the receipt yet. Did you receive the payment from the buyer? Confirm to complete the order.",
          [
            {
              text: 'No',
              onPress: () => console.log('Confirmation reminder acknowledged.'),
            },
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  // Update order status and deduct ordered quantity from stock
                  const orderRef = doc(db, 'orders', order.id);
                  await updateDoc(orderRef, { 
                    status: 'Completed',
                    deliveredStatus: 'Confirmed',
                    dateReceived: new Date(),
                  });
                  
                  // deduct ordered quantity from product quantity
                  for (const item of order.productDetails) {
                    const productId = item.productId;
                    const orderedQuantity = item.orderedQuantity;
                  
                    const productDoc = await getDoc(doc(db, 'products', productId));
                    const currentStock = productDoc.data().quantity;
                  
                    const newStock = currentStock - orderedQuantity;
                  
                    await updateDoc(doc(db, 'products', productId), {
                      quantity: newStock
                    });
                  }
                  
                  Alert.alert("Order Completed!");
                  navigation.navigate('SellerOrderManagement');
                } catch (error) {
                  console.error("Error updating request status:", error);
                }
              },
            },
          ]
        );
      }
    }
  };

  useEffect(() => {
    if (route.params?.shouldOpenConfirmModal) {
      confirmDelivery();
    }
  }, [route.params?.shouldOpenConfirmModal]);

  const [deliveredStatus, setDeliveredStatus] = useState(order.deliveredStatus);

  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnimation, {
          toValue: -1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnimation]);

  const rotate = rotateAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });


  const subtotal = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity * products[detail.productId].price,
    0
  );

  const totalItems = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity,
    0
  );

  const [expoPushToken, setExpoPushToken] = useState("");

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      console.log('Push notification token:', token);
      setExpoPushToken(token);
    });

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const screen = response.notification.request.content.data.screen;
      switch(screen) {
        case 'OrderHistory':
          navigation.navigate('OrderHistory');
          break;
        case 'SellerOrderManagement':
          navigation.navigate('SellerOrderManagement');
          break;
        default:
          break;
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;
  
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notification!");
        return;
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: "9c6726c2-1c49-48e9-8467-40c38c0776ee",
        })
      ).data;
      console.log(token);
    } else {
      alert("Must use physical device for Push Notifications");
    }
  
    return token;
  }

  async function sendPushNotification(email, title, message, screen) {
    if (!expoPushToken) {
      console.log('No Expo Push Token found, cannot send notification.');
      return;
    }
  
    const notificationData = {
      to: expoPushToken,
      sound: "default",
      title: title,
      body: message,
      data: { screen: screen }
    };
  
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
      const responseData = await response.json();
      console.log('Push notification sent:', responseData);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  const confirmDelivery = async () => {
    Alert.alert(
      "Confirm Delivery",
      "Are you sure you want to confirm this delivery?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Delivery confirmation canceled."),
          style: "cancel"
        },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, { 
                deliveredStatus: 'Waiting',
                dateDelivered: new Date() 
            });
                           const auth = getAuth();
                            const currentUser = auth.currentUser;
                            const userEmail = currentUser ? currentUser.email : '';

                            const buyerNotificationMessage = `Your order #${order.id.toUpperCase()} has been marked as delivered. Please confirm receipt if you've received it.`
                            const sellerNotificationMessage = `You've confirmed the order #${order.id.toUpperCase()} has been delivered. Please wait buyer's confirmation.`
                            try {
                              await sendPushNotification(order.buyerEmail, 'Order Receive Confirmation', buyerNotificationMessage, 'OrderHistory');
                              await sendPushNotification(userEmail, 'Order Delivered', sellerNotificationMessage, 'SellerOrderManagement');
                            } catch (error) {
                              console.error("Error sending notifications:", error);
                              Alert.alert("Error", "Could not send notifications.");
                            }
                
                            const notificationsRef = collection(db, 'notifications');
                            const buyerNotificationData = {
                              email: order.buyerEmail,
                              text: buyerNotificationMessage,
                              timestamp: new Date(),
                              type: 'order_receive',
                              orderId: order.id
                            };
                            const sellerNotificationData = {
                              email: userEmail,
                              text: sellerNotificationMessage,
                              timestamp: new Date(),
                              type: 'receive_order',
                              orderId: order.id
                            };
                            await addDoc(notificationsRef, buyerNotificationData);
                            await addDoc(notificationsRef, sellerNotificationData);
                            
            setDeliveredStatus('Waiting');
              Alert.alert("Delivery Confirmed!");
            } catch (error) {
              console.error("Error updating request status:", error);
            }
          }
        }
      ]
    );
  };

  const handleChatWithBuyer = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    if (order.buyerEmail === user.email) {
      Alert.alert("You are trying to chat with yourself.");
      return;
    }
  
    const buyerEmail = order.buyerEmail;
    const sellerEmail = user.email;
  
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('users', 'array-contains', sellerEmail));
      const querySnapshot = await getDocs(q);
  
      let existingChatId = null;
  
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(buyerEmail)) {
          existingChatId = doc.id;
        }
      });
  
      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: buyerEmail,
        });
      } else {
        const newChatRef = collection(db, 'chats');
        const newChat = {
          users: [sellerEmail, buyerEmail],
          messages: [],
        };
  
        const docRef = await addDoc(newChatRef, newChat);
        navigation.navigate('Chat', {
          chatId: docRef.id,
          receiverEmail: buyerEmail,
        });
      }
    } catch (error) {
      console.error('Error handling chat with buyer:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
      </View>
      <ScrollView style={styles.container}>
      <View style={styles.orderItemContainer}>
      <LinearGradient
          colors={['#C1E1C1', '#478778']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.deliveryInfoContainer}>
          <Text style={styles.deliveryInfoText}>
            You set the delivery between{'\n\n'}
            {order.deliveryStart?.toDate() ? moment(order.deliveryStart.toDate()).format('DD MMM YYYY') : 'N/A'} and {order.deliveryEnd?.toDate() ? moment(order.deliveryEnd.toDate()).format('DD MMM YYYY') : 'N/A'}
            </Text>
          <MaterialIcons name="local-shipping" size={40} color="#FFF" style={styles.deliveryIcon} />
        </LinearGradient>
      <View style={styles.deliveryAddress}>
            <Text style={styles.orderTotalLabel}>Delivery Address</Text>
            <View style={styles.orderTotalRow}>
                <MaterialIcons name="location-on" size={20} color="#333" />
                <Text style={styles.orderTotalValue}>{order.deliveryAddress}</Text>
            </View>
        </View>
        <View style={styles.buyerHeader}>
            <Icon name="money" size={20} color="#808080" style={styles.shopIcon} />
                <Text style={styles.buyerName}>{order.buyerEmail}</Text>
         </View>
        {order.productDetails.map((item, index) => {
          const product = products[item.productId];
          return (
            <View key={index} style={styles.productContainer}>

              <TouchableOpacity 
                onPress={() => navigation.navigate('ViewerImage', { imageUrl: product.photo })}
                  >
              <Image source={{ uri: product.photo }} style={styles.productImage} />
              </TouchableOpacity>
              <View style={styles.productInfo}>
                <Text style={styles.orderId}>Order ID: #{order.id.toUpperCase()}</Text>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text> 
                <Text style={styles.productQuantity}>x{item.orderedQuantity}</Text>
                <Text style={styles.productPrice}>₱{product.price}</Text>
              </View>
            </View>
          );
        })}
        <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                <Text style={styles.paymentMethodValue}>{order.paymentMethod}</Text>
            </View>
            <View style={styles.orderTotalSection}>
                <Text style={styles.orderTotalLabel}>ORDER TOTAL</Text>
                <View style={styles.orderTotalDetails}>
                <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalText}>
                    Merchandise Subtotal: <Text style={styles.itemsText}>({totalItems} items)</Text>
                </Text>
                    <Text style={styles.orderTotalValue}>₱{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalText}>Delivery Fee:</Text>
                    <Text style={styles.orderTotalValue}>₱{order.shippingFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalTextFinal}>Total:</Text>
                    <Text style={styles.orderTotalValueFinal}>₱{order.orderTotalPrice.toFixed(2)}</Text>
                </View>
                </View>
            </View>
            <View style={styles.orderInfo}>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{order.id.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Time:</Text>
                <Text style={styles.detailValue}>
                {moment(order.dateOrdered.toDate()).format('DD-MM-YYYY HH:mm')}
                </Text>
            </View>
            </View>
            <View style={styles.totalPriceContainer}>
            <Text style={styles.totalLabelHeader}>PAYMENT</Text>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{order.orderTotalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Deducted Delivery Fee</Text>
              <Text style={[styles.totalValue, styles.deliveryFeeValue]}>- ₱{order.shippingFee.toFixed(2)}</Text>
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabelFinal}>Final Payment</Text>
              <Text style={[ styles.youReceiveValue]}>₱{(order.orderTotalPrice - order.shippingFee).toFixed(2)}</Text>
            </View>
          </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.contactButton} onPress={handleChatWithBuyer}>
            <Text style={styles.buttonText}>Contact Buyer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
      <View style={styles.footer}>
        {deliveredStatus === 'Waiting' ? (
            <TouchableOpacity style={[styles.pendingButton, { backgroundColor: '#666' }]} disabled>
                <Text style={styles.pendingButtonText}>Pending for Buyer to Confirm</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Icon name="hourglass-half" size={24} color="#fff" />
                </Animated.View>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity
                style={styles.approveButtonMain}
                onPress={confirmDelivery}
            >
                <Text style={styles.approveButtonTextMain}>Confirm Delivered Order</Text>
            </TouchableOpacity>
        )}
    </View>
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
      },
    container: {
      flex: 1,
      backgroundColor: '#F8F8F8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
      },
    title: {

      fontSize: 20,
      fontWeight: 'bold',
      marginLeft: 20,
    },
    orderItemContainer: {
      backgroundColor: '#FFFFF0',
      padding: 10,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    productContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 30,
      paddingBottom: 5,
      paddingHorizontal: 5,
      borderBottomWidth: 1,  
      borderBottomColor: '#ccc',
      backgroundColor: '#FAF9F6',  
    },
    productImage: {
      width: 80,
      height: 80,
      borderRadius: 10,
      marginRight: 10,
    },
    productInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    productName: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    productPrice: {
      color: '#05652D',
      fontSize: 14,
      marginTop: 5,
      textAlign: 'right',
      fontWeight: 'bold',
    },
    productQuantity: {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 5,
      textAlign: 'right',
    },
    totalPriceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,  
      borderBottomColor: '#ccc',
    },
    orderTotalSection: {
        marginTop: 20,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderTopWidth: 1, 
        borderBottomWidth: 1,  
        borderColor: '#ccc',
      },
      orderTotalDetails: {
        marginTop: 10,
      },
      orderTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
      },
      orderTotalText: {
        fontSize: 14,
        color: '#666',
      },
      orderTotalTextFinal: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
      },
      orderTotalValue: {
        fontSize: 14,
        color: '#666',
      },
      orderTotalValueFinal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
      },
    orderTotalLabel: {
      fontSize: 16,
      color: '#000', 
      marginBottom: 10,
    },
    orderTotalPrice: {
      fontWeight: 'bold',
      fontSize: 18,
      color: '#05652D', 
      marginBottom: 10,
    },
    emptyOrdersContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
    },
    emptyOrdersText: {
      fontSize: 20,
      color: '#ccc',
    },
    sellerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#E8F5E9',
      padding: 8,
      marginTop: 10,
    },
    sellerName: {
      fontWeight: 'bold',
      color: '#333',
      fontSize: 16,
      flex: 1,
      textAlign: 'left', 
      marginLeft: 10,
    },
    productCategory: {
      fontSize: 12,
      color: '#666',
      backgroundColor: '#ECECEC',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      alignSelf: 'flex-start', 
      overflow: 'hidden', 
      marginVertical: 4, 
      marginHorizontal: 2, 
      textAlign: 'center',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
    },
    loadingIndicator: {
      marginTop: 50,
  },
  emptyOrdersContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
  },
  emptyOrdersText: {
      fontSize: 16,
      color: '#ccc',
      textAlign: 'center',
  },
  visitButton: {
    position: 'absolute',
    right: 8,
    top: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#05652D',
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderInfo: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  actionButtons: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    backgroundColor: '#0096FF',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    elevation: 2,
  },
  cancelButton: {
    borderColor: 'red',
    borderWidth: 2,
    padding: 15,
    borderRadius: 5,
    flex: 1,
  },
  contactbuttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  cancelbuttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff0000',
    textAlign: 'center',
  },
  totalPriceContainer: {
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 20,
    borderBottomWidth: 1,
  },
  orderTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTotalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  detailRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: { 
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  itemsText: {
    fontSize: 14,
    color: '#333',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: -2 },
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    elevation: 2,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  buyerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    padding: 8,
    marginTop: 10,
  },
  buyerName: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
    flex: 1,
    textAlign: 'left', 
    marginLeft: 10,
  },
  approveButtonMain: {
    backgroundColor: '#ccc',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '80%',
    borderRadius: 10,
  },
  approveButtonTextMain: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderId: {
    color: '#333',
    fontSize: 12,
    paddingHorizontal: 6,
    borderRadius: 4,
    textAlign: 'right',
    top: -10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalBottomView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalInnerView: {
    width: '100%',
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontWeight: 'bold'
  },
  modalDescription: {
    marginBottom: 15,
    textAlign: "center"
  },
  datePickerButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50', 
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  confirmButtonText: {
    color: '#FFFFFF', 
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  deliveryInfoText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deliveryIcon: {
    backgroundColor: '#000000',
    borderRadius: 30,
    top: -32,
  },
  deliveryAddress: {
    marginTop: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1, 
    borderBottomWidth: 1,  
    borderColor: '#ccc',
  },
  pendingButton: {
    backgroundColor: '#666',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '90%',
    borderRadius: 10,
  },
  pendingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  approveButtonMain: {
    backgroundColor: '#4CAF50',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '90%',
    borderRadius: 10,
  },
  approveButtonTextMain: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 15,
    color: '#808080', 
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deliveryFeeValue: {
    color: '#666',
  },
  youReceiveValue: {
    color: '#05652D', 
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalLabelHeader: {
    fontSize: 15,
    marginHorizontal: 10,
    fontWeight: 'bold',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});

export default OrderShippedDetails;
