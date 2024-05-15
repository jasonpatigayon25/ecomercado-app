import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Animated, Alert, Modal, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getDocs, query, collection, where, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import moment from 'moment';
import { getAuth } from 'firebase/auth';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Config from 'react-native-config';
import * as Device from 'expo-device'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const OrderToApproveDetails = ({ route, navigation }) => {
  const { order, products } = route.params;

  const [user, setUser] = useState(null);

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
      if (response.notification.request.content.data.screen === 'OrderHistory') {
        navigation.navigate('OrderHistory');
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


  const approveOrder = async () => {
    Alert.alert(
      "Confirm Approval",
      "Are you sure you want to approve this order?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Approve", 
          onPress: async () => {
            try {
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'Approved'
              });
  
              const auth = getAuth();
              const currentUser = auth.currentUser;
              const userEmail = currentUser ? currentUser.email : '';

              const buyerNotificationMessage = `Your order #${order.id.toUpperCase()} has been approved.`;
              const sellerNotificationMessage = `You approved the #${order.id.toUpperCase()}. Please set for delivery`;
              try {
                await sendPushNotification(order.buyerEmail, 'Order Approved', buyerNotificationMessage, 'OrderHistory');
                await sendPushNotification(userEmail, 'Order Approved', sellerNotificationMessage);
              } catch (error) {
                console.error("Error sending notifications:", error);
                Alert.alert("Error", "Could not send notifications.");
              }
  
              const notificationsRef = collection(db, 'notifications');
              const buyerNotificationData = {
                email: order.buyerEmail,
                text: buyerNotificationMessage,
                timestamp: new Date(),
                type: 'order_approved',
                orderId: order.id
              };
              const sellerNotificationData = {
                email: userEmail,
                text: sellerNotificationMessage,
                timestamp: new Date(),
                type: 'approved_order',
                orderId: order.id
              };
              await addDoc(notificationsRef, buyerNotificationData);
              await addDoc(notificationsRef, sellerNotificationData);
  
              Alert.alert("Order Approved", "The order has been approved successfully.");
              navigation.goBack();
            } catch (error) {
              console.error("Error updating order status: ", error);
              Alert.alert("Error", "Could not approve the order at this time.");
            }
          }
        }
      ]
    );
  };

  const cancelOrder = async () => {
    Alert.alert(
      "Decline Order",
      "Are you sure you want to decline this order?",
      [
        {
          text: "No",
          style: "cancel",
        },
        { 
          text: "Yes", 
          onPress: async () => {
            try {
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'Cancelled',
              });

              const auth = getAuth();
              const currentUser = auth.currentUser;
              const userEmail = currentUser ? currentUser.email : '';

              const buyerNotificationMessage = `Your order #${order.id.toUpperCase()} has been declined.`;
              const sellerNotificationMessage = `You declined order #${order.id.toUpperCase()}.`;
              try {
                await sendPushNotification(order.buyerEmail, 'Order Declined', buyerNotificationMessage, 'OrderHistory');
                await sendPushNotification(userEmail, 'Order Declined', sellerNotificationMessage, 'SellerOrderManagement');
              } catch (error) {
                console.error("Error sending notifications:", error);
                Alert.alert("Error", "Could not send notifications.");
              }

              const notificationsRef = collection(db, 'notifications');
              const buyerNotificationData = {
                email: order.buyerEmail,
                text: buyerNotificationMessage,
                timestamp: new Date(),
                type: 'order_declined',
                orderId: order.id
              };
              const sellerNotificationData = {
                email: userEmail,
                text: sellerNotificationMessage,
                timestamp: new Date(),
                type: 'declined_order',
                orderId: order.id
              };
              await addDoc(notificationsRef, buyerNotificationData);
              await addDoc(notificationsRef, sellerNotificationData);

              Alert.alert(
                "Order Declined",
                "Order has been declined.",
                [
                  { text: "OK", onPress: () => navigation.navigate('SellerOrderManagement') }
                ]
              );
            } catch ( error) {
              console.error("Error updating order status: ", error);
              Alert.alert("Error", "Could not cancel the order at this time.");
            }
          },
        },
      ]
    );
  };

  const hasOutOfStockProduct = order.productDetails.some(item => products[item.productId].quantity === 0);

  const subtotal = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity * products[detail.productId].price,
    0
  );

  const totalItems = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity,
    0
  );

  const goToProductPosts = () => {
    navigation.navigate('ProductPosts');
  };

  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);

  const OutOfStockModal = ({ isVisible, onClose, onCancelOrder, onGoToProductPosts }) => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>One of the products is out of stock.</Text>
            <Text style={styles.modalText}>What would you like to do?</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.goToProductButton]} onPress={onGoToProductPosts}>
                <Text style={styles.goToProductButtonText}>Go to Product Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.declineOrderButton]} onPress={onCancelOrder}>
                <Text style={styles.declineOrderButtonText}>Decline Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <OutOfStockModal
        isVisible={showOutOfStockModal}
        onClose={() => setShowOutOfStockModal(false)}
        onCancelOrder={cancelOrder}
        onGoToProductPosts={goToProductPosts}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Approval Details</Text>
      </View>
      <ScrollView style={styles.container}>
      <View style={styles.orderItemContainer}>
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
          {hasOutOfStockProduct ? (
            <TouchableOpacity style={[styles.outOfStockButton, styles.cancelButton]} onPress={() => setShowOutOfStockModal(true)}>
              <Text style={styles.cancelbuttonText}>Out of Stock</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.approveButton} onPress={approveOrder}>
              <Text style={styles.approveButtonText}>Approve Order</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={cancelOrder}>
            <Text style={styles.cancelbuttonText}>Decline Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    {hasOutOfStockProduct ? (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.outOfStockButton, styles.outButtonMain]} onPress={() => setShowOutOfStockModal(true)}>
            <Text style={styles.outButtonTextMain}>Out of Stock</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.approveButtonMain} onPress={approveOrder}>
            <Text style={styles.approveButtonTextMain}>Approve Order</Text>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: '#4CAF50',
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
  outButtonMain: {
    backgroundColor: '#ff0000',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '80%',
    borderRadius: 10,
  },
  outButtonTextMain: {
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {

  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  goToProductButton: {
    backgroundColor: '#05652D', 
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  goToProductButtonText: {
    color: 'white', 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  declineOrderButton: {
    borderWidth: 2,
    borderColor: 'red',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  declineOrderButtonText: {
    color: 'red', 
    fontWeight: 'bold',
    textAlign: 'center',
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
});

export default OrderToApproveDetails;