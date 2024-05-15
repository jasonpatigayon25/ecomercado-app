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
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [isSteadied, setIsSteadied] = useState(false);

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

  const handleLongPress = (notificationId) => {
    setIsSteadied(true);
    toggleNotificationSelection(notificationId);
  };

  const toggleNotificationSelection = (notificationId) => {
    const index = selectedNotifications.indexOf(notificationId);
    if (index === -1) {
      setSelectedNotifications([...selectedNotifications, notificationId]);
    } else {
      setSelectedNotifications(selectedNotifications.filter(id => id !== notificationId));
    }
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
      'approved_request': 'To Deliver',
      'delivery_scheduled': 'Receiving',
      'delivery_confirmation': 'Receiving',
      'donation_received': 'Completed',
      'declined_request': 'Taken/Declined',
    };
  
    const typeToTabRequester = {
      'request_submitted': 'To Approve',
      'request_approved': 'To Deliver',
      'request_delivery_scheduled': 'To Receive',
      'request_delivery_confirmation': 'To Receive',
      'donation_confirmed': 'Acquired',
      'request_declined': 'Taken/Declined',
    };
  
    const navigateToTabSeller = typeToTabSeller[notification.type];
    if (navigateToTabSeller) {
      navigation.navigate('SellerOrderManagement', { selectedTab: navigateToTabSeller });
      return;
    }
  
    const navigateToTabBuyer = typeToTabBuyer[notification.type];
    if (navigateToTabBuyer) {
      navigation.navigate('OrderHistory', { selectedTab: navigateToTabBuyer });
      return;
    }
  
    const navigateToTabDonor = typeToTabDonor[notification.type];
    if (navigateToTabDonor) {
      navigation.navigate('RequestManagement', { selectedTab: navigateToTabDonor });
      return;
    }
  
    const navigateToTabRequester = typeToTabRequester[notification.type];
    if (navigateToTabRequester) {
      navigation.navigate('RequestHistory', { selectedTab: navigateToTabRequester });
      return;
    }
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) {
      Alert.alert('No notifications selected');
      return;
    }

    Alert.alert(
      'Remove notification',
      'Do you want to remove selected notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await Promise.all(selectedNotifications.map(async id => {
                await deleteDoc(doc(db, 'notifications', id));
              }));
              const updatedNotifications = notifications.filter(notification => !selectedNotifications.includes(notification.id));
              setNotifications(updatedNotifications);
              setSelectedNotifications([]);
              setIsSteadied(false);
              Alert.alert('Notifications Deleted');
            } catch (error) {
              console.error('Error deleting notifications: ', error);
              Alert.alert('Error', 'Failed to delete the notifications');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSelectAll = () => {
    setSelectedNotifications(notifications.map(notification => notification.id));
  };


  const renderNotificationItem = (notification) => {

    const iconMap = {
        'new_order': 'shopping-cart',
        'approved_order': 'thumbs-up',
        'delivery_scheduled_order': 'calendar',
        'receive_order': 'inbox',
        'completed_order': 'flag',
        'declined_order': 'times-circle',
        'order_placed': 'money',
        'order_delivery_scheduled': 'calendar',
        'order_approved': 'thumbs-up',
        'order_delivered': 'package',
        'order_receive': 'inbox',
        'order_completed': 'flag',
        'order_declined': 'times-circle',
        'donation_requested': 'heart',
        'approved_request': 'handshake-o',
        'delivery_scheduled': 'calendar-o',
        'delivery_confirmation': 'check-circle',
        'donation_received': 'flag',
        'declined_request': 'times-circle',
        'request_submitted': 'hand-rock-o',
        'request_approved': 'handshake-o',
        'request_delivery_scheduled': 'calendar-o',
        'request_delivery_confirmation': 'check-circle',
        'donation_confirmed': 'flag',
        'request_declined': 'times-circle',
    };

    const colorMap = {
        'new_order': '#32CD32', 
        'approved_order': '#32CD32', 
        'delivery_scheduled_order': '#32CD32',
        'order_delivery_scheduled': '#32CD32',
        'receive_order': '#32CD32',
        'completed_order': '#32CD32',
        'declined_order': '#32CD32',
        'order_placed': '#32CD32', 
        'order_approved': '#32CD32', 
        'order_delivered': '#32CD32', 
        'order_receive': '#32CD32', 
        'order_completed': '#32CD32', 
        'order_declined': '#32CD32', 
        'donation_requested': '#20B2AA', 
        'approved_request': '#20B2AA',
        'delivery_scheduled': '#20B2AA', 
        'delivery_confirmation': '#20B2AA', 
        'donation_received': '#20B2AA', 
        'declined_request': '#20B2AA', 
        'request_submitted': '#4682B4',
        'request_approved': '#4682B4', 
        'request_delivery_scheduled': '#4682B4',
        'request_delivery_confirmation': '#4682B4', 
        'donation_confirmed': '#4682B4', 
        'request_declined': '#4682B4', 
    };

    const notificationStyle = notification.isRead
        ? styles.notificationItem
        : { ...styles.notificationItem, ...styles.unreadNotificationItem };

        const isSelected = selectedNotifications.includes(notification.id);
    const checkbox = isSteadied && (
      <TouchableOpacity onPress={() => toggleNotificationSelection(notification.id)} style={styles.checkbox}>
        <Icon name={isSelected ? 'check-square-o' : 'square-o'} size={24} color="#888888" />
      </TouchableOpacity>
    );

    return (
        <TouchableOpacity
            key={notification.id}
            style={notificationStyle}
            onPress={() => handlePress(notification)}
            onLongPress={() => handleLongPress(notification.id)}
        >
           {checkbox}
            <Icon name={iconMap[notification.type]} size={24} color={colorMap[notification.type]} style={styles.notificationIcon} />

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
      {isSteadied && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
            <Text style={styles.selectAllButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelectedNotifications}>
            <Icon name="trash-o" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: 10,
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
  checkbox: {
    marginRight: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    backgroundColor: '#05652D',
  },
  selectAllButton: {
    backgroundColor: '#05652D',
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectAllButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    padding: 15,
    textAlign: 'center',
  },
});

export default Notification;
