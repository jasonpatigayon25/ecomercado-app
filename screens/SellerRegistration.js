import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const SellerRegistration = ({ navigation }) => {
  const [sellerName, setSellerName] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [type, setType] = useState('Individual');
  const [pickupAddress, setPickupAddress] = useState('');
  const [additionalAddresses, setAdditionalAddresses] = useState([]);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const userData = querySnapshot.docs[0].data();

        setSellerName(`${userData.firstName}'s Surplus`);
        setRegisteredName(`${userData.firstName} ${userData.lastName}`);
        setPickupAddress(userData.address);
        setEmail(userData.email);
        setPhoneNumber(userData.phoneNumber);
      }
    };

    fetchUserData();
  }, []);

  const handleRegistration = () => {
    console.log('Registering seller:', sellerName, pickupAddress, email, phoneNumber);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seller Registration</Text>

      <TextInput
        placeholder="Seller Name"
        value={sellerName}
        onChangeText={setSellerName}
        style={styles.input}
      />
      <TextInput
        placeholder="Registered Name"
        value={registeredName}
        onChangeText={setRegisteredName}
        style={styles.input}
      />
      <View>
        <Text>Type:</Text>
        <RadioButton.Group onValueChange={newValue => setType(newValue)} value={type}>
          <RadioButton.Item label="Individual" value="Individual" />
          <RadioButton.Item label="Business" value="Business" />
        </RadioButton.Group>
      </View>
      <TextInput
        placeholder="Pickup Address"
        value={pickupAddress}
        onChangeText={setPickupAddress}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegistration}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#eee',
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default SellerRegistration;
