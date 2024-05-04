import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import axios from 'axios';
import { Dimensions } from 'react-native';

const screenHeight = Dimensions.get('window').height;

const EditProfile = ({ route, navigation }) => {
  const { location } = route.params || {};

  const [address, setAddress] = useState('');
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
    setAddress(selectedAddress); 
    setLocationSearchModalVisible(false); 
  };

  const [showEditIcon, setShowEditIcon] = useState(false);
  const [initialUserProfile, setInitialUserProfile] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    photoUrl: '',
  });

  useEffect(() => {

    if (location) {
      setAddress(location);
    }
  }, [location]);

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
            setUserProfile({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email,
              photoUrl: userData.photoUrl || '',
            });
            setInitialUserProfile({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email,
              photoUrl: userData.photoUrl || '',
              address: userData.address || ''
            });  // Ensure this is set before trying to access it
            setAddress(userData.address || '');
          } else {
            Alert.alert('Error', `No profile found for user email: ${user.email}`);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          Alert.alert('Error', 'Error fetching user profile.');
        }
      };
  
      fetchUserProfile();
    }
  }, []);  

  const hasProfileChanged = () => {
    return (
      userProfile?.firstName !== initialUserProfile?.firstName ||
      userProfile?.lastName !== initialUserProfile?.lastName ||
      profilePhotoUrl !== initialUserProfile?.photoUrl ||
      address !== initialUserProfile?.address
    );
  };

  const handleInputChange = (name, value) => {
    setUserProfile(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSaveChanges = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!hasProfileChanged()) {
      Alert.alert('No Changes', 'Your profile has not been changed.');
      return;
    }

    if (user) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", user.email));
  
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDocRef = querySnapshot.docs[0].ref;
  
          if (!userProfile.firstName || !userProfile.lastName) {
            Alert.alert('Error', 'First name and last name cannot be empty.');
            return;
          }

          await updateDoc(userDocRef, {
            firstName: userProfile.firstName.trim(),
            lastName: userProfile.lastName.trim(),
            address: address.trim(),
          });
  
          if (profilePhotoUrl) {
            await updateDoc(userDocRef, {
              photoUrl: profilePhotoUrl,
            });
          }
  
          Alert.alert('Success', 'Profile updated successfully.', [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Account'),
            },
          ]);
        } else {
          Alert.alert('Error', `No profile found for user email: ${user.email}`);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Error updating profile.');
      }
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
  
  const pickImage = async (type) => {
    let result;
    if (type === "camera") {
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
  
    if (!result.canceled && result.assets) {
      const uploadUrl = await uploadImageAsync(result.assets[0].uri);
      setProfilePhotoUrl(uploadUrl);
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
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Select Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage("library");
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage("camera");
                onCancel();
              }}
            >
              <Icon name="camera" size={80} color="#fff" />
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonIcon} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
      </View>
      <ScrollView style={styles.contentContainer}>
        <View style={styles.formItem}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={userProfile.email}
            editable={false} 
          />
        </View>
        <View style={styles.formItem}>
          <Text style={styles.label}>Photo</Text>
          {!profilePhotoUrl ? (
            <TouchableOpacity onPress={handleChoosePhoto} style={styles.addPhotoButton}>
              <Icon name="plus" size={20} color="#05652D" />
              <Text> Add Photo</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.profileImageContainer}>
              <Image source={{ uri: profilePhotoUrl }} style={styles.profileImage} />
              <TouchableOpacity onPress={handleChoosePhoto} style={styles.changeButton}>
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.formItem}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={userProfile.firstName}
            onChangeText={(text) => handleInputChange('firstName', text)}
          />
        </View>
        <View style={styles.formItem}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={userProfile.lastName}
            onChangeText={(text) => handleInputChange('lastName', text)}
          />
           </View>
          <View style={styles.formItem}>
            <Text style={styles.label}>Address</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => navigation.navigate('MapLocationSelectorProfile')}
            >
              <Text style={styles.inputText}>{address}</Text>
            </TouchableOpacity>
          </View>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
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
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 3,
  },
  backButtonIcon: {
    marginRight: 15,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  formItem: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3D3D3', 
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20, 
    marginHorizontal: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20, 
  },
  changeButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#05652D',
    borderRadius: 20,
    padding: 5,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  addPhotoButton: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 50,
    width: 100,
    height: 100,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, 
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
});

export default EditProfile;