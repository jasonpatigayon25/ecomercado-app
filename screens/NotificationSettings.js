import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

const NotificationSettings = ({ navigation }) => {
  const [sellingNotifications, setSellingNotifications] = useState(true);
  const [donatingNotifications, setDonatingNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;
  const userKey = user ? user.email : 'default';

  useEffect(() => {
    AsyncStorage.getItem(`${userKey}_sellingNotifications`)
      .then(value => setSellingNotifications(value === null ? true : JSON.parse(value)));

    AsyncStorage.getItem(`${userKey}_donatingNotifications`)
      .then(value => setDonatingNotifications(value === null ? true : JSON.parse(value)));

    AsyncStorage.getItem(`${userKey}_chatNotifications`)
      .then(value => setChatNotifications(value === null ? true : JSON.parse(value)));
  }, [userKey]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const toggleSellingNotifications = async () => {
    const newValue = !sellingNotifications;
    setSellingNotifications(newValue);
    await AsyncStorage.setItem(`${userKey}_sellingNotifications`, JSON.stringify(newValue));
  };

  const toggleDonatingNotifications = async () => {
    const newValue = !donatingNotifications;
    setDonatingNotifications(newValue);
    await AsyncStorage.setItem(`${userKey}_donatingNotifications`, JSON.stringify(newValue));
  };

  const toggleChatNotifications = async () => {
    const newValue = !chatNotifications;
    setChatNotifications(newValue);
    await AsyncStorage.setItem(`${userKey}_chatNotifications`, JSON.stringify(newValue));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.optionContainer}>
          <Text style={styles.optionText}>Sales and Purchases Notifications</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleSellingNotifications}
          >
            <Icon name={sellingNotifications ? "toggle-on" : "toggle-off"} size={24} color={sellingNotifications ? '#05652D' : '#D3D3D3'} />
          </TouchableOpacity>
        </View>
        <View style={styles.optionContainer}>
          <Text style={styles.optionText}>Donation Notifications</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleDonatingNotifications}
          >
            <Icon name={donatingNotifications ? "toggle-on" : "toggle-off"} size={24} color={donatingNotifications ? '#05652D' : '#D3D3D3'} />
          </TouchableOpacity>
        </View>
        <View style={styles.optionContainer}>
        <Text style={styles.optionText}>Chat Notifications</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleChatNotifications}
        >
          <Icon name={chatNotifications ? "toggle-on" : "toggle-off"} size={24} color={chatNotifications ? '#05652D' : '#D3D3D3'} />
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3FCE9',
  },
  header: {
    paddingTop: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FCE9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  backButtonIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    marginLeft: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionText: {
    fontSize: 16,
    color: '#05652D',
  },
  toggleButton: {
    padding: 5,
  },
  activeToggleButton: {
    borderColor: '#05652D',
  },
});

export default NotificationSettings;
