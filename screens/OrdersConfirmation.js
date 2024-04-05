import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome';
import { collection, addDoc, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrdersConfirmation = ({ route, navigation }) => {
  const { address, paymentMethod, productDetails = [], shippingFee, totalPrice, totalOrderCount, merchandiseSubtotal } = route.params;

  const handleBackPress = () => {
    navigation.goBack();
  };

  const [orderPlaced, setOrderPlaced] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    registerIndieID(user.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
      .then(() => console.log("Device registered for notifications"))
      .catch(err => console.error("Error registering device:", err));

    return () => {
      unregisterIndieDevice(user.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
        .then(() => console.log("Device unregistered for notifications"))
        .catch(err => console.error("Error unregistering device:", err));
    };
  }, [user.email]);

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

  const handleProceed = async () => {
    if (orderPlaced) {
      alert('Order has already been placed.');
      return;
    }
  
    setOrderPlaced(true);
    setConfirmModalVisible(false);

    try {
      for (const product of productDetails) {
          if (!product.productId || !product.name || product.orderedQuantity === undefined) {
              console.error("Invalid product data:", product);
              Alert.alert('Invalid Data', `Invalid data for product ${product.name || "unknown"}.`);
              setOrderPlaced(false);
              return;
          }

          const productRef = doc(db, 'products', product.productId);
          const productSnapshot = await getDoc(productRef);

          if (!productSnapshot.exists()) {
              Alert.alert('Product Not Found', `Product ${product.name} not found.`);
              setOrderPlaced(false);
              return;
          }

          const currentQuantity = productSnapshot.data().quantity;

          if (currentQuantity < product.orderedQuantity) {
              Alert.alert('Insufficient Stock', `Not enough stock available for ${product.name}.`);
              setOrderPlaced(false);
              return;
          }

          await incrementUserRecommendHit(product.productId);
      }

    
      const orderData = {
        deliveryAddress: address,
        buyerEmail: user.email,
        buyerId: user.uid,
        dateOrdered: new Date(),
        paymentMethod: paymentMethod,
        productDetails: productDetails.map(product => ({
            productId: product.productId,
            // You can include more product details here if necessary
        })),
        status: 'Pending',
        totalItems: totalOrderCount,
        subtotal: merchandiseSubtotal,
        shippingFee: shippingFee,
        totalPrice: totalPrice
    };

    const orderDocRef = await addDoc(collection(db, 'orders'), orderData);
    const orderId = orderDocRef.id;

      const buyerNotificationMessage = `Your order: ${orderId} has been placed.`;
  
      const buyerNotification = {
        email: user.email,
        text: buyerNotificationMessage,
        timestamp: new Date(),
        type: 'buy_sell_order',
        orderId: orderId 
      };
      await addDoc(collection(db, 'notifications'), buyerNotification);
  
      sendPushNotification(user.email, 'Order Placed', buyerNotificationMessage);
  
      for (const product of productDetails) {
        const sellerNotificationMessage = `${user.email} has placed an order (ID: ${orderId}) for your product "${product.name}".`;
  
        const sellerNotification = {
          email: product.seller_email,
          text: sellerNotificationMessage,
          timestamp: new Date(),
          type: 'buy_sell_order',
          orderId: orderId,
          productId: product.productId,
          productName: product.name,
        };
        await addDoc(collection(db, 'notifications'), sellerNotification);
  
        sendPushNotification(product.seller_email, 'New Order Received', sellerNotificationMessage);
      }
  
      // Alert.alert('Order placed successfully!');
      // navigation.navigate('Home');
      setSuccessModalVisible(true);
    } catch (error) {
      console.error('Error placing order: ', error);
      alert('Error placing order. Please try again.');
      setOrderPlaced(false);
    }
  };

  const shouldSendNotification = async (email) => {
    try {
      const sellingNotifications = await AsyncStorage.getItem(`${email}_sellingNotifications`);
      return sellingNotifications === null || JSON.parse(sellingNotifications);
    } catch (error) {
      console.error('Error reading notification settings:', error);
      return true;
    }
  };
  
  const sendPushNotification = async (subID, title, message) => {
    if (!(await shouldSendNotification(subID))) {
      console.log('Notifications are muted for:', subID);
      return;
    }

    const notificationData = {
      subID: subID,
      appId: 18345,
      appToken: 'TdOuHYdDSqcy4ULJFVCN7l',
      title: 'ECOMercado',
      message: message
    };
  
    for (let attempt = 1; attempt <= 3; attempt++) { 
      try {
        await axios.post('https://app.nativenotify.com/api/indie/notification', notificationData);
        console.log('Push notification sent to:', subID);
        break; 
      } catch (error) {
        console.error(`Attempt ${attempt} - Error sending push notification:`, error);
        if (attempt === 3) {
          console.error('Unable to send push notification at this time.'); 
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

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
      {productDetails.map((product, index) => (
        <View key={index} style={styles.productInfoContainer}>
          <View style={styles.productItem}>
            <Image source={{ uri: product.photo }} style={styles.productImage} />
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
              <Text style={styles.productCategory}>{product.category}</Text>
              <Text style={styles.productQty}> x{product.orderedQuantity}</Text>
            </View>
          </View>
        </View>
      ))}
      </View>
      <View style={styles.divider} />

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
          <Text style={styles.labelText}>Shipping Fee:</Text>
          <Text style={styles.infoText}>₱{shippingFee?.toFixed(2) ?? '0.00'}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
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
});

export default OrdersConfirmation;