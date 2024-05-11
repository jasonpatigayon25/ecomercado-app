import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';

const Notification = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

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
      setNotifications(notifications.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    }
  
    const typeToTabSeller = {
      'new_order': 'To Approve',
      'approved_order': 'To Deliver',
      'delivery_scheduled_order': 'Delivered',
      'receive_order': 'Delivered',
      'completed_order': 'Completed',
      'declined_order': 'Cancelled',
    };
  
    const typeToTabBuyer = {
      'order_placed': 'To Pay',
      'order_approved': 'To Deliver',
      'order_delivered': 'To Receive',
      'order_receive': 'To Receive',
      'order_completed': 'Completed',
      'order_declined': 'Cancelled',
    };
      
    const typeToTabDonor = {
      'donation_requested': 'To Approve',
      'request_approved': 'To Deliver',
      'delivery_scheduled': 'Receiving',
      'donation_received': 'Completed',
    };
  
    const typeToTabRequester = {
      'request_submitted': 'To Approve',
      'approved_request': 'To Deliver',
      'request_delivery_scheduled': 'Receiving',
      'donation_confirmed': 'Completed',
    };
  
    // Navigate to SellerOrderManagement if it's a seller-related notification
    const navigateToTabSeller = typeToTabSeller[notification.type];
    if (navigateToTabSeller) {
      navigation.navigate('SellerOrderManagement', { selectedTab: navigateToTabSeller });
      return;
    }
  
    // Navigate to OrderHistory if it's a buyer-related notification
    const navigateToTabBuyer = typeToTabBuyer[notification.type];
    if (navigateToTabBuyer) {
      navigation.navigate('OrderHistory', { selectedTab: navigateToTabBuyer });
      return;
    }
  
    // Navigate to RequestManagement if it's a donor-related notification
    const navigateToTabDonor = typeToTabDonor[notification.type];
    if (navigateToTabDonor) {
      navigation.navigate('RequestManagement', { selectedTab: navigateToTabDonor });
      return;
    }
  
    // Navigate to RequestHistory if it's a requester-related notification
    const navigateToTabRequester = typeToTabRequester[notification.type];
    if (navigateToTabRequester) {
      navigation.navigate('RequestHistory', { selectedTab: navigateToTabRequester });
      return;
    }
  };

  const renderNotificationItem = (notification) => {
    let iconName;
    let iconColor = "#05652D";
  
    switch (notification.type) {
      case 'order_placed':
      case 'new_order':
        iconName = 'shopping-bag';
        break;
      case 'order_approved':
      case 'approved_order':
        iconName = 'check';
        break;
      case 'order_delivered':
      case 'delivered_order':
        iconName = 'truck';
        break;
      case 'order_received':
      case 'receive_order':
        iconName = 'gift';
        break;
      default:
        iconName = 'bell'; // Default icon if needed
        break;
    }
  
    const notificationStyle = notification.isRead
      ? styles.notificationItem 
      : { ...styles.notificationItem, ...styles.unreadNotificationItem };

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

  const renderEmptyNotification = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell-o" size={40} color="#888888" />
      <Text style={styles.emptyText}>No notifications yet</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="arrow-left" size={24} color="#fff" style={styles.backButtonIcon} onPress={handleBackPress} />
        <Text style={styles.title}>Notifications</Text>
      </View>
      <ScrollView
        style={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {notifications.length === 0 ? renderEmptyNotification() : (
          <View style={styles.sectionContainer}>
            {notifications.map(renderNotificationItem)}
          </View>
        )}
      </ScrollView>
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
  unreadNotificationItem: {
    backgroundColor: '#E8F4E5',
  },
});

export default Notification;
