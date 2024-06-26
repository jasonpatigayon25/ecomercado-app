import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Modal, Alert, TextInput, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getDocs, query, collection, where, updateDoc, doc, addDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../config/firebase';
import moment from 'moment';
import CameraIcon from 'react-native-vector-icons/MaterialIcons';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';


const RequestDeclinedDetails = ({ route, navigation }) => {
  const { request, donations, users } = route.params;
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);

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

  const confirmReceipt = async () => {

    if (!selectedImage) {
      Alert.alert('Photo Required', 'Please provide a photo of the donation received.');
      return;
    }

    const imageUrl = await uploadImageAsync(selectedImage.uri);

    const requestDocRef = doc(db, 'requests', request.id);
    await updateDoc(requestDocRef, {
      receivedPhoto: imageUrl,
      status: 'Completed',
      dateReceived: new Date()
    });
    
    setModalVisible(false);
    
    Alert.alert(
      "Confirmation",
      "Receipt has been confirmed successfully.",
      [
        {
          text: "OK",
          onPress: () => navigation.navigate('RequestHistory')
        }
      ]
    );

  };

  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log(e);
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  
    const storage = getStorage();
    const storageRef = ref(storage, `uploads/${Date.now()}`);
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
    setSelectedImage({ uri: uploadUrl });
  }
};

  const handleChoosePhoto = () => {
    Alert.alert("Upload Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: () => pickImage('camera'),
      },
      {
        text: "Choose from Gallery",
        onPress: () => pickImage('library'),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const GroupHeader = ({ donorEmail }) => {
    if (!users || !users[donorEmail]) {
      return <View style={styles.groupHeader}><Text>Loading donor details...</Text></View>;
    }
    const user = users[donorEmail];
    const fullName = user ? `${user.firstName} ${user.lastName}` : donorEmail;
    return (
      <View style={styles.groupHeader}>
        <Icon name="heart" size={16} color="#FF0000" style={styles.heartIcon} />
        <Text style={styles.fullName}>From: {fullName}</Text>
        <TouchableOpacity
            style={styles.visitButton}
            onPress={() => navigation.navigate('UserVisit', { email: donorEmail })}
          >
            <Text style={styles.visitButtonText}>Visit</Text>
          </TouchableOpacity>
      </View>
    );
  };

  const contactSeller = () => {
    // 
  };

  const [donorFullName, setDonorFullName] = useState('');

  useEffect(() => {
    const fetchDonorName = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", request.donorEmail));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const fullName = `${data.firstName} ${data.lastName}`;
          setDonorFullName(fullName);
        });
      } catch (error) {
        console.error("Error fetching requester name: ", error);
      }
    };

    fetchDonorName();
  }, [request.donorEmail]);

  return (
    <SafeAreaView style={styles.safeArea}>
    
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Cancelled Request Details</Text>
        </View>
        <ScrollView style={styles.container}>
        <View key={request.id} style={styles.requestCard}>
        <View style={styles.groupHeader}>
                        <Text style={styles.donationName}>Requester: {donorFullName}</Text>
                        <TouchableOpacity
                            style={styles.visitButton}
                            onPress={() => navigation.navigate('UserVisit', { email: request.donorEmail })}
                        >
                            <Text style={styles.visitButtonText}>Visit</Text>
                        </TouchableOpacity>
                        </View>
            {/* <Text style={styles.requestTitle}>#{request.id}</Text> */}
                      {request.donorDetails.map((detail, idx) => {
                        const donation = donations[detail.donationId];
                        if (!donation) return null;

                        const isTaken = donation.publicationStatus === 'taken';

                        return (
                            <View key={idx} style={styles.donationItem}>
                              <TouchableOpacity 
                            onPress={() => navigation.navigate('ViewerImage', { imageUrl: donation.photo })}
                              >
                                <Image source={{ uri: donation.photo }} style={[styles.donationImage, isTaken && styles.greyedImage]} />
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
                                        style={[styles.subPhoto, donation.publicationStatus === 'taken' && isTaken && styles.greyedImage]}
                                      />
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                  </View>
                                    {isTaken && (
                                        <View style={styles.coveredTextContainer}>
                                            <Text style={styles.coveredText}>TAKEN</Text>
                                        </View>
                                    )}
                                    {!isTaken && (
                                        <TouchableOpacity
                                            style={styles.viewDetailsButton}
                                            onPress={() => navigation.navigate('DonationDetail', { donation })}
                                        >
                                            <Text style={styles.viewDetailsButtonText}>Request Again</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
            {/* <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>Total Fee:</Text>
                <Text style={styles.feeValue}>₱{(request.disposalFee + request.deliveryFee).toFixed(2)}</Text>
            </View> */}
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                <Text style={styles.paymentMethodValue}>{request.paymentMethod}</Text>
            </View>
            <View style={styles.orderTotalSection}>
                <Text style={styles.orderTotalLabel}>FEES</Text>
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
        </View>
    </ScrollView>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
              setModalVisible(!modalVisible);
          }}
      >
          <View style={styles.modalView}>
              {selectedImage ? (
                  <>
                      <Text style={styles.imageAttachedText}>Image Attached</Text>
                      <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                      <TouchableOpacity onPress={handleChoosePhoto} style={styles.cameraButton}>
                          <CameraIcon name="camera-alt" size={60} color="#fff" />
                          <Text style={styles.cameraButtonText}>Change Photo</Text>
                      </TouchableOpacity>
                  </>
              ) : (
                  <TouchableOpacity onPress={handleChoosePhoto} style={styles.cameraButton}>
                      <CameraIcon name="camera-alt" size={60} color="#fff" />
                      <Text style={styles.cameraButtonText}>Take Photo</Text>
                  </TouchableOpacity>
              )}
              <Text style={styles.modalText}>Confirm receipt by uploading a photo of the donations.</Text>
              <TouchableOpacity onPress={confirmReceipt} style={styles.confirmButton}>
                  <Text style={styles.buttonText}>Confirm Receipt</Text>
              </TouchableOpacity>
          </View>
      </Modal>
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
confirmationButton: {
  backgroundColor: '#4CAF50',
  padding: 15,
  justifyContent: 'center',
  alignItems: 'center',
  width: '90%',
  borderRadius: 10,
  flexDirection: 'row',
  borderRadius: 10,
},
confirmationButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
modalView: {
  position: 'absolute',
  bottom: 0,
  width: '100%',
  backgroundColor: "white",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 15,
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
cameraButton: {
  flex: 1,
  justifyContent: 'center',  
  alignItems: 'center',     
  backgroundColor: "#2196F3",
  borderRadius: 10,
  padding: 20,
  elevation: 2,
  marginHorizontal: 30,
  marginBottom: 10
},
cameraButtonText: {
  color: "#fff",
  marginLeft: 10,
  textAlign: 'center',
},
previewImage: {
  width: 300,
  height: 300,
  marginBottom: 10
},
confirmButton: {
  backgroundColor: "#4CAF50",
  borderRadius: 10,
  padding: 20,
  elevation: 2
},
buttonText: {
  color: "#fff",
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: 16,
},
imagePreviewContainer: {
  alignItems: 'center',
  marginBottom: 10,
},
imageAttachedText: {
textAlign: 'center',
fontWeight: 'bold',
fontSize: 16,
marginBottom: 10,
},
confirmationModalCenteredView: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
},
confirmationModalView: {
  margin: 20,
  backgroundColor: "white",
  padding: 35,
  alignItems: "flex-start", 
  width: '80%',
},
confirmationModalText: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 20, 
},
confirmationModalButtonContainer: {
  alignSelf: 'flex-end', 
  marginTop: 10,
},
confirmationModalButton: {
  flexDirection: 'row',
  backgroundColor: "#fff",
  borderRadius: 10,
  paddingHorizontal: 20,
  paddingVertical: 10,
  elevation: 2,
  alignItems: 'center',
  borderColor: '#05652D', 
  borderWidth: 2,
},
confirmationModalButtonText: {
  color: "#05652D",
  fontWeight: "bold",
  textAlign: "center",
  marginLeft: 10,
},
confirmationModalIconStyle: {
  marginTop: 2,
},
greyedImage: {
  opacity: 0.5,
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
viewDetailsButton: {
  position: 'absolute',  
  top: -5,            
  right: 4,         
  backgroundColor: '#05652D', 
  paddingVertical: 5,   
  paddingHorizontal: 10, 
  borderRadius: 5,   
  zIndex: 1, 
},
viewDetailsButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
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


export default RequestDeclinedDetails;