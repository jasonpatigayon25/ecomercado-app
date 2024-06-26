import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert, Platform, Button } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { collection, addDoc, doc, updateDoc, getDoc, runTransaction, writeBatch, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import Config from 'react-native-config';
import * as Device from 'expo-device'; 
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const OrdersConfirmation = ({ route, navigation }) => {
  const {
    address,
    paymentMethod,
    shippingSubtotal,
    productDetails = [],
    shippingFee,
    totalPrice,
    totalOrderCount,
    merchandiseSubtotal,
    groupedProducts,
    shippingFees
  } = route.params;

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderProductItem = ({ item }) => {
    return (
      <View style={styles.productInfoContainer}>
        <Image source={{ uri: item.photo }} style={styles.productImage} />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₱{(item.price * item.orderedQuantity).toFixed(2)}</Text>
          <Text style={styles.productQuantity}>x{item.orderedQuantity}</Text>
        </View>
      </View>
    );
  };

  const [orderPlaced, setOrderPlaced] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

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

  
  const incrementUserRecommendHit = async (productId) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user logged in");
      return;
    }
  
    const userId = user.uid;
    const userEmail = user.email;
    const hitRef = doc(db, 'userRecommend', userId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const hitDoc = await transaction.get(hitRef);
        const data = hitDoc.data();
        const productHits = data ? (data.productHits || {}) : {};
  
        if (!hitDoc.exists() || (productHits[productId] || 0) < 10) {
          const newCount = (productHits[productId] || 0) + 1;
          productHits[productId] = newCount;
          transaction.set(hitRef, { productHits, userEmail }, { merge: true });
        }
      });
    } catch (error) {
      console.error("Error updating user recommendations:", error);
    }
  };

  const incrementProductHits = async (productId) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error("No user logged in");
        return;
      }

      const userRecommendRef = doc(db, 'userRecommend', user.uid);
      const userRecommendSnapshot = await getDoc(userRecommendRef);
      const userRecommendData = userRecommendSnapshot.data();

      let updatedProductHits;

      if (!userRecommendData) {
        updatedProductHits = { [productId]: 1 };
        await setDoc(userRecommendRef, { productHits: updatedProductHits, userEmail: user.email });
      } else {
        const productHits = userRecommendData.productHits || {};
        updatedProductHits = {
          ...productHits,
          [productId]: (productHits[productId] || 0) + 1,
        };
        await setDoc(userRecommendRef, { productHits: updatedProductHits }, { merge: true });
      }
    } catch (error) {
      console.error("Error updating product count in userRecommend: ", error);
    }
  };

  const handleProceed = async () => {
    if (orderPlaced) {
        Alert.alert('Order already placed');
        return;
    }

    setOrderPlaced(true);
    setConfirmModalVisible(false);

    const batch = writeBatch(db);

    try {
      for (const sellerProducts of Object.values(groupedProducts)) {
        for (const product of sellerProducts) {
          await incrementProductHits(product.productId);
        }
      }

      const cartRef = doc(db, 'carts', user.email);
      const orderHistoryRef = doc(collection(db, 'orderHistory'));
      const allOrderedProductIds = [];
      
        for (const [sellerName, products] of Object.entries(groupedProducts)) {
            const sellerTotal = products.reduce((sum, product) => sum + product.price * product.orderedQuantity, 0);
            const shippingFeeForSeller = shippingFees[sellerName] || 0;
            const totalForSeller = sellerTotal + shippingFeeForSeller;
            const sellerEmail = products[0]?.seller_email;
            

            const orderData = {
                deliveryAddress: address,
                buyerEmail: user.email,
                buyerId: user.uid,
                sellerEmail: sellerEmail,
                dateOrdered: new Date(),
                paymentMethod: paymentMethod,
                productDetails: products.map(product => ({
                    productId: product.productId,
                    orderedQuantity: product.orderedQuantity
                })),
                status: 'Pending',
                shippingFee: shippingFeeForSeller,
                orderTotalPrice: totalForSeller,
            };

            const orderDocRef = await addDoc(collection(db, 'orders'), orderData);
            console.log(`Order placed with ID: ${orderDocRef.id} for seller: ${sellerName}`);
        
            allOrderedProductIds.push(...products.map(product => product.productId));

            // Notification for the buyer
            const buyerNotificationMessage = `You placed your order #${orderDocRef.id.toUpperCase()}, Please wait for approval of ${sellerName}.`;
            const buyerNotificationData = {
                email: user.email,
                text: buyerNotificationMessage,
                timestamp: new Date(),
                type: 'order_placed',
                orderId: orderDocRef.id
            };
            await addDoc(collection(db, 'notifications'), buyerNotificationData);
            sendPushNotification(user.email, 'Order Placed', buyerNotificationMessage, 'OrderHistory');

            // Notification for the seller
            for (const product of products) {
              const sellerNotificationMessage = `${user.email} has placed an order. Order #${orderDocRef.id.toUpperCase()}, please review and approve.`;
                const sellerNotificationData = {
                    email: product.seller_email,
                    text: sellerNotificationMessage,
                    timestamp: new Date(),
                    type: 'new_order',
                    orderId: orderDocRef.id,
                    productId: product.productId,
                    productName: product.name
                };
                await addDoc(collection(db, 'notifications'), sellerNotificationData);
                sendPushNotification(product.seller_email, 'New Order Received', sellerNotificationMessage, 'SellerOrderManagement');
                await incrementUserRecommendHit(product.productId);
            }
        }
        if (allOrderedProductIds.length > 0) {
          const cartSnapshot = await getDoc(cartRef);
          if (cartSnapshot.exists()) {
              const updatedCartItems = cartSnapshot.data().cartItems.filter(
                  item => !allOrderedProductIds.includes(item.productId)
              );
              batch.update(cartRef, { cartItems: updatedCartItems });
              batch.set(orderHistoryRef, {
                  productIds: allOrderedProductIds,
                  buyerEmail: user.email,
              });
          }
      }

      await batch.commit();

        setSuccessModalVisible(true);
        // navigation.navigate('Home'); 
    } catch (error) {
        console.error('Error placing order:', error);
        Alert.alert('Error placing order', 'Please try again.');
        setOrderPlaced(false);
    }
};

  // const shouldSendNotification = async (email) => {
  //   try {
  //     const sellingNotifications = await AsyncStorage.getItem(`${email}_sellingNotifications`);
  //     return sellingNotifications === null || JSON.parse(sellingNotifications);
  //   } catch (error) {
  //     console.error('Error reading notification settings:', error);
  //     return true;
  //   }
  // };
  
  // const sendPushNotification = async (token, title, message) => {
  //   const notificationData = {
  //     to: token, 
  //     notification: {
  //       title: "ECOMercado",
  //       body: message
  //     },
  //     data: {
  //       screen: 'OrderHistory' 
  //     }
  //   };
  
  //   try {
  //     const response = await axios.post('https://fcm.googleapis.com/fcm/send', notificationData, {
  //       headers: {
  //         'Authorization': `key=${Config.FIREBASE_SERVER_KEY}`,
  //         'Content-Type': 'application/json'
  //       }
  //     });
  //     console.log('Push notification sent:', response.data);
  //   } catch (error) {
  //     console.error('Error sending push notification:', error);
  //   }
  // };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity onPress={() => {
          if (orderPlaced) {
            navigation.navigate('Home');
          } else {
            handleBackPress();
          }
        }}>
          <Icon name={orderPlaced ? "home" : "arrow-left"} size={24} color="#05652D" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Confirmation</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.orderItems}>
      {Object.keys(groupedProducts).map((seller, index) => {
          const sellerProducts = groupedProducts[seller];
          const sellerSubtotal = sellerProducts.reduce((sum, product) => sum + (product.price * product.orderedQuantity), 0);
          const sellerShippingFee = shippingFees[seller] || 0;
          const sellerTotal = sellerSubtotal + sellerShippingFee;

          return (
            <View style={styles.itemDisplay} key={seller + index}>
              <View style={styles.sellerHeader}>
                <Icon5 name="store" size={20} color="#05652D" />
                <Text style={styles.sellerName}>{seller}</Text>
              </View>
              {sellerProducts.map((item, itemIndex) => (
                <View key={`product-${seller}-${itemIndex}`}>
                  {renderProductItem({ item })}
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.sellerInfo}>
                <Text style={styles.labelText}>Delivery Fee:</Text>
                <Text style={styles.productsubText}>₱{sellerShippingFee.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.sellerInfo}>
                <Text style={styles.labelText}>Order Total ({sellerProducts.length} item/s):</Text>
                <Text style={styles.productsubText}>₱{sellerTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
            </View>
          );
        })}
      </View>
      <View style={styles.buyerInformation}>
        <Text style={styles.labelText}>Buyer Address:</Text>
        <Text style={styles.addressText}>{address}</Text>
        <View style={styles.divider} />
        <Text style={styles.labelText}>Payment Method:</Text>
        <Text style={styles.infoText}>{paymentMethod}</Text>
        <View style={styles.divider} />
      </View>
      <View style={styles.orderDetails}>
          <Text style={styles.labelText}>Total Items:</Text>
          <Text style={styles.infoText}>{totalOrderCount} items</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.orderDetails}>
          <Text style={styles.labelText}>Merchandise Total:</Text>
          <Text style={styles.infoText}>₱{merchandiseSubtotal?.toFixed(2)}</Text>
        </View>

      <View style={styles.divider} />

        <View style={styles.orderDetails}>
          <Text style={styles.labelText}>Total Delivery Fee:</Text>
          <Text style={styles.infoText}>₱{shippingSubtotal?.toFixed(2) ?? '0.00'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.orderDetails}>
          <Text style={styles.labelText}>Total Payment:</Text>
          <Text style={styles.totalAmount}>₱{totalPrice?.toFixed(2) ?? '0.00'}</Text>
        </View>
      </ScrollView>
      <View style={styles.navbar}>
        <View style={styles.totalPaymentButton}>
          <Text style={styles.totalPaymentLabel}>Total Payment</Text>
          <Text style={styles.totalPaymentAmount}>₱{totalPrice.toFixed(2)}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setConfirmModalVisible(true)} 
          disabled={orderPlaced}
        >
          <View style={[styles.proceedButton, orderPlaced ? styles.disabledButton : null]}>
            <Text style={styles.proceedLabel}>{orderPlaced ? 'Pending' : 'Proceed'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Confirm your order?</Text>
            <TouchableOpacity
              style={{ ...styles.openButton2, backgroundColor: "#fff" }}
              onPress={() => {
                setConfirmModalVisible(!confirmModalVisible);
                handleProceed();
              }}
            >
              <Text style={styles.textStyle1}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.openButton2, backgroundColor: "#05652D", borderWidth: 1,borderColor: "white" }}
              onPress={() => setConfirmModalVisible(!confirmModalVisible)}
            >
              <Text style={styles.textStyle}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Order Has Been Placed!</Text>
            <Icon name="check-circle" size={60} color="white" />
            <Text style={styles.pendingText}>Pending Payment</Text>
            <Text style={styles.subtext}>Go to Order Transaction for more info.</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonHome]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.homeButton}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOrder]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('OrderHistory');
                }}
              >
                <Text style={styles.textButton}>My Order Transactions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  backIcon: {
    marginRight: 10,
  },
  headerText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    marginLeft: 10,
  },
  orderItems: {
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    marginBottom: 15,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 20,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    color: '#666',
  },
  productQuantity: {
    fontSize: 16,
    color: '#666',
  },
  productOrderedPrice: {
    fontSize: 16,
    color: '#05652D',
    fontWeight: 'bold',
  },
  orderSummary: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  orderDetails: {
    //
  },
  totalPaymentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPaymentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPaymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
  },
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    color: '#05652D',
    fontWeight: 'bold',
  },
  productCategory: {
    fontSize: 14,
    color: '#888',
  },
  productQty: {
    fontSize: 14,
    color: '#888',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#D3D3D3',
    backgroundColor: '#FFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  totalPaymentButton: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 80,
  },
  totalPaymentLabel: {
    fontSize: 14,
    color: '#000',
  },
  totalPaymentAmount: {
    fontSize: 24,
    color: '#05652D',
  },
  proceedButton: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  proceedLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#D3D3D3',
    marginVertical: 10,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 80,
  },
  labelText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#05652D',
  },
  infoText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
  },
  addressText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 10,
  },
  totalAmount: {
    marginLeft: 'auto',
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoItem: {
    marginBottom: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    // backgroundColor: 'rgba(0, 0, 0, 0.6)',

  },
  modalView: {
    margin: 20,
    backgroundColor: '#05652D',

    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.25,
    elevation: 5,
  },
  modalText: {
    marginBottom: 18,
    textAlign: "center",
    color: "white",
    fontWeight:'bold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  openButton: {
    backgroundColor: "#F194FF",
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15
  },
  pendingIcon: {
    textAlign: 'center',
  },
  pendingText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 14,
    marginBottom: 20,
    color: "#ffffff",
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 10,
    width: '50%',
  },
  modalButtonHome: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  modalButtonOrder: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  textButton: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  homeButton: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  textStyle1: {
    color: "#05652D",
    fontWeight: "bold",
    textAlign: "center"
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  openButton2: {
    backgroundColor: "#F194FF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20, 
    elevation: 2,
    marginTop: 15,
    minWidth: 100, 
    justifyContent: 'center' 
  },
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10, 
    justifyContent: 'space-between',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    color: '#666',
  },
  productQuantity: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  infoContainer: {
    marginBottom: 20,
  },
  itemDisplay: {
    marginBottom: 10,
  },
  sellerHeader: {
    backgroundColor: '#E8F5E9', 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5, 
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10, 
  },
  productsubText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
  },
});

export default OrdersConfirmation;