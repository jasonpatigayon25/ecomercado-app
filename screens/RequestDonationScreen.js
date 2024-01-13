import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ScrollView, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { doc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import MapSelector from './MapSelector';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import axios from 'axios';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenHeight = Dimensions.get('window').height;

const RequestDonationScreen = ({ navigation, route }) => {
  const { donation } = route.params;
  const auth = getAuth();
  const user = auth.currentUser;
  const [message, setMessage] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('Search Location');
  const [hasRequested, setHasRequested] = useState(false);

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  useEffect(() => {
    const fetchUserAddress = async () => {
      if (user) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", user.email));
  
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setSelectedAddress(userData.address || 'Search Location');
          } else {
            console.log('No user profile found.');
          }
        } catch (error) {
          console.error('Error fetching user address:', error);
        }
      }
    };
  
    fetchUserAddress();
  }, [user]);

  useEffect(() => {
    //  already requested the donation validation
    const checkExistingRequest = async () => {
      if (user) {
        const donationRequestsRef = collection(db, 'donationRequests');
        const querySnapshot = await getDocs(
          query(donationRequestsRef, where('donationId', '==', donation.id), where('requesterEmail', '==', user.email))
        );
        if (querySnapshot.docs.length > 0) {
          setHasRequested(true);
        }
      }
    };

    checkExistingRequest();
  }, [user, donation]);

  const shouldSendNotification = async (email) => {
    try {
      const donatingNotifications = await AsyncStorage.getItem(`${email}_donatingNotifications`);
      return donatingNotifications === null || JSON.parse(donatingNotifications);
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
          console.error(`Attempt ${attempt} - Error sending push notification:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const handleSubmitRequest = () => {
    if (!user) {
      Alert.alert("Error", "You need to be logged in to request a donation.");
      return;
    }

    if (hasRequested) {
      Alert.alert("Error", "You have already requested this donation.");
      return;
    }

    if (message.trim() === '') {
      Alert.alert("Error", "Please enter a message for the donor.");
      return;
    }

    if (selectedAddress === 'Choose your location on the map') {
      Alert.alert("Error", "Please select your address on the map.");
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleConfirmRequest = async () => {
    setShowConfirmationModal(false);
  
    try {
      const currentTime = new Date();

      const donationRequestRef = await addDoc(collection(db, 'donationRequests'), {
        donorEmail: donation.donor_email,
        requesterEmail: user.email,
        donationId: donation.id,
        message: message,
        status: 'pending',
        requestedAt: currentTime,
        requesterAddress: selectedAddress,
        donationDetails: {
          name: donation.name,
          location: donation.location,
          message: donation.message,
          photo: donation.photo,
        }
      });

      const requestDonationId = donationRequestRef.id;
  
      // notification for the donor
      const donorNotification = `${user.email} is requesting your donation: "${donation.name}".`;
      await addDoc(collection(db, 'notifications'), {
        email: donation.donor_email,
        text: donorNotification,
        timestamp: currentTime,
        type: 'donation_request',
        donationName: donation.name,
        donationLocation: donation.location,
        requestDonationId
      });
  
      // notification for the requester
      const requesterNotification = `You have requested the donation: "${donation.name}" from ${donation.donor_email}.`;
      await addDoc(collection(db, 'notifications'), {
        email: user.email,
        text: requesterNotification,
        timestamp: currentTime,
        type: 'donation_request',
        donationName: donation.name,
        donationLocation: donation.location,
        requestDonationId 
      });

      sendPushNotification(donation.donor_email, 'Donation Request', donorNotification);

      sendPushNotification(user.email, 'Donation Request Submitted', requesterNotification);
  
      Alert.alert("Your request has been sent to the donor.");
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error sending request:', error);
      console.error("Error", "There was an issue sending your request.");
    }
  };  

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleLocationSearch = async (query) => {
    setLocationSearchQuery(query);
  
    if (query.length > 0) {
      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
          params: {
            input: query,
            key: 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g', 
            components: 'country:PH' 
          }
        });
  
        if (response.data && response.data.predictions) {
          const locations = response.data.predictions.map(prediction => ({
            name: prediction.description,
            placeId: prediction.place_id 
          }));
          setLocationSearchResults(locations);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      }
    } else {
      setLocationSearchResults([]);
    }
  };

  const handleLocationSelect = (locationName) => {
    setSelectedAddress(locationName);
    setLocationSearchModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Donation</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Image source={{ uri: donation.photo }} style={styles.donationImage} />
          <Text style={styles.detailTitle}>Donation Details:</Text>
          <Text style={styles.detailText}>Item: {donation.name}</Text>
          <Text style={styles.detailText}>Location: {donation.location}</Text>
          <Text style={styles.detailText}>Message: {donation.message}</Text>

          <View style={styles.divider} />
          <Text style={styles.detailTitle}>Donor:</Text>
          <Text style={styles.detailText}>Email: {donation.donor_email}</Text>

          <View style={styles.divider} />
          <Text style={styles.label}>My Address:</Text>
          <TouchableOpacity onPress={() => setLocationSearchModalVisible(true)} style={styles.addressContainer}>
            <Icon name="map-marker" size={16} color="#05652D" style={styles.labelIcon} />
            <Text style={styles.addressText}>{selectedAddress}</Text>
            <Icon name="pencil" size={16} color="#05652D" style={styles.editIcon} />
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.label}>Message to Donor:</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            placeholder="Enter your message here"
            value={message}
            onChangeText={setMessage}
          />
        </View>
      </ScrollView>
      <View style={styles.navbar}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitRequest}>
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>
          </View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={locationSearchModalVisible}
            onRequestClose={() => setLocationSearchModalVisible(false)}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Search for a location"
                  value={locationSearchQuery}
                  onChangeText={handleLocationSearch}
                  autoFocus={true}
                />
                <ScrollView style={styles.searchResultsContainer}>
                  {locationSearchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => handleLocationSelect(result.name)}
                    >
                      <Text style={styles.searchResultText}>{result.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        <Modal
          visible={showConfirmationModal}
          onRequestClose={() => setShowConfirmationModal(false)}
          animationType="slide"
          transparent={true}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Request</Text>
            <Text style={styles.modalMessage}>Are you sure you want to submit this request?</Text>
            <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmRequest}>
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowConfirmationModal(false)}>
              <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
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
    flexGrow: 1,
    backgroundColor: '#f2f2f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backIcon: {
    color: '#FFF',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    paddingHorizontal: 50, 
    borderRadius: 25, 
    alignItems: 'center',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  donationImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 10,
  },
  labelIcon: {
    marginRight: 10,
  },
  addressText: {
    flex: 1,
    color: '#05652D',
    fontSize: 16,
  },
  editIcon: {
    marginLeft: 10,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#e1e1e1',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    width: '100%', 
    alignItems: 'center',
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  
  confirmButton: {
    backgroundColor: '#05652D', 
  },
  
  cancelButton: {
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#05652D', 
  },
  
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#05652D',
  },
  modalView: {
    height: screenHeight / 2, 
    marginTop: screenHeight / 2, 
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTextInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
  searchResultsContainer: {
    maxHeight: screenHeight / 2 - 80, 
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
});

export default RequestDonationScreen;