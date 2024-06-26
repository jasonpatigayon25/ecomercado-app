import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Dimensions, Alert, Modal, Button } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import OrderSellerTab from '../navbars/OrderSellerTab';
import { useRoute } from '@react-navigation/native';
import { LogBox } from 'react-native';

 LogBox.ignoreLogs(['Warning: Unknown: Support for defaultProps will be removed from memo components in a future major release.']);

const windowWidth = Dimensions.get('window').width;

const SellerOrderManagement = ({ navigation, route  }) => {
    const [orders, setOrders] = useState([]);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [products, setProducts] = useState({});
    const [loading, setLoading] = useState(true);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [dateType, setDateType] = useState(null);
    const [isStartDatePickerVisible, setStartDatePickerVisibility] = useState(false);
    const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
    const [deliveryStart, setDeliveryStart] = useState(new Date());
    const [deliveryEnd, setDeliveryEnd] = useState(new Date());
    const auth = getAuth();
    const user = auth.currentUser;
    // const route = useRoute(); 
    const initialTab = route.params?.selectedTab || 'To Approve';
    const [selectedTab, setSelectedTab] = useState(initialTab);

    useEffect(() => {
        if (route.params?.selectedTab) {
            setSelectedTab(route.params.selectedTab);
        }
    }, [route.params?.selectedTab]);

    const scrollRef = useRef();
    const [isDeliveryDateModalVisible, setDeliveryDateModalVisible] = useState(false);

    const handleScroll = (event) => {
        const scrollX = event.nativeEvent.contentOffset.x;
        const tabIndex = Math.floor(scrollX / windowWidth);
        const tabNames = ['To Approve', 'To Deliver', 'Delivered', 'Completed', 'Cancelled'];
        const newSelectedTab = tabNames[tabIndex];

        if (newSelectedTab !== selectedTab) {
            setSelectedTab(newSelectedTab);
            fetchOrders(newSelectedTab);
        }
    };

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

    const fetchOrders = useCallback((tab = selectedTab) => {
        if (user) {
            setLoading(true);

            const statusCriteria = {
                'To Approve': ['Pending'],
                'To Deliver': ['Approved'],
                'Delivered': ['Receiving'],
                'Completed': ['Completed'],
                'Cancelled': ['Cancelled']
            }[tab];

            if (statusCriteria && statusCriteria.length > 0) {
            const ordersQuery = query(
                collection(db, 'orders'),
                where('sellerEmail', '==', user.email),
                where('status', 'in', statusCriteria),
                orderBy('dateOrdered', 'desc')
            );

            return onSnapshot(ordersQuery, async (querySnapshot) => {
                const updatedOrders = [];
                querySnapshot.forEach((doc) => {
                    updatedOrders.push({ id: doc.id, ...doc.data() });
                });

                setOrders(updatedOrders);
                await fetchProductDetails(updatedOrders);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching orders:", error);
                setLoading(false);
            });
        } else {
            console.error("No valid status criteria found for tab:", tab);
            setLoading(false);
            setOrders([]); 
        }
        }
    }, [user, selectedTab]);

    useEffect(() => {
        const unsubscribe = fetchOrders();
        return () => unsubscribe && unsubscribe();
    }, [fetchOrders]);

    const approveOrder = async (orderId) => {
        Alert.alert(
            "Confirm Approval",
            "Are you sure you want to approve this order?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve", onPress: async () => {
                        try {
                            const orderRef = doc(db, 'orders', orderId);
                            await updateDoc(orderRef, { status: 'Approved' });
                            await fetchOrders();
                        } catch (error) {
                            console.error("Error updating document: ", error);
                            Alert.alert("Error", "There was a problem approving the order.");
                        }
                    }
                }
            ]
        );
    };

    const approveToShipOrder = (orderId) => {
      setCurrentOrder(orderId);
      setDeliveryStart(new Date()); 
      setDeliveryEnd(new Date()); 
      setDeliveryDateModalVisible(true); 
  };

    const showStartDatePicker = () => {
      setStartDatePickerVisibility(true);
  };

  const showEndDatePicker = () => {
      setEndDatePickerVisibility(true);
  };

  const handleConfirmStartDate = (date) => {
      setDeliveryStart(date);
      setStartDatePickerVisibility(false);
  };

  const handleConfirmEndDate = (date) => {
      setDeliveryEnd(date);
      setEndDatePickerVisibility(false);
  };

  const confirmDeliveryDates = async () => {
    if (currentOrder) {
        Alert.alert(
            "Finalize Delivery Dates",
            "Are you sure you want to set these delivery dates?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const orderRef = doc(db, 'orders', currentOrder);
                            await updateDoc(orderRef, {
                                deliveryStart: Timestamp.fromDate(new Date(deliveryStart)), 
                                deliveryEnd: Timestamp.fromDate(new Date(deliveryEnd)), 
                                status: 'Receiving',
                                deliveredStatus: 'Processing',
                            });
                            setDeliveryDateModalVisible(false);
                            await fetchOrders();
                            Alert.alert("Success", "Delivery dates set successfully.");
                        } catch (error) {
                            console.error("Error setting delivery dates: ", error);
                            Alert.alert("Error", "Failed to set delivery dates.");
                        }
                    }
                }
            ],
            { cancelable: false }
        );
    }
};

    const renderEmptyListComponent = (tab) => {
        let icon = 'inbox';
        let message = `No ${tab} Orders yet.`;

        switch (tab) {
            case 'To Approve':
                icon = 'clock-o';
                break;
            case 'To Deliver':
                icon = 'truck';
                break;
            case 'Delivered':
                icon = 'truck';
                break;
            case 'Completed':
                icon = 'check-circle';
                break;
        }

        return (
            <View style={styles.emptyOrdersContainer}>
                <Icon name={icon} size={50} color="#cccccc" />
                <Text style={styles.emptyOrdersText}>{message}</Text>
            </View>
        );
    };

    const renderOrderItem = ({ item: order }) => {

        const handlePress = () => {
            if (selectedTab === 'To Approve') {
              navigation.navigate('OrderToApproveDetails', { order, products });
            } else if (selectedTab === 'To Deliver') {
              navigation.navigate('OrderToShipBySellerDetails', { order, products });
            } else if (selectedTab === 'Delivered') {
              navigation.navigate('OrderShippedDetails', { order, products });
            } else if (selectedTab === 'Completed') {
              navigation.navigate('OrderCompletedBySellerDetails', { order, products });
            } else if (selectedTab === 'Cancelled') {
                navigation.navigate('OrderCancelledBySellerDetails', { order, products });
              }
          };

          if ((selectedTab === 'To Approve' && order.status !== 'Pending') ||
          (selectedTab === 'To Deliver' && order.status !== 'Approved') ||
          (selectedTab === 'Delivered' && order.status !== 'Receiving') ||
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
                        <View style={styles.buyerHeader}>
                            <Icon name="money" size={20} color="#808080" style={styles.shopIcon} />
                            <Text style={styles.buyerName}>{order.buyerEmail}</Text>
                        </View>
                        {productDetails.map((item, index) => (
                            <View key={index} style={styles.productContainer}>
                                 <TouchableOpacity 
                                    onPress={() => navigation.navigate('ViewerImage', { imageUrl: item.photo })}
                                >
                                <Image source={{ uri: item.photo }} style={styles.productImage} />
                                </TouchableOpacity>
                                <View style={styles.productInfo}>
                                    <Text style={styles.orderId}>Order ID: #{order.id.toUpperCase()}</Text>
                                    <Text style={styles.productName}>{item.name}</Text>
                                    <Text style={styles.productCategory}>{item.category}</Text>
                                    <Text style={styles.productQuantity}>x{item.orderedQuantity}</Text>
                                    <Text style={styles.productPrice}>₱{item.price}</Text>
                                </View>
                            </View>
                        ))}
                        <View style={styles.totalPriceContainer}>
                        {selectedTab === 'Completed' && (
                            <View style={styles.orderTotalRow}>
                            <Text style={styles.orderTotalLabel}>
                                <Icon name="check-circle" size={16} color="#4CAF50" /> Paid Amount:
                            </Text>
                            <Text style={styles.orderTotalPrice}>₱{order.orderTotalPrice.toFixed(2)}</Text>
                            </View>
                        )}
                        {selectedTab === 'Cancelled' && (
                            <View style={styles.orderTotalRow}>
                            <Text style={[styles.orderTotalLabel, styles.cancelledText]}>
                                Amount to Pay:
                            </Text>
                            <Text style={[styles.orderTotalPrice, styles.cancelledPrice]}>
                                ₱{order.orderTotalPrice.toFixed(2)}
                            </Text>
                            </View>
                        )}
                        {selectedTab !== 'Completed' && selectedTab !== 'Cancelled' && (
                            <View style={styles.orderTotalRow}>
                            <Text style={styles.orderTotalLabel}>Amount to Pay:</Text>
                            <Text style={styles.orderTotalPrice}>₱{order.orderTotalPrice.toFixed(2)}</Text>
                            </View>
                        )}
                        </View>
                        <View style={styles.buttonContainer}>
                            {selectedTab === 'To Approve' && (
                                <>
                                    <Text style={styles.hintText}>
                                        Please check the buyer's order for approval.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.approveButton}
                                        onPress={() => navigation.navigate('OrderToApproveDetails', { order, products })}
                                    >
                                        <Text style={styles.approveButtonText}>Check Order</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            {selectedTab === 'To Deliver' && (
                                <>
                                    <Text style={styles.hintText}>
                                        Tap button to check details.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.shipButton}
                                        onPress={() => navigation.navigate('OrderToShipBySellerDetails', { order, products })}
                                    >
                                        <Text style={styles.shipButtonText}>Ready to Deliver</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            {selectedTab === 'Delivered' && (
                                <>
                                    {order.deliveredStatus === 'Waiting' && (
                                        <View style={styles.buttonContainer}>
                                            <Text style={styles.hintText}>
                                                Waiting for buyer to confirm receipt of the order.
                                                </Text>
                                            <TouchableOpacity style={[styles.pendingButton, { backgroundColor: '#ccc' }]} disabled>
                                                <Text style={styles.pendingButtonText}>Delivery In Progress...</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {order.deliveredStatus === 'Processing' && (
                                        <View style={styles.buttonContainer}>
                                           <Text style={styles.hintText}>Please confirm that the order has been delivered and received by the buyer.</Text>
                                            <TouchableOpacity
                                                style={styles.approveButton}
                                                onPress={() => {navigation.navigate('OrderShippedDetails', { order, products, shouldOpenConfirmModal: true });
                                                }}
                                            >
                                                <Text style={styles.confirmButtonText}>Confirm Delivered Order</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </>
                            )}
                            {selectedTab === 'Completed' && (
                                <>
                                    <Text style={styles.hintText}>
                                        Completed.
                                    </Text>
                                
                                </>
                            )}
                            {selectedTab === 'Cancelled' && (
                                <>
                                    <Text style={styles.hintText}>
                                        Cancelled.
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                ))}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Orders Management</Text>
            </View>

            <OrderSellerTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                ref={scrollRef}
                style={styles.scrollView}
            >
                {['To Approve', 'To Deliver', 'Delivered', 'Completed', 'Cancelled'].map((tab, index) => (
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
            <Modal
                animationType="slide"
                transparent={true}
                visible={isDeliveryDateModalVisible}
                onRequestClose={() => setDeliveryDateModalVisible(false)}
            >
                <View style={styles.modalBottomView}>
                    <View style={styles.modalInnerView}>
                        <Text style={styles.modalText}>Set Delivery Dates</Text>
                        <Text style={styles.modalDescription}>
                            The purpose of setting the start and end delivery dates is to specify the window within which the order should be delivered. The delivery of the item should occur between these dates.
                        </Text>
                        <TouchableOpacity onPress={() => showStartDatePicker()} style={styles.datePickerButton}>
                            <Text>Start Date: {deliveryStart.toDateString()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => showEndDatePicker()} style={styles.datePickerButton}>
                            <Text>End Date: {deliveryEnd.toDateString()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={confirmDeliveryDates} style={styles.confirmButton}>
                          <Text style={styles.confirmButtonText}>Confirm Dates</Text>
                      </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <DateTimePickerModal
                isVisible={isStartDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmStartDate}
                onCancel={() => setStartDatePickerVisibility(false)}
            />
            <DateTimePickerModal
                isVisible={isEndDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmEndDate}
                onCancel={() => setEndDatePickerVisibility(false)}
            />
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
    backgroundColor: '#F9F6EE',
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
    backgroundColor: '#FFF',  
    
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
  buyerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    padding: 8,
    marginTop: 10,
  },
  sellerName: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  orderId: {
    color: '#333',
    fontSize: 12,
    paddingHorizontal: 6,
    borderRadius: 4,
    textAlign: 'right',
    top: -10,
  },
  hintText: {
    flex: 1, 
    marginLeft: 10,
    fontStyle: 'italic',
    fontSize: 12,
},
  buyerName: {
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
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  confirmationContainer: {
    alignItems: 'center',
    justifyContent: 'center'
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
  approveButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  approveHint: {
    color: '#666',
    fontSize: 12,
    flex: 1,
    paddingHorizontal: 10,
  },
  shipButton: {
    backgroundColor: '#4CAF50', 
    padding: 10,
    borderRadius: 5,
  },
  pendingToReceiveButton: {
    backgroundColor: '#ccc', 
    padding: 10,
    borderRadius: 5,
  },
  shipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
},
loading: {
    marginTop: 50,
},
emptyOrdersContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 50,
},
emptyOrdersText: {
  fontSize: 18,
  color: '#cccccc',
  marginTop: 10,
},
centeredView: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 22,
},
modalView: {
  margin: 20,
  backgroundColor: "white",
  borderRadius: 20,
  padding: 35,
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: {
      width: 0,
      height: 2
  },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5
},
modalBottomView: {
  flex: 1,
  justifyContent: 'flex-end',
  alignItems: 'center',
},
modalInnerView: {
  width: '100%',
  backgroundColor: "white",
  padding: 20,
  alignItems: "center",
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
modalDescription: {
  marginBottom: 15,
  textAlign: "center"
},
datePickerButton: {
  backgroundColor: '#f0f0f0',
  padding: 10,
  borderRadius: 5,
  marginBottom: 10,
  width: '100%',
  alignItems: 'center',
},
confirmButton: {
  backgroundColor: '#4CAF50', 
  padding: 15,
  borderRadius: 10,
  width: '80%',
  alignItems: 'center',
  marginTop: 10,
},
confirmButtonText: {
  color: '#FFFFFF', 
  fontSize: 16,
  fontWeight: 'bold',
},
orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cancelledText: {
    color: '#ccc',
    textDecorationLine: 'line-through', 
  },
  cancelledPrice: {
    color: '#ccc', 
    textDecorationLine: 'line-through', 
  },
});

  export default SellerOrderManagement;