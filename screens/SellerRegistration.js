import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

const SellerRegistration = ({ navigation }) => {
  const [sellerName, setSellerName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleRegistration = () => {
    // Implement registration logic here
    console.log('Registering seller:', sellerName, pickupAddress, email, phoneNumber);
    // Navigate back or show success message
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
