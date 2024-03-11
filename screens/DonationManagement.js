
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { FlatList, TextInput } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DonorTab from '../navbars/DonorTab';

const window = Dimensions.get("window");

const DonationManagement = ({ navigation }) => {

  const animation = useRef(new Animated.Value(0)).current;
  const [userEmail, setUserEmail] = useState(null);
  const [donations, setDonations] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  const [selectedTab, setSelectedTab] = useState('Posted');
  const scrollRef = useRef();
  const windowWidth = Dimensions.get('window').width;

  useEffect(() => {
    const tabIndex = ['Posted', 'Successful', 'Acquired'].indexOf(selectedTab);
    scrollRef.current?.scrollTo({ x: tabIndex * windowWidth, animated: true });
  }, [selectedTab, windowWidth]);

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const tabIndex = Math.floor(scrollX / windowWidth);
    setSelectedTab(['Posted', 'Successful', 'Acquired'][tabIndex]);
  };

  const getFilteredDonations = (tab) => {
    switch (tab) {
      case 'Posts':
        return donations.filter(donation => 
          donation.publicationStatus === 'approved' || donation.publicationStatus === 'pending'
        );
      case 'Successful':
        return donations.filter(donation => donation.publicationStatus === 'successful');
      case 'Acquired':
        return donations.filter(donation => donation.publicationStatus === 'acquired'); 
      default:
        return donations;
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false 
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false 
        })
      ])
    ).start();
  }, []);

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['green', 'yellow'] 
  });

  const animatedStyle = {
    backgroundColor
  };

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editableDonation, setEditableDonation] = useState(null);

  const handleEdit = (donation) => {
    if (donation) {
      setEditableDonation(donation);
      setEditModalVisible(true);
    }
    setIsModalVisible(false);
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
  
  const takePhoto = async () => {
    let cameraPermissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermissionResult.granted === false) {
      alert("Permission to access the camera is required!");
      return;
    }
  
    let cameraResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!cameraResult.canceled && cameraResult.assets) {
      const selectedImage = cameraResult.assets[0];
      if (selectedImage.uri) {
        const uploadUrl = await uploadImageAsync(selectedImage.uri);
        setEditableDonation({ ...editableDonation, photo: uploadUrl });
      }
    }
  };
  
  const chooseFromGallery = async () => {
    let galleryPermissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (galleryPermissionResult.granted === false) {
      alert("Permission to access the gallery is required!");
      return;
    }
  
    let galleryResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!galleryResult.canceled && galleryResult.assets) {
      const selectedImage = galleryResult.assets[0];
      if (selectedImage.uri) {
        const uploadUrl = await uploadImageAsync(selectedImage.uri);
        setEditableDonation({ ...editableDonation, photo: uploadUrl });
      }
    }
  };  

  const handleSaveEdit = async (updatedDonation) => {
    if (updatedDonation && updatedDonation.id) {
      try {
        const donationRef = doc(db, 'donation', updatedDonation.id);
        await updateDoc(donationRef, updatedDonation);
  
        const updatedDonations = donations.map(donation => {
          if (donation.id === updatedDonation.id) {
            return updatedDonation;
          }
          return donation;
        });
  
        setDonations(updatedDonations);
        Alert.alert('Success', 'Donation updated successfully.');
        setEditModalVisible(false);
      } catch (error) {
        console.error("Error updating donation: ", error);
        Alert.alert('Error', 'Unable to update donation.');
      }
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to permanently delete this donation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Delete Permanently",
          onPress: async () => {
            if (selectedDonation) {
              try {
                const donationRef = doc(db, 'donation', selectedDonation.id);
                await deleteDoc(donationRef);
                Alert.alert('Success', 'Donation deleted successfully.');
  
                setDonations(donations.filter(donation => donation.id !== selectedDonation.id));
                setIsModalVisible(false); 
              } catch (error) {
                console.error("Error deleting donation: ", error);
                Alert.alert('Error', 'Unable to delete donation.');
              }
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const renderEmptyDonations = () => (
    <View style={styles.emptyDonationsContainer}>
      <Icon2 name="hand-heart" size={50} color="#ccc" />
      <Text style={styles.emptyDonationsText}>No Donations Added Yet</Text>
    </View>
  );

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user !== null) {
      setUserEmail(user.email);
      fetchUserDonations(user.email);
    }
  }, []);

  const fetchUserDonations = async (email) => {
    const userDonations = [];
    const q = query(collection(db, "donation"), where("donor_email", "==", email), orderBy("createdAt", "desc"));

    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        userDonations.push({ id: doc.id, ...doc.data() });
      });
      setDonations(userDonations);
    } catch (error) {
      console.error("Error fetching donations: ", error);
      Alert.alert('Error', 'Unable to fetch donations.');
    }
  };

  const showOptions = (item, event) => {
    const { pageX, pageY } = event.nativeEvent;
    const dropdownY = pageY > window.height / 2 ? pageY - 150 : pageY;
    setDropdownPosition({ x: pageX, y: dropdownY });
    setSelectedDonation(item);
    setIsModalVisible(true);
  };
  
  const DonationItem = ({ item }) => (
    <View style={styles.productItemContainer}>
      <Image source={{ uri: item.photo }} style={styles.productItemImage} />
      <View style={styles.productItemDetails}>
        <Text style={styles.productItemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        <View style={styles.productItemMetaContainer}>

          <Text style={styles.productItemLocation} numberOfLines={1} ellipsizeMode="tail"><Icon name="map-marker" size={14} color="#666" /> {item.location}</Text>
        </View>
        <Text style={styles.productItemDescription} numberOfLines={1} ellipsizeMode="tail">{item.message}</Text>
      </View>
      {item.publicationStatus === 'approved' && (
        <View style={styles.statusIconContainer}>
          <Icon name="check" size={14} color="green" />
          <Text style={styles.statusText}>Approved</Text>
        </View>
      )}
      {item.publicationStatus === 'pending' && (
        <View style={styles.statusIconContainer}>
          <Icon name="clock-o" size={14} color="orange" />
          <Text style={styles.statusText}>Pending</Text>
        </View>
      )}
      <TouchableOpacity style={styles.productItemOptionsButton} onPress={(event) => showOptions(item, event)}>
        <Icon name="ellipsis-v" size={20} color="#05652D" />
      </TouchableOpacity>
    </View>
  );

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
                await chooseFromGallery();
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await takePhoto();
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

  const pickImage = () => {
    setIsPhotoPickerModalVisible(true);
  };

  const EditDonationModal = ({ isVisible, donation, onSave, onCancel }) => {
    const [tempDonation, setTempDonation] = useState(donation);
  
    useEffect(() => {
      if (donation) {
        setTempDonation(donation);
      }
    }, [donation]);
  
    const handleSave = () => {
      onSave(tempDonation);
    };
  
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onCancel}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>Edit Donation</Text>
            <TouchableOpacity onPress={pickImage}>
              {tempDonation?.photo ? (
                <Image source={{ uri: tempDonation.photo }} style={{ width: 100, height: 100, marginBottom: 20, borderRadius: 15 }} />
              ) : (
                <Icon name="camera" size={24} color="#05652D" />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.editModalInput}
              placeholder="Name"
              value={tempDonation.name}
              onChangeText={(text) => setTempDonation({ ...tempDonation, name: text })}
            />
            <TextInput
              style={styles.editModalInput}
              placeholder="Location"
              value={tempDonation.location}
              onChangeText={(text) => setTempDonation({ ...tempDonation, location: text })}
            />
            <TextInput
              style={styles.editModalInput}
              placeholder="Message"
              value={tempDonation.message}
              onChangeText={(text) => setTempDonation({ ...tempDonation, message: text })}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.editModalSave} onPress={handleSave}>
              <Text style={styles.editModalSaveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editModalCancel} onPress={onCancel}>
              <Text style={styles.editModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Donation Management</Text>
        <Animated.View style={[styles.addDonationButton, animatedStyle]}>
          <TouchableOpacity onPress={() => navigation.navigate('Donate')}>
            <Icon name="plus" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
      <DonorTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        ref={scrollRef}
      >
        {['Posted', 'Successful', 'Acquired'].map((tab, index) => (
          <View key={index} style={{ width: windowWidth }}>
            <FlatList
              data={getFilteredDonations(tab)}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <DonationItem item={item} />}
              ListEmptyComponent={renderEmptyDonations}
            />
          </View>
        ))}
      </ScrollView>
      <Modal
        animationType="none" 
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setIsModalVisible(false)}
          activeOpacity={1}
        >
          <View 
            style={[styles.modalView, 
              { 
                position: 'absolute',
                left: dropdownPosition.x - 100, 
                top: dropdownPosition.y
              }
            ]}
          >
            <TouchableOpacity style={styles.modalOption} onPress={() => handleEdit(selectedDonation)}>
              <Text style={styles.modalOptionText}>Edit Donation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={handleDelete}>
              <Text style={styles.modalOptionText}>Delete Donation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.modalOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {editableDonation && (
        <EditDonationModal
          isVisible={editModalVisible}
          donation={editableDonation}
          onSave={handleSaveEdit}
          onCancel={() => setEditModalVisible(false)}
        />
      )}
      <PhotoPickerModal
        isVisible={isPhotoPickerModalVisible}
        onCancel={() => setIsPhotoPickerModalVisible(false)}
      />
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
    justifyContent: 'space-between', 
    backgroundColor: '#05652D',
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
  title: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  donationContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    alignItems: 'center',
  },
  donationImage: {
    width: 80,
    height: 80,
    borderRadius: 15,
    marginRight: 10,
  },
  donationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  donationName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  donationLocation: {
    fontSize: 16,
    marginBottom: 5,
  },
  donationMessage: {
    fontSize: 14,
  },
  optionsButton: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: 150,
  },
  modalOption: {
    paddingVertical: 8,
    alignItems: 'flex-start',
    width: '100%',
  },
  modalOptionText: {
    color: '#05652D',
    fontSize: 14,
  },
  editModalContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    width: '100%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  editModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'center',
    marginBottom: 20,
  },
  editModalInput: {
    borderBottomWidth: 1,
    borderColor: '#e1e1e1',
    paddingVertical: 10,
    marginBottom: 20,
    fontSize: 16,
    borderRadius: 5,
  },
  editModalSave: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  editModalSaveText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editModalCancel: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  editModalCancelText: {
    color: '#05652D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyDonationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyDonationsText: {
    fontSize: 18,
    color: '#ccc',
    marginTop: 10,
  },
  modalOverlayPhoto: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainerPhoto: {
    width: '100%',
    backgroundColor: '#05652D',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  cancelButtonPhoto: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 5,
  },
  cancelTextPhoto: {
    color: '#fff',
    fontSize: 18,
  },   
  photoOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 10,
    marginTop: 20,
  },
  photoOption: {
    alignItems: 'center',
    padding: 10,
  },
  separateBorder: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
  }, 
  donatedText: {
    color: 'grey',
  },
  donatedLabel: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 5,
  },
  productItemContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    marginVertical: 8,
    padding: 10,
    position: 'relative', 
    alignItems: 'center',
  },
  
  productItemImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  
  productItemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  
  productItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  
  productItemMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  
  productItemLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  
  productItemLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  
  productItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 10,
  },
  
  approvedIconContainer: {
  position: 'absolute',
  top: 10, 
  right: 10, 
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 5, 
  padding: 2, 
},

approvedText: {
  fontSize: 12,
  marginLeft: 4,
  color: 'green',
},
  
  productItemOptionsButton: {
    padding: 8,
    marginLeft: 10,
  },
  statusIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 5,
    padding: 2,
  },
  
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#808080',
  },
 
  addDonationButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },

});

export default DonationManagement;
