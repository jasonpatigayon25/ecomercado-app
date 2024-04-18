import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Image } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { Dimensions } from 'react-native';

const screenHeight = Dimensions.get('window').height;

const EditSellerInfo = ({ navigation }) => {
  const [sellerName, setSellerName] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [type, setType] = useState('Individual');
  const [sellerAddress, setSellerAddress] = useState(''); 
  const [email, setEmail] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [backgroundPhotoUri, setBackgroundPhotoUri] = useState(null);

  const [sellerDocId, setSellerDocId] = useState('');

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

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

  const handleAddressSelect = (selectedAddress) => {
    setSellerAddress(selectedAddress); 
    setLocationSearchModalVisible(false); 
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        setEmail(user.email);
        const q = query(collection(db, 'registeredSeller'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setSellerName(userData.sellerName);
          setRegisteredName(userData.registeredName);
          setType(userData.type);
          setSellerAddress(userData.sellerAddress);
          setProfilePhotoUri(userData.profilePhotoUri);
          setBackgroundPhotoUri(userData.backgroundPhotoUri);
          setSellerDocId(querySnapshot.docs[0].id);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleUpdateProfile = async () => {
    console.log('Updating seller profile:', sellerName, sellerAddress, email);
    try {
      if (sellerDocId) {
        await updateDoc(doc(db, 'registeredSeller', sellerDocId), {
          sellerName,
          registeredName,
          type,
          sellerAddress,
          profilePhotoUri,
          backgroundPhotoUri,
        });
        Alert.alert('Seller profile updated successfully');
        navigation.goBack();
      } else {
        console.error('Document ID not found for the seller');
        Alert.alert('Error updating seller profile');
      }
    } catch (error) {
      console.error('Error updating seller profile:', error);
      Alert.alert('Error updating seller profile');
    }
  };

  const uploadImageAsync = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
  
      const storage = getStorage();
      const storageRef = ref(storage, 'profile/' + Date.now());
      await uploadBytes(storageRef, blob);
  
      blob.close();
  
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Detailed error: ", error.message);
      throw error;
    }
  };
  
  const pickImage = async (sourceType) => {
    let result;
    if (sourceType === "camera") {
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
  
    if (!result.cancelled && result.assets) {
      const uploadUrl = await uploadImageAsync(result.assets[0].uri);
      return uploadUrl;
    }
  };
  
  const handleProfilePhotoUpload = async () => {
    Alert.alert(
      'Select Photo',
      'Choose a photo source',
      [
        { text: 'Take Photo', onPress: () => handlePhotoSourceSelection('profile', 'camera') },
        { text: 'Choose from Gallery', onPress: () => handlePhotoSourceSelection('profile', 'library') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };
  
  const handleBackgroundPhotoUpload = async () => {
    Alert.alert(
      'Select Photo',
      'Choose a photo source',
      [
        { text: 'Take Photo', onPress: () => handlePhotoSourceSelection('background', 'camera') },
        { text: 'Choose from Gallery', onPress: () => handlePhotoSourceSelection('background', 'library') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handlePhotoSourceSelection = async (photoType, sourceType) => {
    try {
      const uploadUrl = await pickImage(sourceType);
      if (uploadUrl) {
        if (photoType === 'profile') {
          setProfilePhotoUri(uploadUrl);
        } else if (photoType === 'background') {
          setBackgroundPhotoUri(uploadUrl);
        }
      }
    } catch (error) {
      console.error(`Error uploading ${photoType} photo:`, error);
    }
  };

  return (
    <View style={styles.container}>
     <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" />
        </TouchableOpacity>
      <Text style={styles.title}>Seller Registration</Text>
      </View>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.label}>Edit Seller Profile:</Text>
        <TextInput
          placeholder="Seller Name"
          value={sellerName}
          onChangeText={setSellerName}
          style={styles.input}
        />

        <Text style={styles.label}>Registered Name:</Text>
        <TextInput
          placeholder="Registered Name"
          value={registeredName}
          onChangeText={setRegisteredName}
          style={styles.input}
        />

        <Text style={styles.label}>Type:</Text>
        <RadioButton.Group onValueChange={newValue => setType(newValue)} value={type}>
          <RadioButton.Item label="Individual" value="Individual" />
          <RadioButton.Item label="Business" value="Business" />
        </RadioButton.Group>

        <Text style={styles.label}>Your Address:</Text> 
        <TextInput
          placeholder="Your Address"
          value={sellerAddress}
          onChangeText={setSellerAddress}
          onFocus={() => setLocationSearchModalVisible(true)}
          style={styles.input}
        />

        <Text style={styles.label}>Email Address:</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.inputEmail}
          editable={false}
        />
        <View>
          <Text style={styles.label}>
            Profile Photo:
          </Text>
          <TouchableOpacity style={styles.addPhotoContainer} onPress={handleProfilePhotoUpload}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.photoImage} />
            ) : (
              <Icon name="camera" size={24} color="#D3D3D3" style={styles.addPhotoIcon} />
            )}
          </TouchableOpacity>

          <Text style={styles.label}>
            Background Photo:
          </Text>
          <TouchableOpacity style={styles.addPhotoContainer} onPress={handleBackgroundPhotoUpload}>
            {backgroundPhotoUri ? (
              <Image source={{ uri: backgroundPhotoUri }} style={styles.photoImage} />
            ) : (
              <Icon name="camera" size={24} color="#D3D3D3" style={styles.addPhotoIcon} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={handleUpdateProfile}>
        <Text style={styles.buttonText}>Update Profile</Text>
      </TouchableOpacity>
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
                  onPress={() => handleAddressSelect(result.name)}
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
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    marginLeft: 20,
  },
  label: {
    color: '#05652D',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    color: '#333',
    marginBottom: 20,
  },
  inputEmail: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#D3D3D3',
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  backButtonText: {
    color: '#05652D',
    fontSize: 18,
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
  inputError: {
    borderColor: 'red', 
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    alignSelf: 'flex-start',
    marginRight: 10,
    marginTop: 4,
  },
  modalOverlayPhoto: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainerPhoto: {
    backgroundColor: '#05652D',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  cancelButtonTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalSubHeader: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  photoOption: {
    alignItems: 'center',
    padding: 10,
    marginVertical: 10,
  },
  separateBorder: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
  },
  photoOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  photoOption: {
    alignItems: 'center',
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#05652D',
    borderRadius: 8,
  },
  addPhotoContainer: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  addPhotoIcon: {
    marginBottom: 5,
  },
  photoImage: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
});

export default EditSellerInfo;
