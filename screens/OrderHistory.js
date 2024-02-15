import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import OrderTab from '../navbars/OrderTab';

const OrderHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [hideModalVisible, setHideModalVisible] = useState(false);

  const [selectedTab, setSelectedTab] = useState('Completed');

  const [modalVisible, setModalVisible] = useState(false);

  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const ordersQuery = query(
            collection(db, 'orders'),
            where('buyer.uid', '==', user.uid),
            orderBy('dateOrdered', 'desc')
          );
          const querySnapshot = await getDocs(ordersQuery);
          const fetchedOrders = [];
          querySnapshot.forEach((doc) => {
            fetchedOrders.push({ id: doc.id, ...doc.data() });
          });
          setOrders(fetchedOrders);
        }
      } catch (error) {
        console.error('Error fetching orders: ', error);
      }
    };

    fetchOrders();
  }, []);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOrderDetails(order);
    setViewModalVisible(true);
};

  const handleHideOrder = async () => {
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, { hidden: true });

      const updatedOrders = orders.filter((o) => o.id !== selectedOrder.id);
      setOrders(updatedOrders);

      setHideModalVisible(false);
    } catch (error) {
      console.error('Error hiding order: ', error);
    }
  };

  const handleLongPressOrder = (order) => {
    setSelectedOrder(order);
    setHideModalVisible(true);
  };

  const getProductNames = (productDetails) => {
    if (Array.isArray(productDetails)) {
      return productDetails.map(product => product.name).join(', ');
    }
    return productDetails.name;
  };

  const renderOrderModalContent = () => {
    if (!orderDetails) return null;
  
    const isSingleOrder = !Array.isArray(orderDetails.productDetails);
  
    const renderProductDetails = (details) => {
      const quantity = details.orderedQuantity !== undefined ? details.orderedQuantity : orderDetails.orderedQuantity;
      const price = details.orderedPrice !== undefined ? details.orderedPrice : orderDetails.orderedPrice;
    
      return (
        <View style={styles.productDetailContainer}>
          <Text style={styles.productName}>{details.name}</Text>
          <View style={styles.productDetailRow}>
            <Text style={styles.productLabel}>Quantity:</Text>
            <Text style={styles.productValue}>{quantity}</Text>
          </View>
          <View style={styles.productDetailRow}>
            <Text style={styles.productLabel}>Price:</Text>
            <Text style={styles.productValue}>
              {price !== undefined ? `₱${price.toFixed(2)}` : 'N/A'}
            </Text>
          </View>
        </View>
      );
    };
  
    return (
      <ScrollView style={styles.orderModalScrollView}>
        <View style={styles.orderModalContent}>
          <Text style={styles.orderModalTitle}>Order</Text>
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Order ID:</Text>
            <Text style={styles.orderDetailValue}>{orderDetails.id}</Text>
          </View>
          <View style={styles.divider} /> 
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Address:</Text>
            <Text style={styles.orderDetailValue}>{orderDetails.address}</Text>
          </View>
          <View style={styles.divider} /> 
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Payment Method:</Text>
            <Text style={styles.orderDetailValue}>{orderDetails.paymentMethod}</Text>
          </View>
          <View style={styles.divider} /> 
          {isSingleOrder ? (
            renderProductDetails(orderDetails.productDetails)
          ) : (
            orderDetails.productDetails.map((product, index) => (
              <React.Fragment key={index}>
                {renderProductDetails(product)}
              </React.Fragment>
            ))
          )}
          <View style={styles.divider} /> 
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Total Payment:</Text>
            <Text style={styles.totalPaymentValue}>
              {orderDetails.totalPrice !== undefined ? `₱${orderDetails.totalPrice.toFixed(2)}` : 'N/A'}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderEmptyOrders = () => (
    <View style={styles.emptyOrdersContainer}>
      <Icon name="history" size={50} color="#ccc" />
      <Text style={styles.emptyOrdersText}>No Orders Yet</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Order History</Text>
      </View>
      <OrderTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

      {orders.length > 0 ? (
      <ScrollView>
        {orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => handleViewOrder(order)}
            onLongPress={() => handleLongPressOrder(order)}
            style={styles.orderContainer}
          >
            <View style={styles.orderInfoContainer}>
              <Text style={styles.orderProductName}>{getProductNames(order.productDetails)}</Text>
              <Text style={styles.orderPrice}>₱{order.totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleViewOrder(order)}
              style={styles.viewButton}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    ) : renderEmptyOrders()}

      {viewModalVisible && selectedOrder && (
        <Modal
        animationType="slide"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
         >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseIcon} onPress={() => setViewModalVisible(false)}>
              <Icon name="times" size={24} color="#05652D" />
            </TouchableOpacity>
            {renderOrderModalContent()}
          </View>
        </View>
      </Modal>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={hideModalVisible}
        onRequestClose={() => setHideModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Order History</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove this order history?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setHideModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleHideOrder}
              >
                <Text style={styles.buttonText}>Hide</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8', 
  },
  header: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 4,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  orderContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 15,
    elevation: 3,
  },
  orderInfoContainer: {
    flex: 1,
    paddingVertical: 5,
  },
  orderProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderPrice: {
    fontSize: 16,
    color: '#4C9A2A',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 30,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4C9A2A',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333333',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#E3FCE9',
  },
  deleteButton: {
    backgroundColor: '#FFCCCC',
  },
  buttonText: {
    fontSize: 16,
    color: '#4C9A2A',
    fontWeight: 'bold',
  },
  viewModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    elevation: 5,
    maxHeight: '80%',
  },
  viewModalBody: {
    width: '100%',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4C9A2A',
  },
  viewModalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333333',
  },
  viewModalCloseButton: {
    backgroundColor: '#4C9A2A',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 15,
  },
  viewModalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 15,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  viewButton: {
    padding: 10,
    backgroundColor: '#4C9A2A',
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyOrdersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyOrdersText: {
    fontSize: 18,
    color: '#ccc',
    marginTop: 10,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4C9A2A',
    marginBottom: 5,
  },
  productContainer: {
    marginBottom: 15,
  },
  orderModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginHorizontal: 10,
    marginTop: 20,
  },
  orderModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 20,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  orderDetailContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  orderDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  orderDetailValue: {
    fontSize: 12,
    color: '#333333',
  },
  productDetailContainer: {
    padding: 10,
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 5,
  },
  productDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productLabel: {
    fontSize: 14,
    color: '#666666',
  },
  productValue: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
  },
  totalPaymentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'right',
    marginTop: 4,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#D3D3D3',
    marginVertical: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    height: '80%'
  },
  modalCloseIcon: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
});

export default OrderHistory;