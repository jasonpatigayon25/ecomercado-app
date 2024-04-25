import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Modal, Alert, TextInput, Animated } from 'react-native';
import { Rating } from 'react-native-ratings';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getDocs, query, collection, where, updateDoc, doc, addDoc, writeBatch, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../config/firebase';
import moment from 'moment';
import { LinearGradient } from 'expo-linear-gradient'; 
import CameraIcon from 'react-native-vector-icons/MaterialIcons';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const OrderToReceiveDetails = ({ route, navigation }) => {
  const scrollViewRef = useRef();
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const { order, products } = route.params;
  const [sellerName, setSellerName] = useState('...');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [user, setUser] = useState(null); 

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});

  const [deliveredStatus, setDeliveredStatus] = useState(order.deliveredStatus);
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  const deliveringIcon = require('../assets/fast-delivery.png');

  useEffect(() => {
    const orderRef = doc(db, 'orders', order.id);
    const unsubscribe = onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDeliveredStatus(data.deliveredStatus);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (deliveredStatus === 'Processing') {
      Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true
        }),
        { iterations: -1 }
      ).start();
    } else {
      Animated.timing(rotateAnimation).stop();
    }
  }, [deliveredStatus]);

  const moveCar = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20] 
  });

  useEffect(() => {
    if (route.params.shouldOpenConfirmModal) {
      setModalVisible(true);
    }
  }, [route.params.shouldOpenConfirmModal]);

  useEffect(() => {

    const initialRatings = {};
    const initialComments = {};
    order.productDetails.forEach(item => {
      initialRatings[item.productId] = 0; 
      initialComments[item.productId] = ''; 
    });
    setRatings(initialRatings);
    setComments(initialComments);
  }, [order.productDetails]);

  
  useEffect(() => {
    const fetchSellerName = async () => {
      if (order.sellerEmail) {
        const sellersQuery = query(collection(db, 'registeredSeller'), where('email', '==', order.sellerEmail));
        const querySnapshot = await getDocs(sellersQuery);
        querySnapshot.forEach((doc) => {
          if (doc.exists()) {
            setSellerName(doc.data().sellerName);
          }
        });
      }
    };
    fetchSellerName();
  }, [order.sellerEmail]);

  const handleChatWithSeller = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    if (order.sellerEmail === user.email) {
      Alert.alert("You are trying to chat about your product.");
      return;
    }

    const sellerEmail = order.sellerEmail;
    const buyerEmail = user.email;

    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('users', 'array-contains', buyerEmail));
      const querySnapshot = await getDocs(q);

      let existingChatId = null;

      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(sellerEmail)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: sellerEmail,
        });
      } else {
        const newChatRef = collection(db, 'chats');
        const newChat = {
          users: [buyerEmail, sellerEmail],
          messages: [],
        };

        const docRef = await addDoc(newChatRef, newChat);
        navigation.navigate('Chat', {
          chatId: docRef.id,
          receiverEmail: sellerEmail,
        });
      }
    } catch (error) {
      console.error('Error handling chat with seller:', error);
    }
  };

  // 
  const subtotal = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity * products[detail.productId].price,
    0
  );

  const totalItems = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity,
    0
  );

  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log(e);
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  
    const storage = getStorage();
    const storageRef = ref(storage, `uploads/${Date.now()}`);
    await uploadBytes(storageRef, blob);
  
    blob.close();
  
    return await getDownloadURL(storageRef);
  };

  const pickImage = async (type) => {
  let result;
  if (type === 'camera') {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  }

  if (!result.canceled && result.assets && result.assets[0].uri) {
    const uploadUrl = await uploadImageAsync(result.assets[0].uri);
    setSelectedImage({ uri: uploadUrl });
  }
};

  const handleChoosePhoto = () => {
    Alert.alert("Upload Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: () => pickImage('camera'),
      },
      {
        text: "Choose from Gallery",
        onPress: () => pickImage('library'),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
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
        await setDoc(userRecommendRef, { productHits: updatedProductHits });
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

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);

    registerIndieID(auth.currentUser.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
      .then(() => console.log("Device registered for notifications"))
      .catch(err => console.error("Error registering device:", err));

    return () => {
      unregisterIndieDevice(auth.currentUser.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
        .then(() => console.log("Device unregistered for notifications"))
        .catch(err => console.error("Error unregistering device:", err));
    };
  }, []);

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

  const confirmReceipt = async () => {
    if (!selectedImage) {
      Alert.alert('Photo Required', 'Please provide a photo of the item received.');
      return;
    }

    order.productDetails.forEach(async (detail) => {
      await incrementProductHits(detail.productId);
    });
  
    const imageUrl = await uploadImageAsync(selectedImage.uri);
  
    const orderDocRef = doc(db, 'orders', order.id);
    await updateDoc(orderDocRef, {
      receivedPhoto: imageUrl,
      status: 'Completed',
      deliveredStatus: 'Confirmed',
      dateReceived: new Date()
    });

    const auth = getAuth();
                            const currentUser = auth.currentUser;
                            const userEmail = currentUser ? currentUser.email : '';

                            const buyerNotificationMessage = `Order recieved. Order #${order.id.toUpperCase()}.`
                            const sellerNotificationMessage = `The order #${order.id.toUpperCase()} has been confirmed by ${order.buyerEmail}.`
                            try {
                              await sendPushNotification(order.buyerEmail, 'Order Receive Confirmation', buyerNotificationMessage);
                              await sendPushNotification(userEmail, 'Order Delivered', sellerNotificationMessage);
                            } catch (error) {
                              console.error("Error sending notifications:", error);
                              Alert.alert("Error", "Could not send notifications.");
                            }
                
                            const notificationsRef = collection(db, 'notifications');
                            const buyerNotificationData = {
                              email: userEmail,
                              text: buyerNotificationMessage,
                              timestamp: new Date(),
                              type: 'completed',
                              orderId: order.id
                            };
                            const sellerNotificationData = {
                              email: order.sellerEmail,
                              text: sellerNotificationMessage,
                              timestamp: new Date(),
                              type: 'completed',
                              orderId: order.id
                            };
                            await addDoc(notificationsRef, buyerNotificationData);
                            await addDoc(notificationsRef, sellerNotificationData);
  
    try {
      const batch = writeBatch(db);
  
      await Promise.all(order.productDetails.map(async (detail) => {
        const productRef = doc(db, 'products', detail.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const newQuantity = productSnap.data().quantity - detail.orderedQuantity;
          batch.update(productRef, { quantity: newQuantity });
        }
      }));
  
      await batch.commit();
    } catch (error) {
      console.error("Failed to update product quantities", error);
      Alert.alert("Error", "Failed to update product quantities.");
      return;
    }
  
    setModalVisible(false);
    setConfirmationModalVisible(true);
  };

  const submitRatings = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userEmail = currentUser ? currentUser.email : null; 
  
    if (!userEmail) {
      Alert.alert('Error', 'You must be logged in to submit ratings.');
      return; 
    }
  
    await Promise.all(order.productDetails.map(async item => {
      if (ratings[item.productId] > 0) {
        const ratingDoc = {
          prodId: item.productId,
          rating: ratings[item.productId],
          ratedBy: userEmail,
          ratedAt: new Date(), 
          comment: comments[item.productId], 
        };
        await addDoc(collection(db, 'productRatings'), ratingDoc);
      }
    }));
  
    Alert.alert('Ratings Submitted', 'Your ratings have been submitted successfully.');
    navigation.navigate('OrderHistory');
  };

  const handleRatingChange = (productId, rating) => {
    setRatings(prev => ({ ...prev, [productId]: rating }));
  };

  const handleCommentChange = (productId, text) => {
    setComments(prev => ({ ...prev, [productId]: text }));
  };

  
  return (
    <SafeAreaView style={styles.safeArea}>
       <Modal
        animationType="slide"
        transparent={true}
        visible={confirmationModalVisible}
        onRequestClose={() => {
          setConfirmationModalVisible(false);
          navigation.navigate('OrderHistory'); 
        }}
      >
        <View style={styles.confirmationModalCenteredView}>
          <View style={styles.confirmationModalView}>
            <Text style={styles.confirmationModalText}>Receipt has been confirmed successfully.</Text>
            <View style={styles.confirmationModalButtonContainer}>
              <TouchableOpacity
                style={styles.confirmationModalRatingButton}
                onPress={() => {
                  setRatingModalVisible(true);
                  setConfirmationModalVisible(false);
                }}
              >
                <Icon name="star" size={20} color="#ffd700" style={styles.confirmationModalIconStyle} />
                <Text style={styles.confirmationModalButtonText}>Rate Products</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
            setModalVisible(!modalVisible);
        }}
    >
        <View style={styles.modalView}>
            {selectedImage ? (
                <>
                    <Text style={styles.imageAttachedText}>Image Attached</Text>
                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                    <TouchableOpacity onPress={handleChoosePhoto} style={styles.cameraButton}>
                        <CameraIcon name="camera-alt" size={60} color="#fff" />
                        <Text style={styles.cameraButtonText}>Change Photo</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <TouchableOpacity onPress={handleChoosePhoto} style={styles.cameraButton}>
                    <CameraIcon name="camera-alt" size={60} color="#fff" />
                    <Text style={styles.cameraButtonText}>Take Photo</Text>
                </TouchableOpacity>
            )}
             <Text style={styles.modalText}>Confirm receipt by uploading a photo of the item.</Text>
            <TouchableOpacity onPress={confirmReceipt} style={styles.confirmButton}>
                <Text style={styles.buttonText}>Confirm Receipt</Text>
            </TouchableOpacity>
        </View>
    </Modal>
      <Modal
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.ratingModalContainer}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.ratingModalContent}
            style={styles.ratingModalScrollView}
          >
            <Text style={styles.ratingModalTitle}>You can rate the products:</Text>
            {order.productDetails.map((item, index) => {
              const product = products[item.productId];
              return (
                <View key={index} style={styles.ratingItemContainer}>
                  <Image source={{ uri: product.photo }} style={styles.ratingProductImage} />
                  <Text style={styles.ratingProductName}>{product.name}</Text>
                  <Rating
                    startingValue={ratings[item.productId]}
                    imageSize={30}
                    onFinishRating={(rating) => handleRatingChange(item.productId, rating)}
                  />
                  {ratings[item.productId] > 0 && (
                    <TextInput
                      style={styles.ratingCommentInput}
                      placeholder="Add a comment (optional)"
                      value={comments[item.productId]}
                      onChangeText={(text) => handleCommentChange(item.productId, text)}
                      onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
          {Object.values(ratings).some(rating => rating > 0) && (
            <TouchableOpacity onPress={submitRatings} style={styles.ratingSubmitButton}>
              <Text style={styles.ratingButtonText}>Submit Ratings</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
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
            Your order is on the way{'\n\n'}
            Delivery should be made 
            between {order.deliveryStart?.toDate() ? moment(order.deliveryStart.toDate()).format('DD MMM YYYY') : 'N/A'} and {order.deliveryEnd?.toDate() ? moment(order.deliveryEnd.toDate()).format('DD MMM YYYY') : 'N/A'}
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
        <View style={styles.sellerHeader}>
          <Icon5 name="store" size={20} color="#808080" />
          <Text style={styles.sellerName}>{sellerName}</Text>
          <TouchableOpacity
            style={styles.visitButton}
            onPress={() => navigation.navigate('UserVisit', { email: order.sellerEmail })}
          >
            <Text style={styles.visitButtonText}>Visit</Text>
          </TouchableOpacity>
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
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.contactButton} onPress={handleChatWithSeller}>
            <Text style={styles.buttonText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
      <View style={styles.footer}>
        {deliveredStatus === 'Waiting' ? (
          <TouchableOpacity style={styles.confirmButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Confirm Receipt</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingButton}>
            <Text style={styles.pendingButtonText}>{deliveredStatus === 'Processing' ? 'Delivery in Pogress...' : 'Delivery in Pogress...'}</Text>
            <Animated.Image
              source={deliveringIcon}
              style={[styles.carIcon, { transform: [{ translateX: moveCar }] }]}
            />
          </View>
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
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  confirmationButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    borderRadius: 10,
    flexDirection: 'row',
    borderRadius: 10,
  },
  confirmationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalView: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
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
  cameraButton: {
    flex: 1,
    justifyContent: 'center',  
    alignItems: 'center',     
    backgroundColor: "#2196F3",
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    marginHorizontal: 30,
    marginBottom: 10
  },
  cameraButtonText: {
    color: "#fff",
    marginLeft: 10,
    textAlign: 'center',
  },
  previewImage: {
    width: 300,
    height: 300,
    marginBottom: 10
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    padding: 20,
    elevation: 2
  },
  buttonText: {
    color: "#fff",
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  previewImage: {
    width: 300,
    height: 300,
    marginBottom: 10
},
imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 10,
},
imageAttachedText: {
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: 16,
  marginBottom: 10,
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
ratingContainer: {
  alignItems: 'center',
  marginBottom: 20,
},
commentInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  width: '100%',
  padding: 10,
  marginTop: 10,
},
centeredView: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 22
},
confirmationModalCenteredView: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
},
confirmationModalView: {
  margin: 20,
  backgroundColor: "white",
  padding: 35,
  alignItems: "flex-start", 
  width: '80%',
},
confirmationModalText: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 20, 
},
confirmationModalButtonContainer: {
  alignSelf: 'flex-end', 
  marginTop: 10,
},
confirmationModalRatingButton: {
  flexDirection: 'row',
  backgroundColor: "#fff",
  borderRadius: 10,
  paddingHorizontal: 20,
  paddingVertical: 10,
  elevation: 2,
  alignItems: 'center',
  borderColor: '#05652D', 
  borderWidth: 2,
},
confirmationModalButtonText: {
  color: "#05652D",
  fontWeight: "bold",
  textAlign: "center",
  marginLeft: 10,
},
confirmationModalIconStyle: {
  marginTop: 2,
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 20, 
},
ratingModalContainer: {
  flex: 1,
  justifyContent: 'space-between',
  backgroundColor: '#FFFFFF',
},
ratingModalScrollView: {
  flex: 1,
},
ratingModalContent: {
  flexGrow: 1,
  padding: 20,
},
ratingModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 20,
},
ratingItemContainer: {
  alignItems: 'center',
  marginBottom: 20,
},
ratingProductImage: {
  width: 100,
  height: 100,
  borderRadius: 10,
},
ratingProductName: {
  fontSize: 16,
  fontWeight: 'bold',
  marginTop: 5,
},
ratingCommentInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  width: '100%',
  padding: 10,
  marginTop: 10,
},
ratingSubmitButton: {
  backgroundColor: "#4CAF50",
  padding: 15,
  position: 'absolute', 
  bottom: 0,        
  left: 0,          
  right: 0,
  justifyContent: 'center',
  alignItems: 'center',
  borderTopWidth: 1,
  borderColor: '#ccc',
  width: '100%', 
},
ratingButtonText: {
  color: "#fff",
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: 16,
},
pendingButton: {
  backgroundColor: '#666',
  padding: 15,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  width: '95%',
  borderRadius: 10,
},
pendingButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
});

export default OrderToReceiveDetails;