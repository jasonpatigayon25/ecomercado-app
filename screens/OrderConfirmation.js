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

const OrderConfirmation = ({ navigation, route }) => {
  const { address, paymentMethod, quantity, totalPrice, productDetails } = route.params;
  const orderedPrice = totalPrice;
  const auth = getAuth();
  const user = auth.currentUser;
  

  const handleBackPress = () => {
    navigation.goBack();
  };

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  useEffect(() => {
    registerIndieID(user.email, 18163, 'IeIDbRMaVFzD4jHv6s5OZk')
      .then(() => console.log("Device registered for notifications"))
      .catch(err => console.error("Error registering device:", err));

    return () => {
      unregisterIndieDevice(user.email, 18163, 'IeIDbRMaVFzD4jHv6s5OZk')
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
      Alert.alert('Order has already been placed.');
      return;
    }
  
    setOrderPlaced(true); 
  
    try {
      const productRef = doc(db, 'products', productDetails.productId);
      const productSnapshot = await getDoc(productRef);
  
      if (!productSnapshot.exists()) {
        Alert.alert('Product not found.');
        setOrderPlaced(false);
        return;
      }
  
      const currentQuantity = productSnapshot.data().quantity;
      if (currentQuantity < quantity) {
        Alert.alert('Not enough quantity available.');
        setOrderPlaced(false);
        return;
      }
  
      await updateDoc(productRef, {
        quantity: currentQuantity - quantity
      });
  
      const orderDocRef = await addDoc(collection(db, 'orders'), {
        buyer: {
          uid: user.uid,
          email: user.email,
        },
        address,
        paymentMethod,
        orderedQuantity: quantity,
        orderedPrice,
        totalPrice,
        productDetails,
        status: 'Pending',
        dateOrdered: new Date(),
      });

      const orderId = orderDocRef.id;

      const buyerNotificationMessage = `Your order: ${orderId} has been placed.`;

      const sellerNotificationMessage = `${user.email} has placed an order (ID: ${orderId}) for your product "${productDetails.name}".`;

      const buyerNotification = {
        email: user.email,
        text: buyerNotificationMessage,
        timestamp: new Date(),
        type: 'buy_sell_order',
        productName: productDetails.name,
        productCategory: productDetails.category,
        productPrice: productDetails.price,
        quantityOrdered: quantity,
        totalCost: totalPrice,
        orderId: orderId
      };
      await addDoc(collection(db, 'notifications'), buyerNotification);
  
      // Send notification to the seller in Firestore
      const sellerNotification = {
        email: productDetails.seller_email,
        text: sellerNotificationMessage,
        timestamp: new Date(),
        type: 'buy_sell_order',
        productName: productDetails.name,
        productCategory: productDetails.category,
        productPrice: productDetails.price,
        quantityOrdered: quantity,
        totalCost: totalPrice,
        orderId: orderId
      };
      await addDoc(collection(db, 'notifications'), sellerNotification);
  
      sendPushNotification(user.email, 'Order Placed', buyerNotificationMessage);
      sendPushNotification(productDetails.seller_email, 'New Order Received', sellerNotificationMessage);

      await incrementUserRecommendHit(productDetails.productId);
  
      Alert.alert('Order placed successfully!');
      navigation.navigate('Home');
  
    } catch (error) {
      console.error('Error placing order: ', error);
      Alert.alert('Error placing order. Please try again.');
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
      appId: 18163,
      appToken: 'IeIDbRMaVFzD4jHv6s5OZk',
      title: title,
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
  
  const [orderPlaced, setOrderPlaced] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Confirmation</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.productInfoContainer}>
          <Image source={{ uri: productDetails.photo }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{productDetails.name}</Text>
            <Text style={styles.productPrice}>₱{productDetails.price.toFixed(2)}</Text>
            <Text style={styles.productCategory}>{productDetails.category}</Text>
          </View>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.divider} />
          <Text style={styles.labelText}>Buyer Address:</Text>
          <Text style={styles.infoText}>{address}</Text>
          <View style={styles.divider} />
          <Text style={styles.labelText}>Payment Method:</Text>
          <Text style={styles.infoText}>{paymentMethod}</Text>
          <View style={styles.divider} />
          <Text style={styles.labelText}>Quantity:</Text>
          <Text style={styles.quantityText}>{quantity}</Text>
          <View style={styles.divider} />
          <Text style={styles.labelText}>Order/s Amount:</Text>
          <Text style={styles.priceText}>₱{orderedPrice.toFixed(2)}</Text>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Text style={styles.labelText}>Total Payment:</Text>
            <Text style={styles.totalAmount}>₱{totalPrice.toFixed(2)}</Text>
          </View>
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
              style={{ ...styles.openButton, backgroundColor: "#fff" }}
              onPress={() => {
                setConfirmModalVisible(!confirmModalVisible);
                handleProceed();
              }}
            >
              <Text style={styles.textStyle1}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.openButton, backgroundColor: "#05652D", borderWidth: 1,borderColor: "white" }}
              onPress={() => setConfirmModalVisible(!confirmModalVisible)}
            >
              <Text style={styles.textStyle}>Cancel</Text>
            </TouchableOpacity>
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
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: 100,
    height: 100,
    marginRight: 20,
    borderRadius: 10,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    color: '#05652D',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#05652D',
    fontWeight: 'bold',
  },
  productCategory: {
    fontSize: 16,
    color: '#888',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoItem: {
    marginBottom: 10,
  },
  labelText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#05652D',
  },
  infoText: {
    fontSize: 16,
    color: '#000',
  },
  confirmationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 20,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    marginLeft: 10,
  },
  priceText:{
    marginLeft: 'auto',
  },
  quantityText: {
    marginLeft: 'auto',
  },
  totalAmount: {
    marginLeft: 'auto',
    fontSize: 20,
  },
  greySpace: {
    backgroundColor: '#F5F5F5',
    height: 10,
    marginVertical: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    width: '80%',
    margin: 20,
    backgroundColor: '#05652D',
    paddingTop: 20, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  openButton: {
    backgroundColor: "#F194FF",
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  textStyle1: {
    color: "#05652D",
    fontWeight: "bold",
    textAlign: "center"
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
});

export default OrderConfirmation;