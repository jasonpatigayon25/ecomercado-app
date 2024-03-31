import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const SellerRegistration = ({ navigation }) => {
  const [sellerName, setSellerName] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [type, setType] = useState('Individual');
  const [pickupAddress, setPickupAddress] = useState('');
  const [email, setEmail] = useState('');

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
      }
    };

    fetchUserData();
  }, []);

  const handleRegistration = async () => {
    console.log('Registering seller:', sellerName, pickupAddress, email);
    try {
      const sellerData = {
        sellerName,
        registeredName,
        type,
        pickupAddress,
        email,
      };
      await addDoc(collection(db, 'registeredSeller'), sellerData);
      Alert.alert('Seller registered successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error registering seller:', error);
      Alert.alert('Error registering seller');
    }
  };

  return (
    <View style={styles.container}>
     <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" />
        </TouchableOpacity>
      <Text style={styles.title}>Seller Registration</Text>
      </View>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.label}>Seller Name:</Text>
        <TextInput
          placeholder="Seller Name"
          value={sellerName}
          onChangeText={setSellerName}
          style={styles.input}
        />

        <Text style={styles.label}>Registered Name:</Text>
        <TextInput
          placeholder="Registered Name"
          value={registeredName}
          onChangeText={setRegisteredName}
          style={styles.input}
        />

        <Text style={styles.label}>Type:</Text>
        <RadioButton.Group onValueChange={newValue => setType(newValue)} value={type}>
          <RadioButton.Item label="Individual" value="Individual" />
          <RadioButton.Item label="Business" value="Business" />
        </RadioButton.Group>

        <Text style={styles.label}>Pick Up Address:</Text>
        <TextInput
          placeholder="Pickup Address"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          style={styles.input}
        />

        <Text style={styles.label}>Email Address:</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.inputEmail}
          editable={false}
        />
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={handleRegistration}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    marginLeft: 20,
  },
  label: {
    color: '#05652D',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    color: '#333',
    marginBottom: 20,
  },
  inputEmail: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#D3D3D3',
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  backButtonText: {
    color: '#05652D',
    fontSize: 18,
  }
});

export default SellerRegistration;
