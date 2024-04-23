import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, getDocs, query, where, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';

const Notification = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const [orderDetails, setOrderDetails] = useState(null);
  const [donationRequestDetails, setDonationRequestDetails] = useState(null);

  const auth = getAuth();
  const user = auth.currentUser;

  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
      return () => {};
    }, [user])
  );

  const fetchNotifications = async () => {
    if (user) {
      setLoading(true);
      try {
        const q = query(collection(db, 'notifications'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        const fetchedNotifications = querySnapshot.docs
          .map(doc => ({ id: doc.id, isRead: doc.data().isRead || false, ...doc.data() }))
          .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
  
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error('Error fetching notifications: ', error);
        setError(`Error fetching notifications: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setError('User not authenticated');
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLongPress = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Do you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'notifications', notificationId));
              const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
              setNotifications(updatedNotifications);
              Alert.alert('Notification Deleted');
            } catch (error) {
              console.error('Error deleting notification: ', error);
              Alert.alert('Error', 'Failed to delete the notification');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePress = async (notification) => {
    if (!notification.isRead) {
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, { isRead: true });

      setNotifications(notifications.map(n => {
        if (n.id === notification.id) {
          return { ...n, isRead: true };
        }
        return n;
      }));
    }
    if (notification.type === 'subscribed_sell') {
      const sellerEmail = notification.productInfo?.sellerEmail;
      if (sellerEmail) {
        navigation.navigate('UserVisit', { email: sellerEmail });
      } else {
        console.error('Seller email not found in notification data');
      }
    }

    if (notification.type === 'subscribed_donate') {
      const donorEmail = notification.donationInfo?.donor_email;
      if (donorEmail) {
        navigation.navigate('UserVisit', { email: donorEmail });
      } else {
        console.error('Donor email not found in notification data');
      }
    }
    
    if (notification.type === 'chat_interest') {
      const chatId = notification.chatId;
      const receiverEmail = notification.receiverEmail;
      navigation.navigate('Chat', {
        chatId: chatId,
        receiverEmail: receiverEmail,
      });
    }
    
    if (notification.type === 'product_interest') {
      const interestedUser = notification.interestedUser;
      const currentUserEmail = user.email;
  
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('users', 'array-contains', currentUserEmail));
        const querySnapshot = await getDocs(q);
        
        let existingChatId = null;

        querySnapshot.forEach((doc) => {
          const chatData = doc.data();
          if (chatData.users.includes(interestedUser)) {
            existingChatId = doc.id;
          }
        });
        
        if (existingChatId) {
          navigation.navigate('Chat', {
            chatId: existingChatId,
            receiverEmail: interestedUser,
          });
        } else {

          const newChatRef = collection(db, 'chats');
          const newChatDoc = {
            users: [currentUserEmail, interestedUser],
            messages: [],
          };
          
          const docRef = await addDoc(newChatRef, newChatDoc);
          navigation.navigate('Chat', {
            chatId: docRef.id,
            receiverEmail: interestedUser,
          });
        }
      } catch (error) {
        console.error('Error handling chat navigation:', error);
      }
    }

    if (notification.type === 'buy_sell_order') {
      try {
        const orderRef = doc(db, 'orders', notification.orderId);
        const orderSnapshot = await getDoc(orderRef);
        if (orderSnapshot.exists()) {
          setOrderDetails({ id: orderSnapshot.id, ...orderSnapshot.data() });
          notification.message = `${notification.text}`;
          setSelectedNotification(notification);
          setModalVisible(true);
        } else {
          console.error('Order not found');
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      }
    }

    if (notification.type === 'donation_request') {
      try {
        const donationRequestRef = doc(db, 'donationRequests', notification.requestDonationId);
        const donationRequestSnapshot = await getDoc(donationRequestRef);
        
        if (donationRequestSnapshot.exists()) {
          const donationRequestData = donationRequestSnapshot.data();
          
          const donationRef = doc(db, 'donation', donationRequestData.donationId);
          const donationSnapshot = await getDoc(donationRef);
    
          if (donationSnapshot.exists()) {
            const donationData = donationSnapshot.data();

            setDonationRequestDetails({
              id: donationRequestSnapshot.id,
              ...donationRequestData,
              donationName: donationData.name, 
              donationPhoto: donationData.photo, 
            });
    
            setSelectedNotification({ ...notification, data: donationRequestData }); 
            setModalVisible(true);
          } else {
            console.error('Donation not found');
          }
        } else {
          console.error('Donation request not found');
        }
      } catch (error) {
        console.error('Error fetching donation request details:', error);
      }
    }
    
    if (notification.type === 'donation_approved' || notification.type === 'donation_denied') {
      try {
        const donationRequestRef = doc(db, 'donationRequests', notification.requestDonationId);
        const donationRequestSnapshot = await getDoc(donationRequestRef);
        
        if (donationRequestSnapshot.exists()) {
          const donationRequestData = donationRequestSnapshot.data();
          
          const donationRef = doc(db, 'donation', donationRequestData.donationId);
          const donationSnapshot = await getDoc(donationRef);
    
          if (donationSnapshot.exists()) {
            const donationData = donationSnapshot.data();

            setDonationRequestDetails({
              id: donationRequestSnapshot.id,
              ...donationRequestData,
              donationName: donationData.name, 
              donationPhoto: donationData.photo, 
            });
    
            setSelectedNotification({ ...notification, data: donationRequestData }); 
            setModalVisible(true);
          } else {
            console.error('Donation not found');
          }
        } else {
          console.error('Donation request not found');
        }
      } catch (error) {
        console.error('Error fetching donation request details:', error);
      }
    }
  };

  const renderDonationRequestModalContent = () => {
    if (!donationRequestDetails) return null;
  
    const { 
      id, 
      requesterAddress, 
      message, 
      donationName, 
      donationPhoto,
      donorEmail, 
      status 
    } = donationRequestDetails;
    
    return (
      <ScrollView style={styles.orderModalScrollView}>
        <View style={styles.orderModalContent}>
          <Text style={styles.orderModalTitle}>Donation Request</Text>
          
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Request ID:</Text>
            <Text style={styles.orderDetailValue}>{id}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Donation Name:</Text>
            <Text style={styles.orderDetailValue}>{donationName}</Text>
          </View>
          
          <View style={styles.divider} />
  
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Address:</Text>
            <Text style={styles.orderDetailValue}>{requesterAddress}</Text>
          </View>
  
          <View style={styles.divider} />
  
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Requester Message:</Text>
            <Text style={styles.orderDetailValue}>{message}</Text>
          </View>
  
          <View style={styles.divider} />
  
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Status:</Text>
            <Text style={styles.orderDetailValue}>Waiting for Approval</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDonationStatusModalContent = () => {
    if (!donationRequestDetails) return null;
  
    const { 
      id, 
      requesterAddress, 
      message, 
      donationName, 
      donationPhoto,
      donorEmail, 
      status 
    } = donationRequestDetails;
  
    const isApproved = selectedNotification?.type === 'donation_approved';
    const statusText = isApproved ? 'APPROVED' : 'DENIED';
    const statusColor = isApproved ? 'green' : 'red';
  
    return (
      <ScrollView style={styles.orderModalScrollView}>
        <View style={styles.orderModalContent}>
          <Text style={styles.orderModalTitle}>Donation Request</Text>
          
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Request ID:</Text>
            <Text style={styles.orderDetailValue}>{id}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Donation Name:</Text>
            <Text style={styles.orderDetailValue}>{donationName}</Text>
          </View>
          
          <View style={styles.divider} />
  
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Address:</Text>
            <Text style={styles.orderDetailValue}>{requesterAddress}</Text>
          </View>
  
          <View style={styles.divider} />
  
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Requester Message:</Text>
            <Text style={styles.orderDetailValue}>{message}</Text>
          </View>
  
          <View style={styles.divider} />
          
          <View style={styles.orderDetailContainer}>
            <Text style={styles.orderDetailLabel}>Status:</Text>
            <Text style={{ ...styles.orderDetailValue, color: statusColor, fontWeight: 'bold' }}>{statusText}</Text>
          </View>
        </View>
      </ScrollView>
    );
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
  
  const renderNotificationItem = (notification) => {
    let iconName;
    let iconColor = "#05652D";
  
    switch (notification.type) {
      case 'buy_sell_order':
        iconName = 'shopping-bag';
        break;
      case 'donation_request':
        iconName = 'heart';
        break;
      case 'donation_approved':
        iconName = 'check';
        iconColor = 'green';
        break;
      case 'donation_denied':
        iconName = 'times';
        iconColor = 'red';
        break;
      case 'chat_interest':
        iconName = 'comment'; 
        break;
      case 'subscribed_sell':
      case 'subscribed_donate':
        iconName = 'bell'; 
        break;
      default:
        iconName = 'shopping-bag'; 
        break;
    }
  
    const notificationStyle = typeof notification.isRead !== 'undefined' && notification.isRead
    ? styles.notificationItem 
    : {...styles.notificationItem, ...styles.unreadNotificationItem}; 

  
    return (
      <TouchableOpacity
        key={notification.id}
        style={notificationStyle} 
        onPress={() => handlePress(notification)}
        onLongPress={() => handleLongPress(notification.id)}
      >
        <Icon name={iconName} size={20} color={iconColor} style={styles.notificationIcon} />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{notification.text}</Text>
          <Text style={styles.notificationTimestamp}>
            {notification.timestamp.toDate().toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

const renderEmptyNotification = () => {
  return (
    <View style={styles.emptyContainer}>
      <Icon name="bell-o" size={40} color="#888888" />
      <Text style={styles.emptyText}>No notifications yet</Text>
    </View>
  );
};

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseIcon} onPress={() => setModalVisible(false)}>
              <Icon name="times" size={24} color="#05652D" />
            </TouchableOpacity>
            <Text>{selectedNotification?.text}</Text>
            <Text>{selectedNotification?.timestamp.toDate().toLocaleString()}</Text>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Icon name="arrow-left" size={24} color="#fff" style={styles.backButtonIcon} onPress={handleBackPress} />
        <Text style={styles.title}>Notifications</Text>
      </View>
      <ScrollView
        style={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {notifications.length === 0 ? (
          renderEmptyNotification()
        ) : (
          <View style={styles.sectionContainer}>
            <View style={styles.divider} />
            {notifications.map(renderNotificationItem)}
          </View>
        )}
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseIcon} onPress={() => setModalVisible(false)}>
              <Icon name="times" size={24} color="#05652D" />
            </TouchableOpacity>
            <Text style={styles.modalText}>{selectedNotification?.text}</Text>
      <Text style={styles.modalTimestamp}>
        {selectedNotification?.timestamp.toDate().toLocaleString()}
      </Text>

            <ScrollView style={{ flex: 1 }}>
        {selectedNotification?.type === 'buy_sell_order'
          ? renderOrderModalContent()
          : selectedNotification?.type === 'donation_request'
          ? renderDonationRequestModalContent()
          : selectedNotification?.type === 'donation_approved' || 'donation_denial'
          ? renderDonationStatusModalContent ()
          : null}
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
    elevation: 4,
  },
  backButtonIcon: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#05652D',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#D3D3D3',
    marginVertical: 5,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    marginRight: 15,
    width: 30,
    textAlign: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    color: '#333333',
  },
  notificationTimestamp: {
    fontSize: 14,
    color: '#888888',
    marginTop: 5,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    padding: 15,
    textAlign: 'center',
  },
  refreshControl: {
    backgroundColor: '#05652D',
  },

  actionButton: {
    padding: 8,
    backgroundColor: '#05652D',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#888888',
    marginTop: 10,
  },
  orderModalScrollView: {
    width: '100%',
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
  donationModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  donationModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 15,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  donationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D3D3D3',
    paddingBottom: 10,
    marginBottom: 10,
  },
  donationDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  donationDetailValue: {
    fontSize: 16,
    color: '#333333',
    flexShrink: 1,
    textAlign: 'right',
  },
  donationButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  donationModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  donationImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  donationName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  donationEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  donationMessage: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  unreadNotificationItem: {
    backgroundColor: '#E8F4E5', 
  },

});

export default Notification;