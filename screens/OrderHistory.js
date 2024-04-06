import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import OrderTab from '../navbars/OrderTab';

const OrderHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const [selectedTab, setSelectedTab] = useState('To Pay');

  useEffect(() => {
    const fetchOrders = async () => {
      if (user) {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('buyerEmail', '==', user.email),
          orderBy('dateOrdered', 'desc')
        );
        const querySnapshot = await getDocs(ordersQuery);
        const fetchedOrders = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() });
        });
        setOrders(fetchedOrders);
        await fetchProductDetails(fetchedOrders);
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
      };
  
      const sellerNames = await fetchSellerNames(sellerEmailsToFetch);
      Object.values(fetchedProducts).forEach(product => {
        product.sellerName = sellerNames[product.seller_email];
      });
  
      setProducts(fetchedProducts);
      setLoading(false);
    };
  
    fetchOrders();
  }, [user]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const renderOrderItem = ({ item: order }) => {
    const groupedBySeller = order.productDetails.reduce((acc, productDetail) => {
      const sellerName = products[productDetail.productId].sellerName; 
      if (!acc[sellerName]) {
        acc[sellerName] = [];
      }
      acc[sellerName].push({
        ...productDetail,
        ...products[productDetail.productId]
      });
      return acc;
    }, {});
  
    return (
      <View style={styles.orderItemContainer}>
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
        <Text style={styles.orderTotalPrice}>Amount to Pay: ₱{order.orderTotalPrice.toFixed(2)}</Text>
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
      <OrderTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        ListEmptyComponent={
          <View style={styles.emptyOrdersContainer}>
            <Text style={styles.emptyOrdersText}>No Orders Yet</Text>
          </View>
        }
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
    backgroundColor: '#FFFFFF',
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
  orderTotalPrice: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#05652D',
    textAlign: 'right',
    marginTop: 10,
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
});

  export default OrderHistory;