import React, { useState, useEffect, useRef, useCallback  } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import OrderSellerTab from '../navbars/OrderSellerTab';

const windowWidth = Dimensions.get('window').width;

const SellerOrderManagement = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const [selectedTab, setSelectedTab] = useState('To Approve');
  const scrollRef = useRef(); 

  
  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const tabIndex = Math.floor(scrollX / windowWidth);
    const tabNames = ['To Approve', 'To Ship', 'Shipped', 'Completed'];
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

  const fetchOrders = useCallback(async (tab = selectedTab) => {
    if (user) {
        setLoading(true);
        try {
            let statusCriteria = [];
            if (tab === 'To Approve') {
                statusCriteria = ['Pending'];
            } else if (tab === 'To Ship') {
                statusCriteria = ['Approved'];
            } else if (tab === 'Shipped') {
              statusCriteria = ['Receiving'];
          }

            const ordersQuery = query(
                collection(db, 'orders'),
                where('sellerEmail', '==', user.email),
                where('status', 'in', statusCriteria),
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
    }
}, [user, selectedTab]);

  useEffect(() => {
    fetchOrders();
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

  const approveToShipOrder = async (orderId) => {
    Alert.alert(
      "Confirm Approval",
      "Are you sure items are ready to ship?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve", onPress: async () => {
            try {
              const orderRef = doc(db, 'orders', orderId);
              await updateDoc(orderRef, { status: 'Receiving' });
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

  const renderOrderItem = ({ item: order }) => {

    if ((selectedTab === 'To Approve' && order.status !== 'Pending') ||
    (selectedTab === 'To Ship' && order.status !== 'Approved') ||
    (selectedTab === 'Shipped' && order.status !== 'Receiving')) {
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
        <View style={styles.orderItemContainer}>
            {Object.entries(groupedBySeller).map(([sellerName, productDetails]) => (
                <View key={sellerName}>
                    <View style={styles.buyerHeader}>
                        <Icon name="money" size={20} color="#808080" style={styles.shopIcon} />
                        <Text style={styles.buyerName}>{order.buyerEmail}</Text>
                       {/*  <Text style={styles.orderId}>Order ID: #{order.id.toUpperCase()}</Text> */}
                    </View>
                    {productDetails.map((item, index) => (
                        <View key={index} style={styles.productContainer}>
                            <Image source={{ uri: item.photo }} style={styles.productImage} />
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
                        <Text style={styles.orderTotalLabel}>Amount to Pay:</Text>
                        <Text style={styles.orderTotalPrice}>₱{order.orderTotalPrice.toFixed(2)}</Text>
                    </View>
                    <View style={styles.buttonContainer}>
                        {selectedTab === 'To Approve' && (
                            <>
                                <Text style={styles.hintText}>
                                    Approve the order to prepare it for shipment.
                                </Text>
                                <TouchableOpacity
                                    style={styles.approveButton}
                                    onPress={() => approveOrder(order.id)}
                                >
                                    <Text style={styles.approveButtonText}>Approve Order</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {selectedTab === 'To Ship' && (
                            <>
                                <Text style={styles.hintText}>
                                    Tap button if items are ready to ship.
                                </Text>
                                <TouchableOpacity
                                    style={styles.shipButton}
                                    onPress={() => approveToShipOrder(order.id)}
                                >
                                    <Text style={styles.shipButtonText}>Ready to Ship</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {selectedTab === 'Shipped' && (
                            <>
                                <Text style={styles.hintText}>
                                    Waiting for buyer to approve if items are received.
                                </Text>
                                <TouchableOpacity
                                    style={styles.pendingToReceiveButton}
                                    // onPress={() => markAsReadyToShip(order.id)}
                                >
                                    <Text style={styles.shipButtonText}>Pending to Receive</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Transactions</Text>
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
                {['To Approve', 'To Ship', 'Shipped', 'Completed'].map((tab, index) => (
                    <View key={index} style={{ width: windowWidth }}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />
                        ) : (
                            <FlatList
                                data={orders}
                                keyExtractor={(item) => item.id}
                                renderItem={renderOrderItem}
                                ListEmptyComponent={
                                    <View style={styles.emptyOrdersContainer}>
                                        <Text>No orders found</Text>
                                    </View>
                                }
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
    backgroundColor: '#FFA500', 
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
});

  export default SellerOrderManagement;