import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, donationCollection } from '../config/firebase';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import axios from 'axios';
import { Dimensions } from 'react-native';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenHeight = Dimensions.get('window').height;

const Donate = ({ navigation }) => {

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      registerIndieID(user.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
        .then(() => console.log("Device registered for notifications"))
        .catch(err => console.error("Error registering device:", err));

      return () => {
        unregisterIndieDevice(user.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
          .then(() => console.log("Device unregistered for notifications"))
          .catch(err => console.error("Error unregistering device:", err));
      };
    }
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
  
    try {
      await axios.post('https://app.nativenotify.com/api/indie/notification', notificationData);
      console.log('Push notification sent to:', subID);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  const notifySubscribers = async (donorEmail, updatedDonationInfo) => {
    const title = 'New Donation Available';
    const message = `A new donation "${updatedDonationInfo.name}" is available from ${donorEmail}`;
  
    const subscribersQuery = query(collection(db, 'subscriptions'), where('subscribedTo_email', '==', donorEmail));
    const subscribersSnapshot = await getDocs(subscribersQuery);
  
    subscribersSnapshot.forEach(async (doc) => {
      const subscriberEmail = doc.data().subscriber_email;
  
      if (await shouldSendNotification(subscriberEmail)) {
        const notificationDoc = {
          email: subscriberEmail,
          title: title,
          type: 'subscribed_donate',
          text: message,
          timestamp: new Date(),
          donationInfo: {
            id: updatedDonationInfo.id,
            name: updatedDonationInfo.name,
            photo: updatedDonationInfo.photo,
            donor_email: donorEmail,
          }
        };
  
        await addDoc(collection(db, 'notifications'), notificationDoc);
        sendPushNotification(subscriberEmail, title, message);
      }
    });
  };
  

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
    setDonationInfo({ ...donationInfo, location: locationName });
    setLocationSearchModalVisible(false);
  };

  const openLocationSearchModal = () => {
    setLocationSearchModalVisible(true);
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", user.email));
  
      const fetchUserProfile = async () => {
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            setUserEmail(user.email);
  
            setDonationInfo(prevState => ({
              ...prevState,
              location: userData.address || '',
            }));
          } else {
            console.log('No user profile found.');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
  
      fetchUserProfile();
    }
  }, []);

  const [donationInfo, setDonationInfo] = useState({
    photo: null,
    name: '',
    location: '',
    message: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [missingFields, setMissingFields] = useState({
    photo: false,
    name: false,
    location: false,
  });

  const handleBackPress = () => {
    navigation.goBack();
  };

  const uploadImageAsync = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storage = getStorage();
    const storageRef = ref(storage, `donations/${Date.now()}`);
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
      setDonationInfo({ ...donationInfo, photo: uploadUrl });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
  
    try {
      const createdAt = Timestamp.fromDate(new Date()); 
  
      const donationDocRef = await addDoc(donationCollection, {
        photo: donationInfo.photo,
        name: donationInfo.name,
        location: donationInfo.location,
        message: donationInfo.message,
        donor_email: userEmail,
        createdAt, 
        publicationStatus: 'pending',
      });

      const updatedDonationInfo = {
        ...donationInfo,
        id: donationDocRef.id,
        publicationStatus: 'pending',
      };

      await notifySubscribers(userEmail, updatedDonationInfo);
  
      Alert.alert(`Donation of ${donationInfo.name} successfully submitted!`);
      resetDonationInfo();
      setShowModal(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      Alert.alert('An error occurred while submitting your donation. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const validateForm = () => {
    const missing = {
      photo: !donationInfo.photo,
      name: !donationInfo.name,
      location: !donationInfo.location,
    };

    setMissingFields(missing);

    if (Object.values(missing).some(field => field)) {
      Alert.alert("Please provide the missing information");
      return false;
    }

    return true;
  };

  const handleDonate = () => {
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const resetDonationInfo = () => {
    setDonationInfo({
      photo: null,
      name: '',
      location: '',
      message: '',
    });
  };

  const [isPhotoPickerModalVisible, setIsPhotoPickerModalVisible] = useState(false);

  const PhotoPickerModal = ({ isVisible, onCancel }) => (
    <Modal
      visible={isVisible}
      onRequestClose={onCancel}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlayPhoto}>
        <View style={styles.modalContainerPhoto}>
          <TouchableOpacity style={styles.cancelButtonTopRight} onPress={onCancel}>
            <Icon name="times" size={24} color="#05652D" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Select Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage('library');
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#05652D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage('camera');
                onCancel();
              }}
            >
              <Icon name="camera" size={80} color="#05652D" />

            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleChoosePhoto = () => {
    setIsPhotoPickerModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <PhotoPickerModal
        isVisible={isPhotoPickerModalVisible}
        onCancel={() => setIsPhotoPickerModalVisible(false)}
      />
      <Modal
        visible={showModal}
        onRequestClose={handleCancel}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Donate Confirmation</Text>
            <View style={styles.modalContent}>
              {donationInfo.photo && (
                <Image source={{ uri: donationInfo.photo }} style={styles.modalProductImage} />
              )}

              <View style={styles.modalProductDetails}>
                <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Name:</Text> {donationInfo.name}</Text>
                <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Location:</Text> {donationInfo.location}</Text>
                <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Message:</Text> {donationInfo.message}</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Donate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <View style={styles.backContainer}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Donate</Text>
      </View>
      <ScrollView style={styles.contentContainer}>
        <View style={styles.formContainer}>
        <Text style={styles.label}>
          Item Photo
          {missingFields.location && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
          <TouchableOpacity style={styles.addPhotoContainer} onPress={handleChoosePhoto}>
            {donationInfo.photo ? (
              <Image source={{ uri: donationInfo.photo }} style={styles.productImage} />
            ) : (
              <Icon name="camera" size={24} color="#D3D3D3" />
            )}
          </TouchableOpacity>
          <Text style={styles.label}>
            Item Name
            {missingFields.location && <Text style={{ color: 'red' }}> *</Text>}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={donationInfo.name}
            onChangeText={(name) => setDonationInfo({ ...donationInfo, name })}
          />
          <Text style={styles.label}>
            Location
            {missingFields.location && <Text style={{ color: 'red' }}> *</Text>}
          </Text>
          <TouchableOpacity style={styles.input} onPress={() => setLocationSearchModalVisible(true)}>
            <Text>{donationInfo.location || 'Enter Location'}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your message"
            multiline={true}
            numberOfLines={3}
            value={donationInfo.message}
            onChangeText={(message) => setDonationInfo({ ...donationInfo, message })}
          />
          <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
            <Text style={styles.buttonText}>Donate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
  },
  contentContainer: {
    padding: 20,
  },
  formContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    marginBottom: 20,
  },
  addPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  donateButton: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalProductDetails: {
    marginBottom: 20,
  },
  modalDetail: {
    fontSize: 18,
    marginBottom: 8,
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#05652D',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E3E3',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#05652D',
    padding: 10,
    borderRadius: 5,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlayPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainerPhoto: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelButtonTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalSubHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  photoOption: {
    alignItems: 'center',
    padding: 10,
  },
  separateBorder: {
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 10,
    padding: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    height: screenHeight / 2, 
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
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
  searchResultsContainer: {
    maxHeight: screenHeight / 2 - 80,
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
  modalProductImage: {
    width: 120, 
    height: 120, 
    borderRadius: 20, 
    alignSelf: 'center', 
    marginBottom: 20, 
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF', 
  },
});

export default Donate;