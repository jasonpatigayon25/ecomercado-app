import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

const SuccessModal = ({ donationName, isVisible, onCancel, navigateToDonate, navigateToDonationPosts }) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.centeredView1}>
        <View style={styles.modalView1}>
          <Text style={styles.modalText}>Donation Pending</Text>
          <Icon name="check-circle" size={60} color="white" />
          <Text style={styles.pendingText}>Donation successfully submitted!</Text>
          <Text style={styles.subtext}>
            The donation is pending approval. You can view your pending donations in your dashboard.
          </Text>
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonHome]}
              onPress={() => {
                navigateToDonate();
              }}
            >
              <Text style={styles.homeButton}>Add Donation Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonOrder]}
              onPress={navigateToDonationPosts}
            >
              <Text style={styles.homeButton}>My Donation Posts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const screenHeight = Dimensions.get('window').height;

const Donate = ({ navigation }) => {

  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const [isSubPhotoPickerModalVisible, setIsSubPhotoPickerModalVisible] = useState(false);
  const MAX_SUB_PHOTOS = 15;

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
  
  const addNewItemNameField = () => {
    setDonationInfo(prevState => ({
      ...prevState,
      itemNames: [...prevState.itemNames, ''] 
    }));
  };

  const handleItemNameChange = (text, index) => {
    if (Array.isArray(donationInfo.itemNames)) {
      const updatedItemNames = donationInfo.itemNames.map((name, i) => {
        if (i === index) return text;
        return name;
      });
      setDonationInfo({ ...donationInfo, itemNames: updatedItemNames });
    }
  };

  const removeSubPhoto = (indexToRemove) => {
    if (Array.isArray(donationInfo.subPhotos)) {
      const updatedSubPhotos = donationInfo.subPhotos.filter((_, index) => index !== indexToRemove);
      setDonationInfo({ ...donationInfo, subPhotos: updatedSubPhotos });
    }
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
    subPhotos: [],
    name: '',
    itemNames: [''],
    category: '',
    weight: '',
    width: '',  
    length: '',
    height: '',
    location: '',
    purpose: '',
    message: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [missingFields, setMissingFields] = useState({
    photo: false,
    name: false,
    location: false,
    width: false,
    length: false,
    height: false,
  });

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleDimensionChange = (dimension, value) => {
    setDonationInfo(prevState => ({
      ...prevState,
      [dimension]: value,
    }));
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
    if (Array.isArray(donationInfo.subPhotos) && Array.isArray(donationInfo.itemNames)) {
      try {
        const createdAt = Timestamp.fromDate(new Date());
  
        const donationDocRef = await addDoc(donationCollection, {
          photo: donationInfo.photo,
          subPhotos: donationInfo.subPhotos,
          name: donationInfo.name,
          category: donationInfo.category,
          itemNames: donationInfo.itemNames,
          weight: donationInfo.weight,
          // width: donationInfo.width,
          // length: donationInfo.length,
          // height: donationInfo.height,
          location: donationInfo.location,
          purpose: donationInfo.purpose,
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
        setSuccessModalVisible(true);
        // Alert.alert(`Donation of ${donationInfo.name} successfully submitted!`);
        resetDonationInfo();
        setShowModal(false);
      } catch (error) {
        console.error("Error submitting donation:", error);
        Alert.alert('An error occurred while submitting your donation. Please try again.');
      }
    } else {
      console.error('An error occurred: subPhotos or itemNames is not an array.');
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
      // width: donationInfo.width === '',
      // length: donationInfo.length === '',
      // height: donationInfo.height === '',
      weight: donationInfo.weight === '',
      purpose: donationInfo.purpose === '',
      category: donationInfo.category === '' || donationInfo.category === 'Select a Category',
      itemNames: donationInfo.itemNames.some(item => item === ''),
      subPhotos: donationInfo.subPhotos.length === 0,
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
    setDonationInfo(prevState => ({
        ...prevState,
        photo: null,
        subPhotos: [],
        name: '',
        itemNames: [''],
        category: '',
        weight: '',
        // width: '',
        // length: '',
        // height: '',
        purpose: '',
        message: '',
        location: prevState.location, 
    }));
};

const handleWeightChange = (weight) => {
  if (weight === '') {
    setDonationInfo({ ...donationInfo, weight });
    setMissingFields({ ...missingFields, weightError: false });
  } else if (Number(weight) > 0 && Number(weight) <= 30) {
    setDonationInfo({ ...donationInfo, weight });
    setMissingFields({ ...missingFields, weightError: false });
  } else {
    setDonationInfo({ ...donationInfo, weight: '' });
    setMissingFields({ ...missingFields, weightError: true });
  }
};

const incrementWeight = () => {
  const currentWeight = Number(donationInfo.weight) || 0;
  if (currentWeight < 30) {
    setDonationInfo({ ...donationInfo, weight: String(currentWeight + 1) });
    setMissingFields({ ...missingFields, weightError: false });
  }
};

const decrementWeight = () => {
  const currentWeight = Number(donationInfo.weight) || 0;
  if (currentWeight > 1) {
    setDonationInfo({ ...donationInfo, weight: String(currentWeight - 1) });
  }
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

  const SubPhotoPickerModal = ({ isVisible, onCancel }) => (
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
          <Text style={styles.modalHeader}>Select Sub-Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await handleSubPhotoPickImage('library');
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#05652D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await handleSubPhotoPickImage('camera');
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
  
  const handleChooseSubPhoto = () => {
    setIsSubPhotoPickerModalVisible(true);
  };
  
  const handleChoosePhoto = () => {
    setIsPhotoPickerModalVisible(true);
  };

  const handleSubPhotoPickImage = async (type) => {
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
  
    if (result && !result.cancelled && result.assets && result.assets.length > 0) {
      const uploadUrl = await uploadImageAsync(result.assets[0].uri);
      setDonationInfo({
        ...donationInfo,
        subPhotos: [...donationInfo.subPhotos, uploadUrl]
      });
    }
  
    setIsSubPhotoPickerModalVisible(false);
  };


  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, 'donationCategories'));
      const fetchedCategories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title
      }));
      setCategories(fetchedCategories);
    };

    fetchCategories();
  }, []);

  return (
    <View style={styles.container}>
      <PhotoPickerModal
        isVisible={isPhotoPickerModalVisible}
        onCancel={() => setIsPhotoPickerModalVisible(false)}
      />
      <SubPhotoPickerModal
          isVisible={isSubPhotoPickerModalVisible}
          onCancel={() => setIsSubPhotoPickerModalVisible(false)}
        />
    <Modal
        visible={showModal}
        onRequestClose={handleCancel}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContainerScroll}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Donations Confirmation</Text>
              <View style={styles.modalContent}>
                {donationInfo.photo && (
                  <Image source={{ uri: donationInfo.photo }} style={styles.modalProductImage} />
                )}

                <View style={styles.modalProductDetails}>
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Name:</Text> {donationInfo.name}</Text>
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Category:</Text> {donationInfo.category}</Text>
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Location:</Text> {donationInfo.location}</Text>
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Purpose:</Text> {donationInfo.purpose}</Text>
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Message:</Text> {donationInfo.message}</Text>
                  
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Weight:</Text> {donationInfo.weight} kg</Text>
                  {/* <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Donation Packaging:</Text> {donationInfo.width} cm x {donationInfo.length} cm x {donationInfo.height} cm</Text> */}
                  
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Item Photos:</Text> </Text>
                  <View style={styles.subPhotosContainer}>
                    {donationInfo.subPhotos?.map((photo, index) => (
                        <Image key={index} source={{ uri: photo }} style={styles.modalSubPhotoImage} />
                    ))}
                  </View>

                  
                  <Text style={styles.modalDetail}><Text style={styles.modalLabel}>Item Names:</Text> </Text>
                  <View style={styles.modalItemNamesContainer}>
                      {donationInfo.itemNames?.map((name, index) => (
                          <Text key={index} style={styles.modalItemName}>{index + 1}. {name}</Text>
                      ))}
                  </View>
                  
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Donate</Text>
            </TouchableOpacity>
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
          Main Photo
          {missingFields.photo && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
        <TouchableOpacity style={styles.addPhotoContainer} onPress={() => handleChoosePhoto()}>
          {donationInfo.photo ? (
            <Image source={{ uri: donationInfo.photo }} style={styles.productImage} />
          ) : (
            <Icon name="camera" size={24} color="#D3D3D3" />
          )}
        </TouchableOpacity>
        <Text style={styles.label}>
          Item Photos
          {missingFields.subPhotos && <Text style={{ color: 'red' }}> *</Text>}  
        </Text>
      <View style={styles.subPhotosContainer}>
        {Array.isArray(donationInfo.subPhotos) && donationInfo.subPhotos.map((photo, index) => (
          <View key={index} style={styles.subPhotoContainer}>
            {photo ? (
              <TouchableOpacity onPress={handleChooseSubPhoto} style={[styles.subPhoto, styles.cameraIconContainer]}>
                <Image source={{ uri: photo }} style={styles.subPhotoImage} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleChooseSubPhoto} style={[styles.subPhoto, styles.cameraIconContainer]}>
                <Icon name="camera" size={24} color="#D3D3D3" />
              </TouchableOpacity>
            )}
            {photo && (
              <TouchableOpacity style={styles.removePhotoIconContainer} onPress={() => removeSubPhoto(index)}>
                <Icon name="times-circle" size={24} color="#FF0000" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        {Array.isArray(donationInfo.subPhotos) && donationInfo.subPhotos.length < MAX_SUB_PHOTOS && (
          <TouchableOpacity onPress={handleChooseSubPhoto} style={[styles.subPhoto, styles.cameraIconContainer]}>
            <Icon name="camera" size={24} color="#D3D3D3" />
          </TouchableOpacity>
        )}
      </View>

        <Text style={styles.label}>
          Donation Name
          {missingFields.name && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
        <TextInput
          style={[styles.input, missingFields.name && styles.missingField]}
          placeholder="Enter donation name"
          value={donationInfo.name}
          onChangeText={(name) => setDonationInfo({ ...donationInfo, name })}
        />
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Item Names</Text>
        {Array.isArray(donationInfo.itemNames) && donationInfo.itemNames.map((name, index) => (
          <View key={index} style={styles.itemInputContainer}>
            <TextInput
              style={[styles.input1, styles.itemInput, missingFields.itemNames && styles.missingField]}
              placeholder={`Enter item name ${index + 1}`}
              value={name}
              onChangeText={(text) => handleItemNameChange(text, index)}
            />
            {index === donationInfo.itemNames.length - 1 && ( 
              <TouchableOpacity onPress={addNewItemNameField} style={styles.addButton}>
                <Icon name="plus" size={40} color="#D3D3D3" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      <Text style={styles.label}>Eco-Bundle Category</Text>
      <View style={[styles.pickerContainer, missingFields.category && styles.missingField]}>
        <Picker
          selectedValue={donationInfo.category}
          onValueChange={(itemValue) => setDonationInfo({ ...donationInfo, category: itemValue })}
          style={[styles.picker]}
        >
          <Picker.Item label="Select a Category" value="" />
          {categories.map((category) => (
            <Picker.Item key={category.id} label={category.title} value={category.title} />
          ))}
        </Picker>
      </View>
        <Text style={styles.label}>Weight (kg)</Text>
        <View style={styles.weightControlContainer}>
  <TouchableOpacity style={styles.weightControlButton} onPress={decrementWeight}>
    <Text style={styles.weightControlButtonText}>-</Text>
  </TouchableOpacity>
  <TextInput
    style={[styles.weightInput, missingFields.weightError && styles.missingField]}
    placeholder="Enter total weight (1-30 kg)"
    value={donationInfo.weight}
    keyboardType="numeric"
    onChangeText={handleWeightChange}
  />
  <TouchableOpacity style={styles.weightControlButton} onPress={incrementWeight}>
    <Text style={styles.weightControlButtonText}>+</Text>
  </TouchableOpacity>
</View>
{missingFields.weightError && (
  <Text style={styles.validationText}>Please do not exceed 30kg.</Text>
)}

        {/* <Text style={styles.label}>Donation Packaging (cm)</Text>
        <View style={styles.dimensionsContainer}>
        <TextInput
            style={[styles.input, styles.dimensionInput, missingFields.width && styles.missingField]}
            placeholder="Width (cm)"
            keyboardType="numeric"
            value={donationInfo.width}
            onChangeText={(text) => setDonationInfo({ ...donationInfo, width: text })}
          />
          <TextInput
            style={[styles.input, styles.dimensionInput, missingFields.length && styles.missingField]}
            placeholder="Length (cm)"
            keyboardType="numeric"
            value={donationInfo.length}
            onChangeText={(text) => setDonationInfo({ ...donationInfo, length: text })}
          />
          <TextInput
            style={[styles.input, styles.dimensionInput, missingFields.height && styles.missingField]}
            placeholder="Height (cm)"
            keyboardType="numeric"
            value={donationInfo.height}
            onChangeText={(text) => setDonationInfo({ ...donationInfo, height: text })}
          />
        </View> */}

        <Text style={styles.label}>Purpose</Text>
        <TextInput
          style={[styles.input, missingFields.purpose && styles.missingField]}
          placeholder="e.g., For People in Need"
          value={donationInfo.purpose}
          onChangeText={(text) => setDonationInfo({ ...donationInfo, purpose: text })}
        />

        <Text style={styles.label}>
          Location
          {missingFields.location && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
        <TouchableOpacity style={[styles.input, missingFields.location && styles.missingField]} onPress={openLocationSearchModal}>
          <Text>{donationInfo.location || 'Enter Location'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your message (optional)"
          multiline
          numberOfLines={4}
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
      <SuccessModal 
        donationName={donationInfo.name}
        isVisible={successModalVisible}
        onCancel={() => setSuccessModalVisible(false)}
        navigateToDonate={() => {
          setSuccessModalVisible(false);
          navigation.navigate('Donate');
        }}
        navigateToDonationPosts={() => {
          setSuccessModalVisible(false);
          navigation.navigate('DonationPosts');
        }}
      />
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
  input1: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    marginBottom: 20,
    width: '80%',
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
    width: '100%',
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
    padding: 20,
    backgroundColor: '#fff',
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
    borderColor: '#fff',
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
    width: '100%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
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
  subPhotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  subPhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  subPhoto: {
    width: 120,
    height: 120,
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cameraIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoIconContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  subPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  itemInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    marginLeft: 10,
    marginBottom: 10,
  },
  picker: {
    height: 40,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    marginBottom: 10,
  },
  dimensionsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dimensionInput: {
    flex: 1,
    height: 40,
    borderWidth: 2,
    borderColor: '#D3D3D3',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  modalSubPhotoImage: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 5,
  },

  modalItemName: {
    fontSize: 16,
    marginBottom: 5,
  },
    modalContainerScroll: {
    flexGrow: 1,
  },
  centeredView1: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    // backgroundColor: 'rgba(0, 0, 0, 0.6)',

  },
  modalView1: {
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
    fontSize: 20,
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
  modalButtonHome: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  modalButton: {
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 10,
    width: '60%',
  },  
  missingField: {
    borderColor: 'red',
  },   
  weightControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightControlButton: {
    padding: 10,
    backgroundColor: '#D3D3D3',
    borderRadius: 5,
  },
  weightControlButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  weightInput: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    textAlign: 'center',
    marginHorizontal: 5,
    flex: 1,
  },
  validationText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
    textAlign: 'center',
  },

});

export default Donate;