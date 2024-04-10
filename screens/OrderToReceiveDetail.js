import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getDocs, query, collection, where, updateDoc, doc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../config/firebase';
import moment from 'moment';
import { LinearGradient } from 'expo-linear-gradient'; 
import CameraIcon from 'react-native-vector-icons/MaterialIcons';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const OrderToReceiveDetails = ({ route, navigation }) => {
  const { order, products } = route.params;
  const [sellerName, setSellerName] = useState('Unknown Seller');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  useEffect(() => {
    const fetchSellerName = async () => {
      if (order.sellerEmail) {
        const sellersQuery = query(collection(db, 'registeredSeller'), where('email', '==', order.sellerEmail));
        const querySnapshot = await getDocs(sellersQuery);
        querySnapshot.forEach((doc) => {
          if (doc.exists()) {
            setSellerName(doc.data().sellerName);
          }
        });
      }
    };
    fetchSellerName();
  }, [order.sellerEmail]);

  const contactSeller = () => {
    // 
  };

  const cancelOrder = () => {
    // 
  };

  // 
  const subtotal = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity * products[detail.productId].price,
    0
  );

  const totalItems = order.productDetails.reduce(
    (sum, detail) => sum + detail.orderedQuantity,
    0
  );

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

  const confirmReceipt = async () => {
    if (!selectedImage) {
      Alert.alert('Photo Required', 'Please provide a photo of the item received.');
      return;
    }
  
    const imageUrl = await uploadImageAsync(selectedImage.uri);
  
    const orderDocRef = doc(db, 'orders', order.id);
    await updateDoc(orderDocRef, {
      receivedPhoto: imageUrl,
      status: 'Completed'
    });
  
    Alert.alert(
      'Confirmation Success',
      'Receipt has been confirmed successfully.',
      [
        {
          text: 'OK',
          onPress: () => {
            setModalVisible(false);
            navigation.navigate('OrderHistory');
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
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
            <Text style={styles.modalText}>To confirm item received, please attach a photo.</Text>
            <TouchableOpacity onPress={confirmReceipt} style={styles.confirmButton}>
                <Text style={styles.buttonText}>Confirm Receipt</Text>
            </TouchableOpacity>
        </View>
    </Modal>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
      </View>
      <ScrollView style={styles.container}>
      <View style={styles.orderItemContainer}>
      <LinearGradient
          colors={['#333', '#05652D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.deliveryInfoContainer}>
          <Text style={styles.deliveryInfoText}>
            Your order is on the way{'\n\n'}
            Delivery should be made 
            between {order.deliveryStart?.toDate() ? moment(order.deliveryStart.toDate()).format('DD MMM YYYY') : 'N/A'} and {order.deliveryEnd?.toDate() ? moment(order.deliveryEnd.toDate()).format('DD MMM YYYY') : 'N/A'}
          </Text>
          <MaterialIcons name="local-shipping" size={40} color="#FFF" style={styles.deliveryIcon} />
        </LinearGradient>
        <View style={styles.deliveryAddress}>
            <Text style={styles.orderTotalLabel}>Delivery Address</Text>
            <View style={styles.orderTotalRow}>
                <MaterialIcons name="location-on" size={20} color="#333" />
                <Text style={styles.orderTotalValue}>{order.deliveryAddress}</Text>
            </View>
        </View>
        <View style={styles.sellerHeader}>
          <Icon5 name="store" size={20} color="#808080" />
          <Text style={styles.sellerName}>{sellerName}</Text>
          <TouchableOpacity
            style={styles.visitButton}
            onPress={() => navigation.navigate('UserVisit', { email: order.sellerEmail })}
          >
            <Text style={styles.visitButtonText}>Visit</Text>
          </TouchableOpacity>
        </View>
        {order.productDetails.map((item, index) => {
          const product = products[item.productId];
          return (
            <View key={index} style={styles.productContainer}>
              <Image source={{ uri: product.photo }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text> 
                <Text style={styles.productCategory}>{product.category}</Text>   
                <Text style={styles.productQuantity}>x{item.orderedQuantity}</Text>
                <Text style={styles.productPrice}>₱{product.price}</Text>
              </View>
            </View>
          );
        })}
            <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                <Text style={styles.paymentMethodValue}>{order.paymentMethod}</Text>
            </View>
            <View style={styles.orderTotalSection}>
                <Text style={styles.orderTotalLabel}>ORDER TOTAL</Text>
                <View style={styles.orderTotalDetails}>
                <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalText}>
                    Merchandise Subtotal: <Text style={styles.itemsText}>({totalItems} items)</Text>
                </Text>
                    <Text style={styles.orderTotalValue}>₱{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalText}>Shipping Fee:</Text>
                    <Text style={styles.orderTotalValue}>₱{order.shippingFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalTextFinal}>Total:</Text>
                    <Text style={styles.orderTotalValueFinal}>₱{order.orderTotalPrice.toFixed(2)}</Text>
                </View>
                </View>
            </View>
            <View style={styles.orderInfo}>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{order.id.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Time:</Text>
                <Text style={styles.detailValue}>
                {moment(order.dateOrdered.toDate()).format('DD-MM-YYYY HH:mm')}
                </Text>
            </View>
            </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.contactButton} onPress={contactSeller}>
            <Text style={styles.buttonText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmationButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.confirmationButtonText}>Confirm Receipt</Text>
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
    orderItemContainer: {
      backgroundColor: '#FFFFF0',
      padding: 10,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    productContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 30,
      paddingBottom: 5,
      paddingHorizontal: 5,
      borderBottomWidth: 1,  
      borderBottomColor: '#ccc',
      backgroundColor: '#FAF9F6',  
    },
    productImage: {
      width: 80,
      height: 80,
      borderRadius: 10,
      marginRight: 10,
    },
    productInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    productName: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    productPrice: {
      color: '#05652D',
      fontSize: 14,
      marginTop: 5,
      textAlign: 'right',
      fontWeight: 'bold',
    },
    productQuantity: {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 5,
      textAlign: 'right',
    },
    totalPriceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 1,  
      borderBottomColor: '#ccc',
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
    emptyOrdersContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
    },
    emptyOrdersText: {
      fontSize: 20,
      color: '#ccc',
    },
    sellerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#E8F5E9',
      padding: 8,
      marginTop: 10,
    },
    sellerName: {
      fontWeight: 'bold',
      color: '#333',
      fontSize: 16,
      flex: 1,
      textAlign: 'left', 
      marginLeft: 10,
    },
    productCategory: {
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
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
    },
    loadingIndicator: {
      marginTop: 50,
  },
  emptyOrdersContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
  },
  emptyOrdersText: {
      fontSize: 16,
      color: '#ccc',
      textAlign: 'center',
  },
  visitButton: {
    position: 'absolute',
    right: 8,
    top: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#05652D',
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
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
  actionButtons: {
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
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  totalPriceContainer: {
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 20,
    borderBottomWidth: 1,
  },
  orderTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTotalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
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
  itemsText: {
    fontSize: 14,
    color: '#333',
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
  footer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: -2 },
  },
  confirmationButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
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
    backgroundColor: "#2196F3",
    borderRadius: 10,
    padding: 10,
    paddingVertical: 20,
    elevation: 2,
    marginBottom: 10
  },
  cameraButtonText: {
    color: "#fff",
    marginLeft: 10
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
  previewImage: {
    width: 300,
    height: 300,
    marginBottom: 10
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
deliveryInfoContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 15,
},
deliveryInfoText: {
  color: '#fff',
  fontWeight: 'bold',
},
deliveryIcon: {
  backgroundColor: '#000000',
  borderRadius: 30,
  top: -32,
},
deliveryAddress: {
  marginTop: 20,
  paddingHorizontal: 10,
  paddingVertical: 10,
  borderTopWidth: 1, 
  borderBottomWidth: 1,  
  borderColor: '#ccc',
},
});

export default OrderToReceiveDetails;
