import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getDocs, query, collection, where, doc, updateDoc, getDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import moment from 'moment';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';

const RequestToApproveByDonorDetails = ({ route, navigation }) => {
  const { request, donations, users, requesterEmail } = route.params;

  useEffect(() => {
    if (route.params.autoApprove) {
      approveRequest();
    }
  }, []);

  const [requesterFullName, setRequesterFullName] = useState('');
  const [donationDetails, setDonationDetails] = useState([]);
  const [isItemTaken, setIsItemTaken] = useState(false);

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

  const contactSeller = () => {
    // 
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

    const fetchDonationDetails = async () => {
      try {
        const details = await Promise.all(
          request.donorDetails.map(async (detail) => {
            const donationId = detail.donationId;
            const donationDoc = await getDoc(doc(db, 'donation', donationId));
            return {
              donationId,
              donationData: donationDoc.data(),
            };
          })
        );
        setDonationDetails(details);

        const takenItem = details.find(detail => detail.donationData.publicationStatus === 'taken');
        setIsItemTaken(!!takenItem);
      } catch (error) {
        console.error("Error fetching donation details: ", error);
      }
    };

    fetchDonationDetails();
  }, [request.requesterEmail]);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);

    registerIndieID(auth.currentUser.email, 21249, 'kHrDsgwvsjqsZkDuubGBMU')
      .then(() => console.log("Device registered for notifications"))
      .catch(err => console.error("Error registering device:", err));

    return () => {
      unregisterIndieDevice(auth.currentUser.email, 21249, 'kHrDsgwvsjqsZkDuubGBMU')
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
      appId: 21249,
      appToken: 'kHrDsgwvsjqsZkDuubGBMU',
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

  const approveRequest = async () => {
    
    if (isItemTaken) {
      Alert.alert("Unable to Approve", "One or more items in the request have already been taken.");
      return;
    }

    Alert.alert(
      "Confirm Approval",
      "Are you sure you want to approve this request?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Approve", 
          onPress: async () => {
            try {
              const requestRef = doc(db, 'requests', request.id);
              await updateDoc(requestRef, {
                status: 'Approved'
              });

              const auth = getAuth();
              const currentUser = auth.currentUser;
              const userEmail = currentUser ? currentUser.email : '';

              const requesterNotificationMessage = `Your request #${request.id.toUpperCase()} has been approved.`;
              const donorNotificationMessage = `You approved the #${request.id.toUpperCase()}. Please set for delivery`;
              try {
                await sendPushNotification(request.buyerEmail, 'Request Approved', requesterNotificationMessage);
                await sendPushNotification(userEmail, 'Request Approved', donorNotificationMessage);
              } catch (error) {
                console.error("Error sending notifications:", error);
                Alert.alert("Error", "Could not send notifications.");
              }
  
              const notificationsRef = collection(db, 'notifications');
              const requesterNotificationData = {
                email: request.requesterEmail,
                text: requesterNotificationMessage,
                timestamp: new Date(),
                type: 'request_approved',
                requestId: request.id
              };
              const donorNotificationData = {
                email: userEmail,
                text: donorNotificationMessage,
                timestamp: new Date(),
                type: 'approved_request',
                requestId: request.id
              };
              await addDoc(notificationsRef, requesterNotificationData);
              await addDoc(notificationsRef, donorNotificationData);

              Alert.alert("Request Approved", "The request has been approved successfully.");
              navigation.navigate('RequestManagement');
            } catch (error) {
              console.error("Error updating request status: ", error);
              Alert.alert("Error", "Could not approve the request at this time.");
            }
          }
        }
      ]
    );
  };

  const cancelRequest = async () => {
    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this request?",
      [
        {
          text: "No",
          style: "cancel",
        },
        { 
          text: "Yes", 
          onPress: async () => {
            try {
              const requestRef = doc(db, 'requests', request.id);
              await updateDoc(requestRef, {
                status: 'Declined',
              });

              const auth = getAuth();
              const currentUser = auth.currentUser;
              const userEmail = currentUser ? currentUser.email : '';

              const requesterNotificationMessage = `Your request #${request.id.toUpperCase()} has been declined.`;
              const donorNotificationMessage = `You declined request #${request.id.toUpperCase()}.`;
              
              try {
                await sendPushNotification(request.requesterEmail, 'Request Declined', requesterNotificationMessage);
                await sendPushNotification(userEmail, 'Request Declined', donorNotificationMessage);
              } catch (error) {
                console.error("Error sending notifications:", error);
                Alert.alert("Error", "Could not send notifications.");
              }

              const notificationsRef = collection(db, 'notifications');
              const requesterNotificationData = {
                email: request.requesterEmail,
                text: requesterNotificationMessage,
                timestamp: new Date(),
                type: 'request_declined',
                requestId: request.id
              };
              const donorNotificationData = {
                email: userEmail,
                text: donorNotificationMessage,
                timestamp: new Date(),
                type: 'declined_request',
                requestId: request.id
              };
              await addDoc(notificationsRef, requesterNotificationData);
              await addDoc(notificationsRef, donorNotificationData);

              Alert.alert(
                "Request Declined",
                "Request has been declined.",
                [
                  { text: "OK", onPress: () => navigation.navigate('RequestManagement') }
                ]
              );
            } catch (error) {
              console.error("Error updating request status: ", error);
              Alert.alert("Error", "Could not decline the request at this time.");
            }
          },
        },
      ]
    );
  };

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
                                {donation.publicationStatus === 'taken' && (
                                  <View style={styles.coveredTextContainer}>
                                    <Text style={styles.coveredText}>TAKEN</Text>
                                  </View>
                                )}
                               
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
              <Text style={styles.orderTotalLabel}>FEES</Text>
              <View style={styles.orderTotalDetails}>
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalText}>
                    Delivery Fee Subtotal:
                  </Text>
                  <Text style={styles.orderTotalValue}>₱{request.disposalFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalText}>Disposal Fee Subtotal:</Text>
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
                <TouchableOpacity style={styles.approveButton}  onPress={approveRequest}>
                  <Text style={styles.approveButtonText}>Approve Request</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelRequest}>
                  <Text style={styles.cancelbuttonText}>Decline Request</Text>
                </TouchableOpacity>
              </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.approveButtonMain} onPress={approveRequest}>
            <Text style={styles.approveButtonTextMain}>Approve Request</Text>
          </TouchableOpacity>
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
  coveredTextContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(192,192,192,0.8)', 
    top: '50%',
    left: '50%', 
    transform: [{ translateX: -70 }, { translateY: -25 }, { rotate: '-09deg' }], 
    zIndex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  coveredText: {
    color: '#FFF', 
    fontWeight: 'bold',
    fontSize: 24,
    letterSpacing: 4,
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

export default RequestToApproveByDonorDetails;