import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Dimensions, Modal, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import CameraIcon from 'react-native-vector-icons/MaterialIcons';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, getDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import OrderTab from '../navbars/OrderTab';

const windowWidth = Dimensions.get('window').width;

const OrderHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const [selectedTab, setSelectedTab] = useState('To Pay');
  const scrollRef = useRef(); 
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

  const tabStatusMapping = {
    'To Pay': 'Pending',
    'To Ship': 'Approved',
    'To Receive': 'Receiving',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled'
};

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const tabIndex = Math.floor(scrollX / windowWidth);
    const tabNames = Object.keys(tabStatusMapping);
    const newSelectedTab = tabNames[tabIndex];

    if (newSelectedTab !== selectedTab) {
        setSelectedTab(newSelectedTab);
        setLoading(true);
        fetchOrders(newSelectedTab);
    }
};

const fetchOrders = useCallback(async (tab) => {
  if (!user) return;

  setLoading(true);
  try {
      const status = tabStatusMapping[tab];
      const ordersQuery = query(
          collection(db, 'orders'),
          where('buyerEmail', '==', user.email),
          where('status', '==', status),
          orderBy('dateOrdered', 'desc')
      );

      const querySnapshot = await getDocs(ordersQuery);
      const fetchedOrders = [];
      querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() });
      });

      setOrders(fetchedOrders);
      await fetchProductDetails(fetchedOrders);
  } catch (error) {
      console.error("Error fetching orders:", error);
  } finally {
      setLoading(false);
  }
}, [user]);

const fetchProductDetails = async (orders) => {
  const productIds = new Set();
  orders.forEach(order => {
    order.productDetails.forEach(item => {
      productIds.add(item.productId);
    });
  });
  
  const fetchedProducts = {};
  const sellerEmailsToFetch = new Set();

  for (let productId of productIds) {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const productData = productSnap.data();
      fetchedProducts[productId] = productData;
      sellerEmailsToFetch.add(productData.seller_email); 
    }
  }

  const fetchSellerNames = async (sellerEmails) => {
    try {
      const sellersQuery = query(
        collection(db, 'registeredSeller'),
        where('email', 'in', Array.from(sellerEmails))
      );
      const querySnapshot = await getDocs(sellersQuery);
      const sellers = {};
      querySnapshot.forEach((doc) => {
        const sellerData = doc.data();
        sellers[sellerData.email] = sellerData.sellerName;
      });
      return sellers;
    } catch (error) {
      console.error("Error fetching seller names:", error);

      return {};
    }
  };

  if (sellerEmailsToFetch.size > 0) {
    const sellerNames = await fetchSellerNames(sellerEmailsToFetch);
    Object.values(fetchedProducts).forEach(product => {
      product.sellerName = sellerNames[product.seller_email] || 'Unknown Seller';
    });
  }

  setProducts(fetchedProducts);
  setLoading(false);
};

useEffect(() => {
  fetchOrders(selectedTab);
}, [selectedTab, fetchOrders]);

useEffect(() => {
  const status = tabStatusMapping[selectedTab];
  const ordersQuery = query(
      collection(db, 'orders'),
      where('buyerEmail', '==', user.email),
      where('status', '==', status),
      orderBy('dateOrdered', 'desc')
  );

  const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
      const updatedOrders = [];
      querySnapshot.forEach((doc) => {
          updatedOrders.push({ id: doc.id, ...doc.data() });
      });

      setOrders(updatedOrders);
      fetchProductDetails(updatedOrders);
  }, (error) => {
      console.error("Error fetching orders:", error);
  });

  return () => unsubscribe();
}, [selectedTab, user.email, fetchProductDetails]);


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

const confirmReceipt = async () => {
  if (!selectedImage) {
    Alert.alert('Photo Required', 'Please provide a photo of the item received.');
    return;
  }

  const imageUrl = await uploadImageAsync(selectedImage.uri);

  if (activeOrder) {
    const orderDocRef = doc(db, 'orders', activeOrder.id); 
    await updateDoc(orderDocRef, {
      receivedPhoto: imageUrl,
      status: 'Completed'
    });

    Alert.alert(
      'Confirmation Success',
      'Receipt has been confirmed successfully.',
      [{ text: 'OK', onPress: () => {
          setModalVisible(false);
          navigation.navigate('OrderHistory');
        }
      }]
    );
  } else {
    Alert.alert('Error', 'No active order selected.');
  }
};


  const renderOrderItem = ({ item: order }) => {

    const handlePress = () => {
      if (selectedTab === 'To Pay') {
        navigation.navigate('OrderToPayDetails', { order, products });
      } else if (selectedTab === 'To Ship') {
        navigation.navigate('OrderToShipDetails', { order, products });
      } else if (selectedTab === 'To Receive') {
        navigation.navigate('OrderToReceiveDetails', { order, products });
      } else if (selectedTab === 'Completed') {
        navigation.navigate('OrderCompletedDetails', { order, products });
      } else if (selectedTab === 'Cancelled') {
        navigation.navigate('OrderCancelledDetails', { order, products });
      }
    };

    if ((selectedTab === 'To Pay' && order.status !== 'Pending') ||
    (selectedTab === 'To Receive' && order.status !== 'Receiving') ||
    (selectedTab === 'Completed' && order.status !== 'Completed') ||
    (selectedTab === 'Cancelled' && order.status !== 'Cancelled')) {
    return null;
}
    const groupedBySeller = order.productDetails.reduce((acc, productDetail) => {
      const product = products[productDetail.productId];
        const sellerName = product ? product.sellerName : 'Unknown Seller'; 
        if (!acc[sellerName]) {
            acc[sellerName] = [];
        }
        if (product) {
            acc[sellerName].push({
                ...productDetail,
                ...product
            });
        }
        return acc;
    }, {});
  
    return (
      <TouchableOpacity onPress={handlePress} style={styles.orderItemContainer}>
        {Object.entries(groupedBySeller).map(([sellerName, productDetails]) => (
          <View key={sellerName}>
            <View style={styles.sellerHeader}>
            <Icon5 name="store" size={20} color="#808080" style={styles.shopIcon} />
            <Text style={styles.sellerName}>{sellerName}</Text>
            </View>
            {productDetails.map((item, index) => {
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
          </View>
        ))}
      <View style={styles.totalPriceContainer}>
        <Text style={styles.orderTotalLabel}>Amount to Pay:</Text>
        <Text style={styles.orderTotalPrice}>₱{order.orderTotalPrice.toFixed(2)}</Text>
      </View>
      {selectedTab === 'To Pay' && (
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.pendingButton} disabled={true}>
          <Text style={styles.pendingButtonText}>Pending</Text>
        </TouchableOpacity>
      </View>
       )}
        {selectedTab === 'To Ship' && (
          <View style={styles.confirmationContainer}>
            <Text style={styles.noteText}>Your order is being processed. Please wait for the seller to confirm shipment.</Text>
            <TouchableOpacity style={styles.shipButton} onPress={() => confirmReceipt(order.id)}>
              <Text style={styles.confirmButtonText}>Contact Seller</Text>
            </TouchableOpacity>
          </View>
        )}
      {selectedTab === 'To Receive' && (
          <View style={styles.confirmationContainer}>
            <Text style={styles.noteText}>Please confirm when you've received your items.</Text>
            <TouchableOpacity style={styles.confirmButton} onPress={() => {
              setActiveOrder(order);
              setModalVisible(true);
            }}>
              <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
            </TouchableOpacity>
          </View>
        )}
        {selectedTab === 'Cancelled' && (
          <View style={styles.confirmationContainer}>
            <Text style={styles.noteText}>Please press button if you wish to cart the items again.</Text>
            <TouchableOpacity style={styles.confirmButton} onPress={() => confirmReceipt(order.id)}>
              <Text style={styles.confirmButtonText}>Cart Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyListComponent = (tab) => {
    let icon = 'inbox'; 
    let message = `No ${tab} Orders yet.`;

    switch (tab) {
        case 'To Pay':
            icon = 'money';
            break;
        case 'To Receive':
            icon = 'truck';
            break;
        case 'Completed':
            icon = 'truck';
            break;
        case 'Cancelled':
            icon = 'money';
            break;
    }

    return (
        <View style={styles.emptyOrdersContainer}>
            <Icon name={icon} size={50} color="#cccccc" />
            <Text style={styles.emptyOrdersText}>{message}</Text>
        </View>
    );
};

  return (
    <View style={styles.container}>
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
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Transactions</Text>
      </View>

      <OrderTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

      <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                ref={scrollRef}
                style={styles.scrollView}
            >
                {Object.keys(tabStatusMapping).map((tab, index) => (
                    <View key={index} style={{ width: windowWidth }}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />
                        ) : (
                            <FlatList
                                data={orders}
                                keyExtractor={(item) => item.id}
                                renderItem={renderOrderItem}
                                ListEmptyComponent={renderEmptyListComponent(selectedTab)}
                            />
                        )}
                    </View>
                ))}
            </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  title: {
    color: '#FFF',
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
  orderTotalLabel: {
    fontSize: 16,
    color: '#666', 
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
  pendingButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  pendingButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
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
confirmationContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 10,
  marginTop: 10,
},
noteText: {
  fontSize: 14,
  color: '#666',
  flex: 1,
},
confirmButton: {
  backgroundColor: '#4CAF50',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 5,
  marginLeft: 10,
},
confirmButtonText: {
  color: '#fff',
  fontSize: 16,
  textAlign: 'center',
},
shipButton: {
  backgroundColor: '#0096FF', 
  padding: 10,
  borderRadius: 5,
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
});

  export default OrderHistory;