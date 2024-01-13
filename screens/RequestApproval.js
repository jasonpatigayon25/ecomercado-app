import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, updateDoc, doc, where, writeBatch, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import axios from 'axios';

const RequestApproval = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const requestsQuery = query(
            collection(db, 'donationRequests'), 
            where('donorEmail', '==', user.email),
            orderBy('requestedAt', 'desc')
          );
          const querySnapshot = await getDocs(requestsQuery);
          const fetchedRequests = [];
          querySnapshot.forEach((doc) => {
            fetchedRequests.push({ id: doc.id, ...doc.data() });
          });
          setRequests(fetchedRequests);
        }
      } catch (error) {
        console.error('Error fetching requests: ', error);
      }
    };
    fetchRequests();
  }, []);

  const sendPushNotification = async (subID, title, message) => {
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
          Alert.alert('Error', 'Unable to send push notification at this time.');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'donationRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data();
  
      const donationId = requestData.donationId;
      if (!donationId) {
        console.error("donationId is undefined for request:", requestId);
        return;
      }
  
      await updateDoc(requestRef, { status: 'approved' });
  
      const donationRef = doc(db, 'donation', donationId);
      await updateDoc(donationRef, { isDonated: true });
  
      Alert.alert('Request Approved', 'The donation request has been approved.');
  
      const otherRequestsQuery = query(
        collection(db, 'donationRequests'),
        where('donationId', '==', donationId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(otherRequestsQuery);
      const batch = writeBatch(db);
  
      querySnapshot.forEach((docSnapshot) => {
        if (docSnapshot.id !== requestId) {
          batch.update(docSnapshot.ref, { status: 'denied' });
        }
      });
  
      await batch.commit();
  
      setRequests(currentRequests =>
        currentRequests.map(request => {
          if (request.id === requestId) {
            return { ...request, status: 'approved' };
          } else if (request.donationDetails.donationId === donationId) {
            return { ...request, status: 'denied' };
          }
          return request;
        })
      );
  
      // send push notification to the requester
      const requesterNotificationMessage = `Your request for "${requestData.donationDetails.name}" has been approved.`;
      sendPushNotification(requestData.requesterEmail, 'Donation Request Approved', requesterNotificationMessage);

      // send push notification to the donor (current user)
      const donorNotificationMessage = `You approved the request for "${requestData.donationDetails.name}".`;
      sendPushNotification(requestData.donorEmail, 'Donation Approved', donorNotificationMessage);

      await addDoc(collection(db, 'donationRequestApproval'), {
        type: 'approval',
        requestId: requestId,
        donationId: donationId,
        donorEmail: requestData.donorEmail,
        requesterEmail: requestData.requesterEmail,
        status: 'approved',
        message: `Your request for "${requestData.donationDetails.name}" has been approved.`,
        timestamp: new Date()
      });

      const approvalNotification = {
        email: requestData.requesterEmail,
        text: `Your request for "${requestData.donationDetails.name}" has been approved.`,
        timestamp: new Date(),
        type: 'donation_approved',
        donationId: requestData.donationId,
        requestDonationId: requestId,
      };
    
      await addDoc(collection(db, 'notifications'), approvalNotification);

    } catch (error) {
      console.error('Error updating requests: ', error);
    }
  };

  const handleDenyRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'donationRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data(); 
  
      await updateDoc(requestRef, { status: 'denied' });
      Alert.alert('Request Denied', 'The donation request has been denied.');
  
      setRequests(currentRequests => currentRequests.map(request => {
        if (request.id === requestId) {
          return { ...request, status: 'denied' };
        }
        return request;
      }));
  
      const requesterNotificationMessage = `Your request for "${requestData.donationDetails.name}" has been denied.`;
      sendPushNotification(requestData.requesterEmail, 'Donation Request Denied', requesterNotificationMessage);
  
      const donorNotificationMessage = `You denied the request for "${requestData.donationDetails.name}".`;
      sendPushNotification(getAuth().currentUser.email, 'Donation Denied', donorNotificationMessage);
  
      await addDoc(collection(db, 'donationRequestApproval'), {
        type: 'denial',
        requestId: requestId,
        donationId: requestData.donationId,
        donorEmail: requestData.donorEmail,
        requesterEmail: requestData.requesterEmail,
        status: 'denied',
        message: `Your request for "${requestData.donationDetails.name}" has been denied.`,
        timestamp: new Date()
      });

      const denialNotification = {
        email: requestData.requesterEmail,
        text: `Your request for "${requestData.donationDetails.name}" has been denied.`,
        timestamp: new Date(),
        type: 'donation_denied',
        donationId: requestData.donationId,
        requestDonationId: requestId,
      };
    
      await addDoc(collection(db, 'notifications'), denialNotification);
  
    } catch (error) {
      console.error('Error denying request: ', error);
    }
  };

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Donation Requests</Text>
      </View>
      <ScrollView style={styles.scrollView}>
      {requests.map((request) => (
        <TouchableOpacity
          key={request.id}
          style={styles.requestContainer}
          onPress={() => handleRequestClick(request)}
        >
          <Image
            source={{ uri: request.donationDetails.photo }} 
            style={styles.donationImage}
          />
          <View style={styles.requestDetailsContainer}>
            <Text style={styles.requestEmail} numberOfLines={1} ellipsizeMode="tail">{request.requesterEmail}</Text>
            <Text style={styles.requestMessage} numberOfLines={1} ellipsizeMode="tail">Message: {request.message}</Text>
            <View style={styles.statusContainer}>
              {request.status === 'pending' && (
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity
                    onPress={() => handleApproveRequest(request.id)}
                    style={styles.approveButton}
                  >
                    <Text style={styles.buttonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDenyRequest(request.id)}
                    style={styles.denyButton}
                  >
                    <Text style={styles.buttonText}>Deny</Text>
                  </TouchableOpacity>
                </View>
              )}
              {request.status === 'approved' && (
                <Text style={styles.approvedText}>APPROVED</Text>
              )}
              {request.status === 'denied' && (
                <Text style={styles.deniedText}>DENIED</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {requests.length === 0 && (
         <View style={styles.emptyRequestsContainer}>
         <Text style={styles.noRequestsText}>No pending requests.</Text>
       </View>
      )}
    </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ScrollView>
              {selectedRequest && (
                <>
                  <Image
                    source={{ uri: selectedRequest.donationDetails.photo }} 
                    style={styles.donationImageModal}
                  />
                  <Text style={styles.modalText}>Requester: {selectedRequest.requesterEmail}</Text>
                  <Text style={styles.modalText}>Donation Name: {selectedRequest.donationDetails.name}</Text>
                  <Text style={styles.modalText}>Location: {selectedRequest.donationDetails.location}</Text>
                  <Text style={styles.modalText}>Message: {selectedRequest.donationDetails.message}</Text>
                  <Text style={styles.modalText}>
                    Requested At: {selectedRequest.requestedAt.toDate().toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => setModalVisible(!modalVisible)}
                  >
                    <Text style={styles.textStyle}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    padding: 20,
  },
  requestContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestInfoContainer: {
    marginBottom: 10,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
  },
  requestMessage: {
    fontSize: 14,
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  approveButton: {
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginRight: 10,
  },
  denyButton: {
    padding: 10,
    backgroundColor: '#F44336',
    borderRadius: 5,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  noRequestsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  requestContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center', 
  },
  donationImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
    marginRight: 15,
  },
  requestDetailsContainer: {
    flex: 1,
  },
  requestEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 20,
    width: '90%',
    maxHeight: '80%', 
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  buttonClose: {
    backgroundColor: "#05652D",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center"
  },
  donationImageModal: {
    width: 150,
    height: 150,
    borderRadius: 5,
    marginRight: 15,
    paddingBottom: 5,
    alignSelf: 'center',
  },
  approvedText: {
    color: 'green',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 10,
  },
  deniedText: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 10,
  },
  emptyRequestsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noRequestsText: {
    textAlign: 'center',
    fontSize: 20,
    color: "gray",
  },
});

export default RequestApproval;