
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
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { FlatList, TextInput } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DonorTab from '../navbars/DonorTab';

const window = Dimensions.get("window");

const DonationManagement = ({ navigation }) => {
  const scale = useRef(new Animated.Value(1)).current;  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);
  const animation = useRef(new Animated.Value(0)).current;
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedDonationForView, setSelectedDonationForView] = useState(null);
  const [requestCounts, setRequestCounts] = useState({});
  const [selectedPostsTab, setSelectedPostsTab] = useState('Approved');
  const [userEmail, setUserEmail] = useState(null);
  const [donations, setDonations] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [donationRequests, setDonationRequests] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [selectedTab, setSelectedTab] = useState('Posts');
  const scrollRef = useRef();
  const windowWidth = Dimensions.get('window').width;
  const [viewRequestsModalVisible, setViewRequestsModalVisible] = useState(false);
  const [selectedRequestForView, setSelectedRequestForView] = useState(null);

  useEffect(() => {
    const tabIndex = ['Posts', 'Requests','Successful', 'Acquired'].indexOf(selectedTab);
    scrollRef.current?.scrollTo({ x: tabIndex * windowWidth, animated: true });
  }, [selectedTab, windowWidth]);

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const tabIndex = Math.floor(scrollX / windowWidth);
    setSelectedTab(['Posts', 'Requests','Successful', 'Acquired'][tabIndex]);
  };

  const getFilteredDonations = (tab) => {
    switch (tab) {
      case 'Posts':
        return donations.filter(donation =>
          selectedPostsTab === 'Approved'
            ? donation.publicationStatus === 'approved'
            : donation.publicationStatus === 'pending'
        );
      case 'Requests':
        return donations.filter(donation => donation.publicationStatus === 'approved');
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

  useEffect(() => {
    const fetchDonationAcquired = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
    
      const userEmail = currentUser.email;
      const q = query(
        collection(db, "donationRequests"),
        where("requesterEmail", "==", userEmail),
        where("status", "==", "successful")
      );
    
      try {
        const querySnapshot = await getDocs(q);
        const acquiredRequests = [];
        querySnapshot.forEach((doc) => {
          acquiredRequests.push({ id: doc.id, ...doc.data() });
        });
        setDonationRequests(acquiredRequests);
      } catch (error) {
        console.error("Error fetching acquired donation requests: ", error);
        Alert.alert('Error', 'Unable to fetch acquired donation requests.');
      }
    };
  
    fetchDonationAcquired();
  }, []);

  const fetchUserDonations = async (email) => {

    const userDonations = [];
    const newRequestCounts = {};
    const q = query(collection(db, "donation"), where("donor_email", "==", email), orderBy("createdAt", "desc"));
  
    try {
      const querySnapshot = await getDocs(q);
      for (const doc of querySnapshot.docs) {
        const donationData = { id: doc.id, ...doc.data() };
        userDonations.push(donationData);
        const count = await fetchRequestCount(donationData.id);
        newRequestCounts[donationData.id] = count;
      }
      setDonations(userDonations);
      setRequestCounts(newRequestCounts);
    } catch (error) {
      console.error("Error fetching donations: ", error);
      Alert.alert('Error', 'Unable to fetch donations.');
    }
  };

  useEffect(() => {
    const fetchDonationRequests = async () => {
      if (!userEmail) return; 
  
      const q = query(collection(db, "donationRequests"), where("donorEmail", "==", userEmail));
      const querySnapshot = await getDocs(q);
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setDonationRequests(requests);
    };
  
    if (userEmail) {
      fetchDonationRequests();
    }
  }, [userEmail]);
  
  useEffect(() => {
    const fetchUserDetails = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const userDetailsMap = {};
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        userDetailsMap[userData.email] = {
          fullName: `${userData.firstName} ${userData.lastName}`,
          photoUrl: userData.photoUrl,
        };
      });
      setUserDetails(userDetailsMap);
    };
  
    fetchUserDetails();
  }, []);

  const showOptions = (item, event) => {
    const { pageX, pageY } = event.nativeEvent;
    const dropdownY = pageY > window.height / 2 ? pageY - 150 : pageY;
    setDropdownPosition({ x: pageX, y: dropdownY });
    setSelectedDonation(item);
    setIsModalVisible(true);
  };
  
  const DonationItem = ({ item, requestCount }) => (
    <TouchableOpacity onPress={() => handleViewDonation(item)}>
     <View style={styles.productItemContainer}>
      <Image source={{ uri: item.photo }} style={styles.productItemImage} />
      {item.publicationStatus === 'approved' && requestCount > 0 && (
        <TouchableOpacity
          style={styles.requestCounter}
          onPress={() => setSelectedTab('Requests')}
        >
          <Text style={styles.requestCountText}>{requestCount}</Text>
        </TouchableOpacity>
      )}
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
    </TouchableOpacity>
  );

  const fetchRequestCount = async (donationId) => {
    const q = query(collection(db, "donationRequests"), where("donationId", "==", donationId));
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error("Error fetching donation requests: ", error);
      Alert.alert('Error', 'Unable to fetch donation requests.');
      return 0;
    }
  };

  const RequestItem = ({ request, donationDetails }) => {
    const [response, setResponse] = useState('');
    const [isResponded, setIsResponded] = useState(false);
    const [showActionButtons, setShowActionButtons] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            const donationRequestRef = doc(db, 'donationRequests', request.id);
            const docSnap = await getDoc(donationRequestRef);
            if (docSnap.exists()) {
                const { status } = docSnap.data();
                setResponse(status);
                setIsResponded(status === 'accepted' || status === 'declined' || status === 'successful');
                setShowActionButtons(status === 'pending');
            }
        };

        fetchStatus();
    }, [request.id]);

    const getResponseStyle = () => ({
      responseText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: response === 'accepted' || response === 'successful' ? '#4CAF50' : '#f44336',
        textAlign: 'center',
        marginTop: 10,
      },
    });

    const renderInitialsImage = (fullName) => {
      const match = fullName.match(/\b(\w)/g) || [];
      const initials = ((match.shift() || '') + (match.pop() || '')).toUpperCase();
      return <Text style={styles.initials}>{initials}</Text>;
    };
  
    const requesterDetail = userDetails[request.requesterEmail] || {};
    const photoComponent = requesterDetail.photoUrl 
      ? <Image source={{ uri: requesterDetail.photoUrl }} style={styles.requesterPhoto} />
      : renderInitialsImage(requesterDetail.fullName || "");
  
    const donationSection = donationDetails ? (
      <View style={styles.donationDetailSection}>
        <Text style={styles.requestingLabel}>Requesting:</Text>
        <Image source={{ uri: donationDetails.photo }} style={styles.donationPhoto} />
        <Text style={styles.donationName}>{donationDetails.name}</Text>
      </View>
    ) : null;

    const handleAccept = async () => {
      Alert.alert(
          "Accept Request",
          "Do you want to accept this request?",
          [
              {
                  text: "Cancel",
                  style: "cancel"
              },
              {
                  text: "Accept",
                  onPress: async () => {
                      const donationRequestRef = doc(db, 'donationRequests', request.id);
                      await updateDoc(donationRequestRef, { status: 'accepted' });
                      setResponse('accepted');
                      setIsResponded(true);

                      await declineOtherRequests(request.id, request.donationId);
                  }
              }
          ]
      );
  };
  
  const declineOtherRequests = async (acceptedRequestId, donationId) => {
    const q = query(collection(db, "donationRequests"), where("donationId", "==", donationId), where("id", "!=", acceptedRequestId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnapshot) => {
            batch.update(docSnapshot.ref, { status: 'declined' });
        });
        await batch.commit();
    }

    setDonationRequests(prevRequests =>
        prevRequests.map(request => {
            if (request.donationId === donationId && request.id !== acceptedRequestId) {
                return { ...request, status: 'declined' };
            }
            return request;
        })
    );
};
    
    const handleDecline = async () => {
      Alert.alert(
        "Decline Request",
        "Do you want to decline this request?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Decline",
            onPress: async () => {
              const donationRequestRef = doc(db, 'donationRequests', request.id);
              await updateDoc(donationRequestRef, { status: 'declined' });
              setResponse('declined');
              setIsResponded(true);
    
              console.log("Request declined");
            }
          }
        ]
      );
    };

    return (
      <TouchableOpacity style={styles.requestItemContainer} onPress={() => handleViewRequest(request)}>
          <View style={styles.requesterDetailSection}>
              <Text style={styles.requestingLabel}>Requester</Text>
              {photoComponent}
              <View style={styles.requesterInfo}>
                  <Text style={styles.requesterName} numberOfLines={1} ellipsizeMode="tail">
                      {requesterDetail.fullName}
                  </Text>
                  <Text style={styles.requesterLocation} numberOfLines={1} ellipsizeMode="tail">
                      <Icon name="map-marker" size={14} color="#666" /> {request.requesterAddress}
                  </Text>
                  <Text style={styles.requesterMessage} numberOfLines={1} ellipsizeMode="tail">
                      {request.message}
                  </Text>
              </View>
          </View>
          {donationSection && (
              <View style={styles.donationDetailSection}>
                  <Text style={styles.requestingLabel}>Requesting</Text>
                  <Image source={{ uri: donationDetails.photo }} style={styles.donationPhoto} />
                  <View style={styles.productItemDetails}>
                      <Text style={styles.productItemName} numberOfLines={1} ellipsizeMode="tail">{donationDetails.name}</Text>
                      <View style={styles.productItemMetaContainer}>
                          <Text style={styles.productItemLocation} numberOfLines={1} ellipsizeMode="tail">
                              <Icon name="map-marker" size={14} color="#666" /> {donationDetails.location}
                          </Text>
                      </View>
                      <Text style={styles.productItemDescription} numberOfLines={1} ellipsizeMode="tail">
                          {donationDetails.message}
                      </Text>
                  </View>
              </View>
          )}
          {!isResponded && request.status === 'pending' && (
              <View style={styles.actionButtonsContainer}>
                  <Animated.View style={[styles.buttonContainer, { transform: [{ scale }] }]}>
                      <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                          <Text style={styles.buttonText}>Accept</Text>
                      </TouchableOpacity>
                  </Animated.View>
  
                  <Animated.View style={[styles.buttonContainer, { transform: [{ scale }] }]}>
                      <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                          <Text style={styles.buttonText}>Decline</Text>
                      </TouchableOpacity>
                  </Animated.View>
              </View>
          )}
          {isResponded && (
              <Text style={getResponseStyle().responseText}>
                  {response === 'accepted' || response === 'successful' ? 'Accepted (Received)' : 'Declined'}
              </Text>
          )}
      </TouchableOpacity >
  );
  
};

const SuccessfulItem = ({ request, donationDetails }) => {
  const [response, setResponse] = useState('');

  useEffect(() => {
      if (request.status === 'successful') {
          setResponse('successful');
      }
  }, [request.status]);

  const getResponseStyle = () => ({
    responseText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#4CAF50',
      textAlign: 'center',
      marginTop: 10,
    },
  });

  const renderInitialsImage = (fullName) => {
    const match = fullName.match(/\b(\w)/g) || [];
    const initials = ((match.shift() || '') + (match.pop() || '')).toUpperCase();
    return <Text style={styles.initials}>{initials}</Text>;
  };

  const requesterDetail = userDetails[request.requesterEmail] || {};
  const photoComponent = requesterDetail.photoUrl 
    ? <Image source={{ uri: requesterDetail.photoUrl }} style={styles.requesterPhoto} />
    : renderInitialsImage(requesterDetail.fullName || "");

  const donationSection = donationDetails ? (
    <View style={styles.donationDetailSection}>
      <Text style={styles.requestingLabel}>Requesting:</Text>
      <Text style={styles.requestingLabel}>Requesting</Text>
                  <Image source={{ uri: donationDetails.photo }} style={styles.donationPhoto} />
                  <View style={styles.productItemDetails}>
                      <Text style={styles.productItemName} numberOfLines={1} ellipsizeMode="tail">{donationDetails.name}</Text>
                      <View style={styles.productItemMetaContainer}>
                          <Text style={styles.productItemLocation} numberOfLines={1} ellipsizeMode="tail">
                              <Icon name="map-marker" size={14} color="#666" /> {donationDetails.location}
                          </Text>
                      </View>
                      <Text style={styles.productItemDescription} numberOfLines={1} ellipsizeMode="tail">
                          {donationDetails.message}
                      </Text>
                  </View>
                </View>
            ) : null;
    return (
      <View style={styles.requestItemContainer}>
          <View style={styles.requesterDetailSection}>
              <Text style={styles.requestingLabel}>Requester</Text>
              {photoComponent}
              <View style={styles.requesterInfo}>
                  <Text style={styles.requesterName} numberOfLines={1} ellipsizeMode="tail">
                      {requesterDetail.fullName}
                  </Text>
                  <Text style={styles.requesterLocation} numberOfLines={1} ellipsizeMode="tail">
                      <Icon name="map-marker" size={14} color="#666" /> {request.requesterAddress}
                  </Text>
                  <Text style={styles.requesterMessage} numberOfLines={1} ellipsizeMode="tail">
                      {request.message}
                  </Text>
              </View>
          </View>
          {donationSection}
          <Text style={getResponseStyle().responseText}>
              {response === 'successful' ? 'Successful' : ''}
          </Text>
      </View>
    );
  };

  const AcquiredItem = ({ request, donationDetails }) => {
    const [response, setResponse] = useState('');

    useEffect(() => {
        if (request.status === 'successful') {
            setResponse('successful');
        }
    }, [request.status]);

    const getResponseStyle = () => ({
        responseText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#4CAF50',
            textAlign: 'center',
            marginTop: 10,
        },
    });

    const renderInitialsImage = (fullName) => {
        const match = fullName.match(/\b(\w)/g) || [];
        const initials = ((match.shift() || '') + (match.pop() || '')).toUpperCase();
        return <Text style={styles.initials}>{initials}</Text>;
    };

    const auth = getAuth();
    const currentUser = auth.currentUser;
    const currentUserEmail = currentUser.email;

    const requesterDetail = userDetails[currentUserEmail] || {};
    const photoComponent = requesterDetail.photoUrl 
        ? <Image source={{ uri: requesterDetail.photoUrl }} style={styles.requesterPhoto} />
        : renderInitialsImage(requesterDetail.fullName || "");

    const donationSection = donationDetails ? (
        <View style={styles.donationDetailSection}>
            <Text style={styles.requestingLabel}>Requesting:</Text>
            <Image source={{ uri: donationDetails.photo }} style={styles.donationPhoto} />
            <View style={styles.productItemDetails}>
                <Text style={styles.productItemName} numberOfLines={1} ellipsizeMode="tail">{donationDetails.name}</Text>
                <View style={styles.productItemMetaContainer}>
                    <Text style={styles.productItemLocation} numberOfLines={1} ellipsizeMode="tail">
                        <Icon name="map-marker" size={14} color="#666" /> {donationDetails.location}
                    </Text>
                </View>
                <Text style={styles.productItemDescription} numberOfLines={1} ellipsizeMode="tail">
                    {donationDetails.message}
                </Text>
            </View>
        </View>
    ) : null;

    return (
        <View style={styles.requestItemContainer}>
            <View style={styles.requesterDetailSection}>
                <Text style={styles.requestingLabel}>Requester</Text>
                {photoComponent}
                <View style={styles.requesterInfo}>
                    <Text style={styles.requesterName} numberOfLines={1} ellipsizeMode="tail">
                        {requesterDetail.fullName || 'Current User'}
                    </Text>
                </View>
            </View>
            {donationSection}
            <Text style={getResponseStyle().responseText}>
                {response === 'successful' ? 'Successful' : ''}
            </Text>
        </View>
    );
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

  const handleViewDonation = (donation) => {
    setSelectedDonationForView(donation);
    setViewModalVisible(true);
  };

const handleViewRequest = (request) => {
  const donation = donations.find(donation => donation.id === request.donationId);
  setSelectedRequestForView({ ...request, donation });
  setViewRequestsModalVisible(true);
};

  const ViewDonationModal = ({ isVisible, donation, onClose }) => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}> </Text>
            <Image source={{ uri: donation?.photo }} style={{ width: 100, height: 100, marginBottom: 20, borderRadius: 15 }} />
            <Text style={styles.label}>Donation Name</Text>
            <Text style={styles.readOnlyInput}>{donation?.name}</Text>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.readOnlyInput}>{donation?.location}</Text>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.readOnlyInput}>{donation?.message}</Text>
            <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                  setEditableDonation(donation);
                  setViewModalVisible(false);
                  setEditModalVisible(true);
                }}
              >
                <Icon name="edit" size={30} color="#05652D" />
              </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };
  
  const ViewRequestsModal = ({ isVisible, donation, requester, onClose }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <ScrollView style={styles.editModalContainer}>
                <Text style={styles.editModalTitle}>Requester:</Text>
                    <Text style={styles.label}>Name</Text>
                    <Text style={styles.readOnlyInput}>{requester?.fullName}</Text>
                    <Text style={styles.label}>Location</Text>
                    <Text style={styles.readOnlyInput}>{requester?.requesterAddress}</Text>
                    <Text style={styles.label}>Message</Text>
                    <Text style={styles.readOnlyInput}>{requester?.message}</Text>
                    <Text style={styles.editModalTitle}>Requesting:</Text>
                    <Image source={{ uri: donation?.photo }} style={styles.modalImage} />
                    <Text style={styles.label}>Donation Name</Text>
                    <Text style={styles.readOnlyInput}>{donation?.name}</Text>
                    <Text style={styles.label}>Donation Location</Text>
                    <Text style={styles.readOnlyInput}>{donation?.location}</Text>
                    <Text style={styles.label}>Donation Message</Text>
                    <Text style={styles.readOnlyInput}>{donation?.message}</Text>
                </ScrollView>
            </View>
        </Modal>
    );
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
            <Text style={styles.label}>Donation Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter donation name"
              value={tempDonation.name}
              onChangeText={(text) => setTempDonation({ ...tempDonation, name: text })}
            />
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location"
              value={tempDonation.location}
              onChangeText={(text) => setTempDonation({ ...tempDonation, location: text })}
            />
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter message"
              value={tempDonation.message}
              onChangeText={(text) => setTempDonation({ ...tempDonation, message: text })}
              multiline
            />
            <TouchableOpacity style={styles.savebutton} onPress={handleSave}>
              <Text style={styles.savebuttonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelbutton} onPress={onCancel}>
              <Text style={styles.cancelbuttonText}>Cancel</Text>
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
          <TouchableOpacity onPress={() => navigation.navigate('DonateAddDonation')}>
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
      {['Posts', 'Requests', 'Successful', 'Acquired'].map((tab, index) => (
        <View key={index} style={{ width: windowWidth }}>
          {tab === 'Posts' && (
            <View>
              <View style={styles.subTabsContainer}>
                <TouchableOpacity
                  style={[styles.subTab, selectedPostsTab === 'Approved' ? styles.activeSubTab : {}]}
                  onPress={() => setSelectedPostsTab('Approved')}
                >
                  <Text style={[styles.subTabText, selectedPostsTab === 'Approved' ? styles.activeTabText : {}]}>
                    Approved
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, selectedPostsTab === 'Pending' ? styles.activeSubTab : {}]}
                  onPress={() => setSelectedPostsTab('Pending')}
                >
                  <Text style={[styles.subTabText, selectedPostsTab === 'Pending' ? styles.activeTabText : {}]}>
                    Pending
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={getFilteredDonations('Posts')}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <DonationItem 
                    item={item} 
                    requestCount={selectedPostsTab === 'Approved' ? requestCounts[item.id] || 0 : 0}
                  />
                )}
                ListEmptyComponent={renderEmptyDonations}
              />
            </View>
          )}
            {tab === 'Requests' && (
              <FlatList
              data={donationRequests}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: request }) => {
                const donationDetails = donations.find(donation => donation.id === request.donationId);
                return <RequestItem request={request} donationDetails={donationDetails} />;
              }}
              ListEmptyComponent={renderEmptyDonations}
            />
            )}
            {tab === 'Successful' && (
                <FlatList
                    data={donationRequests.filter(request => request.status === 'successful')}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item: request }) => {
                        const donationDetails = donations.find(donation => donation.id === request.donationId);
                        return <SuccessfulItem request={request} donationDetails={donationDetails} />;
                    }}
                    ListEmptyComponent={renderEmptyDonations}
                />
            )}
            {tab === 'Acquired' && (
              <FlatList
              data={donationRequests.filter(request => request.status === 'successful')}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: request }) => {
                  const donationDetails = donations.find(donation => donation.id === request.donationId);
                  return <AcquiredItem request={request} donationDetails={donationDetails} />;
              }}
              ListEmptyComponent={renderEmptyDonations}
          />
            )}
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
      <ViewDonationModal
        isVisible={viewModalVisible}
        donation={selectedDonationForView}
        onClose={() => setViewModalVisible(false)}
      />
      {selectedRequestForView && (
        <ViewRequestsModal
          isVisible={viewRequestsModalVisible}
          donation={selectedRequestForView.donation}
          requester={selectedRequestForView}
          onClose={() => setViewRequestsModalVisible(false)}
        />
      )}
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
    textAlign: 'left',
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
    backgroundColor: '#FFFFF0',
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
  subTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
    borderColor: '#D3D3D3',
  },
  
  subTab: {
    padding: 10,
  },
  
  activeSubTab: {
    borderBottomWidth: 2,
    color: '#05652D',
    fontWeight: 'bold',
    borderColor: '#05652D',
  },
  activeTabText: {
    color: '#05652D',
    fontWeight: 'bold',
  }, 
  subTabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: -2, 
    height: 2,
    backgroundColor: '#05652D',
  },
  label: {
    fontSize: 14,
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
  savebutton: {
    backgroundColor: '#05652D',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  savebuttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelbutton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelbuttonText: {
    color: '#333',
    fontSize: 16,
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    color: '#333',
    marginBottom: 20,
    backgroundColor: '#f7f7f7',
  },

  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10
  },

  requestCounter: {
    position: 'absolute',
    left: 5, 
    top: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#05652D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, 
  },
  requestCountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  initials: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#cccccc',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 60,
    fontSize: 24,
    fontWeight: 'bold',
  },
  requestedDonationContainer: {
    backgroundColor: '#eef', 
    padding: 10,
    marginVertical: 8,
  },
  donationPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  donationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestItemContainer: {
    backgroundColor: '#fff',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    marginVertical: 8,
    padding: 16,
  },
  requesterDetailSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    paddingBottom: 16,
    marginBottom: 16,
  },
  requesterPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#dedede',
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#05652D',
    flexShrink: 1,
  },
  requesterInfo: {
    flex: 1,
  },
  requesterLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 10,
    flexShrink: 1,
  },
  requesterMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginLeft: 10,
    flexShrink: 1,
  },
  donationDetailSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
 requestingLabel: {
    position: 'absolute', 
    top: -27, 
    left: 0, 
    fontSize: 14,
    fontWeight: 'bold',
    color: '#808080',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
  },
  donationPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  donationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',  
    padding: 10,
  },
  buttonContainer: {
    margin: 5,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  declineButton: {
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
 modalImage: {
        width: 100,
        height: 100,
        marginBottom: 20,
        borderRadius: 15,
    },
    closeButton: {
        alignSelf: 'flex-end',
        marginTop: 10,
        marginRight: 10,
    },
  viewRequestButtonText: {
    fontSize: 14,
    color: '#05652D',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 10,
  },
});

export default DonationManagement;