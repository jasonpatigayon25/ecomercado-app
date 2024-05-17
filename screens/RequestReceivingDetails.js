import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Animated, Modal, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getDocs, query, collection, where, doc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import moment from 'moment';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';  
import { getAuth } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import Config from 'react-native-config';
import * as Device from 'expo-device'; 

const RequestReceivingDetails = ({ route, navigation }) => {
  const { request, donations, users, requesterEmail } = route.params;
  const [requestStatus, setRequestStatus] = useState(request.status);
  const [deliveredStatus, setDeliveredStatus] = useState(request.deliveredStatus);
  const [user, setUser] = useState(null); 

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);
  
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
        case 'RequestHistory':
          navigation.navigate('RequestHistory');
          break;
        case 'RequestManagement':
          navigation.navigate('RequestManagement');
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
          projectId: "c1e91669-b14e-456e-a024-504bad3dc062",
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

  useEffect(() => {
    checkIfTimeExceeded();
  }, []);  

  const checkIfTimeExceeded = async () => {
    const currentTime = new Date();
  
    if (request.deliveredStatus === 'Processing') {
      const deliveryEndTime = moment(request.deliveryEnd.toDate()).add(1, 'day');
      if (currentTime > deliveryEndTime && request.status !== 'Approved') {
        try {
          const requestRef = doc(db, 'requests', request.id);
          await updateDoc(requestRef, { status: 'Approved' });
          Alert.alert(
            'Time Exceeded',
            'The delivery time has already exceeded. The request has been automatically moved back to the Deliver tab. Please set the delivery time again.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('RequestManagement'),
              },
            ]
          );
        } catch (error) {
          console.error('Error updating order status:', error);
        }
      }
    } else if (request.deliveredStatus === 'Waiting') {
      const threeDaysAgo = moment().subtract(3, 'days');
      const dateDelivered = moment(request.dateDelivered.toDate());
      if (dateDelivered.isBefore(threeDaysAgo)) {
        Alert.alert(
          'Confirmation Reminder',
          "Requester hasn't confirmed the receipt yet. Confirm to complete the request.",
          [
            {
              text: 'No',
              onPress: () => console.log('Confirmation reminder acknowledged.'),
            },
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const requestRef = doc(db, 'requests', request.id);
                  await updateDoc(requestRef, { 
                    status: 'Completed',
                    deliveredStatus: 'Confirmed',
                    dateReceived: new Date(),
                    isTaken: true 
                  });

                  for (const detail of request.donorDetails) {
                    const donationRef = doc(db, 'donation', detail.donationId);
                    await updateDoc(donationRef, { 
                      publicationStatus: 'taken'
                    });
                  }

                  Alert.alert("Request Completed!");
                  navigation.navigate('RequestManagement');
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
    if (route.params.autoConfirmDeliver) {
      confirmDelivery();  
    }
  }, [route.params]);

  const [requesterFullName, setRequesterFullName] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

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
              const requestRef = doc(db, 'requests', request.id);
              await updateDoc(requestRef, { 
                deliveredStatus: 'Waiting',
                dateDelivered: new Date() 
            });

            const auth = getAuth();
            const currentUser = auth.currentUser;
            const userEmail = currentUser ? currentUser.email : '';

            const requesterNotificationMessage = `Your request #${request.id.toUpperCase()} has been marked as delivered. Please confirm receipt if you've received it.`;
            const donorNotificationMessage = `You've confirmed that request #${request.id.toUpperCase()} has been delivered. Please wait for the requester's confirmation.`;

            try {
              await sendPushNotification(request.requesterEmail, 'Request Delivery Confirmation', requesterNotificationMessage, 'RequestHistory');
              await sendPushNotification(userEmail, 'Request Delivered', donorNotificationMessage, 'RequestManagement');
            } catch (error) {
              console.error("Error sending notifications:", error);
              Alert.alert("Error", "Could not send notifications.");
            }

            const notificationsRef = collection(db, 'notifications');
            const requesterNotificationData = {
              email: request.requesterEmail,
              text: requesterNotificationMessage,
              timestamp: new Date(),
              type: 'request_delivery_confirmation',
              requestId: request.id
            };
            const donorNotificationData = {
              email: userEmail,
              text: donorNotificationMessage,
              timestamp: new Date(),
              type: 'delivery_confirmation',
              requestId: request.id
            };

            await addDoc(notificationsRef, requesterNotificationData);
            await addDoc(notificationsRef, donorNotificationData);

            setDeliveredStatus('Waiting');
            Alert.alert("Delivery Confirmed!", "Please wait for the requester to confirm the receipt.");
            } catch (error) {
              console.error("Error updating request status:", error);
            }
          }
        }
      ]
    );
  };

  const handleChatWithRequester = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    const requesterEmail = request.requesterEmail;
    const currentUserEmail = user.email;
  
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('users', 'array-contains', currentUserEmail));
      const querySnapshot = await getDocs(q);
  
      let existingChatId = null;
  
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(requesterEmail)) {
          existingChatId = doc.id;
        }
      });
  
      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: requesterEmail,
        });
      } else {
        const newChatRef = collection(db, 'chats');
        const newChat = {
          users: [currentUserEmail, requesterEmail],
          messages: [],
        };
  
        const docRef = await addDoc(newChatRef, newChat);
        navigation.navigate('Chat', {
          chatId: docRef.id,
          receiverEmail: requesterEmail,
        });
      }
    } catch (error) {
      console.error('Error handling chat with requester:', error);
    }
  };

  const handleConfirm = async () => {
    try {
      const requestRef = doc(db, 'requests', request.id);
      await updateDoc(requestRef, { deliveredStatus: 'Waiting' });
      Alert.alert("Delivery Confirmed!");
      setIsConfirming(false);
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };

  useEffect(() => {
    const fetchRequesterName = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", request.requesterEmail));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const fullName = `${data.firstName} ${data.lastName}`;
          setRequesterFullName(fullName);
        });
      } catch (error) {
        console.error("Error fetching requester name: ", error);
      }
    };

    fetchRequesterName();
  }, [request.requesterEmail]);


  useEffect(() => {
    const requestRef = doc(db, 'requests', request.id);
    const unsubscribe = onSnapshot(requestRef, (doc) => {
      if (doc.exists()) {
        const requestData = doc.data();
        setRequestStatus(requestData.status);
        setDeliveredStatus(requestData.deliveredStatus); 
      }
    }, (error) => {
      console.error("Error fetching request data:", error);
    });

    return () => unsubscribe(); 
  }, [request.id]);

  const handleFeesNotePress = () => {
    Alert.alert(
      "Note",
      "This fee covers the courier fee for the requested donations."
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Request Details</Text>
        </View>
        <ScrollView style={styles.container}>
          <View key={request.id} style={styles.requestCard}>
          <View style={styles.groupHeader}>
                        <Text style={styles.donationName}>Requester: {requesterFullName}</Text>
                        <TouchableOpacity
                            style={styles.visitButton}
                            onPress={() => navigation.navigate('UserVisit', { email: request.requesterEmail })}
                        >
                            <Text style={styles.visitButtonText}>Visit</Text>
                        </TouchableOpacity>
                        </View>
            {request.donorDetails.map((detail, idx) => {
                const donation = donations[detail.donationId];
                if (!donation) return null;
                return (
                    <View key={idx}>
                        
                        <View style={styles.donationItem}>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('ViewerImage', { imageUrl: donation.photo })}
                          >
                            <Image source={{ uri: donation.photo }} style={styles.donationImage} />
                            </TouchableOpacity>
                            <View style={styles.donationDetails}>
                                <Text style={styles.donationName}>{donation.name}</Text>
                                <Text style={styles.donationItems}>{donation.itemNames.join(' · ')}</Text>
                                <Text style={styles.donationCategory}>{donation.category} Bundle</Text>
                                <View style={styles.subPhotosContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                  {donation.subPhotos.map((subPhoto, index) => (
                                    <TouchableOpacity 
                                    key={index} 
                                    onPress={() => navigation.navigate('ViewerImage', { imageUrl: subPhoto })}
                                  >
                                    <Image
                                      key={index}
                                      source={{ uri: subPhoto }}
                                      style={styles.subPhoto}
                                    />
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            </View>
                        </View>
                    </View>
                );
            })}
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
              <Text style={styles.paymentMethodValue}>{request.paymentMethod}</Text>
            </View>
            <View style={styles.orderTotalSection}>
            <TouchableOpacity style={styles.feeContainer} onPress={handleFeesNotePress}>
              <Text style={styles.feeLabel}>FEES</Text>
              <Icon name="info-circle" size={20} color="#666" />
            </TouchableOpacity>
              <View style={styles.orderTotalDetails}>
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalText}>
                    Disposal Fee Subtotal:
                  </Text>
                  <Text style={styles.orderTotalValue}>₱{request.disposalFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalText}>Delivery Fee Subtotal:</Text>
                  <Text style={styles.orderTotalValue}>₱{request.deliveryFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalTextFinal}>Total Fee:</Text>
                  <Text style={styles.orderTotalValueFinal}>₱{(request.disposalFee + request.deliveryFee).toFixed(2)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.orderInfo}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Request ID:</Text>
                <Text style={styles.detailValue}>{request.id.toUpperCase()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Request Time:</Text>
                <Text style={styles.detailValue}>
                  {moment(request.dateRequested.toDate()).format('DD-MM-YYYY HH:mm')}
                </Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.contactButton} onPress={handleChatWithRequester}>
                    <Text style={styles.contactbuttonText}>Contact Requester</Text>
                </TouchableOpacity>
            </View>
      </View>
        </ScrollView>
        <View style={styles.footer}>
        {deliveredStatus === 'Waiting' ? (
            
          <TouchableOpacity style={[styles.pendingButton, { backgroundColor: '#666' }]} disabled>
            <Text style={styles.pendingButtonText}>Pending for Requester to Confirm</Text>
            <Animated.View style={{ transform: [{ rotate }] }}>
                <Icon5 name="hourglass-half" size={24} color="#fff" />
            </Animated.View>
          </TouchableOpacity>

        ) : (
          <TouchableOpacity
            style={styles.approveButtonMain}
            onPress={confirmDelivery}
          >
            <Text style={styles.approveButtonTextMain}>Confirm Delivered</Text>
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
  requestCard: {
    backgroundColor: '#FFF7F7',
    padding: 20,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  donationItem: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  donationDetails: {
    marginLeft: 10,
    justifyContent: 'center',
    flex: 1,
  },
  donationImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  donationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  donationItems: {
    fontSize: 14,
    color: '#666',
  },
  donationCategory: {
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
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,

  },
  feeLabel: {
    fontSize: 16,
    color: '#444',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
  },
  button: {
    backgroundColor: '#05652D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  requestTitle: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 10,
    color:'#666',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fullName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  heartIcon: {
    marginRight: 5,
  },
  actionButtons: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingTop: 20,
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
footer: {
  padding: 10,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#ccc',
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: -2 },
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
visitButton: {
  position: 'absolute',
  right: 2,
  top: 1,
  backgroundColor: '#FFFFFF',
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#05652D',
},
visitButtonText: {
  fontSize: 12,
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
  subPhotosContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  subPhoto: {
    width: 50,
    height: 50,
    marginRight: 5,
    borderRadius: 25,
  },
});

export default RequestReceivingDetails;