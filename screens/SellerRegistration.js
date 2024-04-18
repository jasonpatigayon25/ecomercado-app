import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { Dimensions } from 'react-native';

const screenHeight = Dimensions.get('window').height;

const SellerRegistration = ({ navigation }) => {
  const [sellerName, setSellerName] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [type, setType] = useState('Individual');
  const [sellerAddress, setSellerAddress] = useState(''); 
  const [email, setEmail] = useState('');

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  const handleLocationSearch = async (query) => {
    setLocationSearchQuery(query);
  
    if (query.length > 0) {
      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
          params: {
            input: query,
            key: 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g', 
            components: 'country:PH' 
          }
        });
  
        if (response.data && response.data.predictions) {
          const locations = response.data.predictions.map(prediction => ({
            name: prediction.description,
            placeId: prediction.place_id 
          }));
          setLocationSearchResults(locations);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      }
    } else {
      setLocationSearchResults([]);
    }
  };

  const handleAddressSelect = (selectedAddress) => {
    setSellerAddress(selectedAddress); 
    setLocationSearchModalVisible(false); 
  };

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
        setSellerAddress(userData.address); 
        setEmail(userData.email);
      }
    };

    fetchUserData();
  }, []);

  const handleRegistration = async () => {
    console.log('Registering seller:', sellerName, sellerAddress, email);
    try {
      const sellerData = {
        sellerName,
        registeredName,
        type,
        sellerAddress, 
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

        <Text style={styles.label}>Your Address:</Text> 
        <TextInput
          placeholder="Your Address"
          value={sellerAddress}
          onChangeText={setSellerAddress}
          onFocus={() => setLocationSearchModalVisible(true)}
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationSearchModalVisible}
        onRequestClose={() => setLocationSearchModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Search for a location"
              value={locationSearchQuery}
              onChangeText={handleLocationSearch}
              autoFocus={true}
            />
            <ScrollView style={styles.searchResultsContainer}>
              {locationSearchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchResultItem}
                  onPress={() => handleAddressSelect(result.name)}
                >
                  <Text style={styles.searchResultText}>{result.name}</Text>
                </TouchableOpacity>
              ))}
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
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    height: screenHeight / 2, 
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTextInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  searchResultsContainer: {
    maxHeight: screenHeight / 2 - 80,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: 'red', 
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    alignSelf: 'flex-start',
    marginRight: 10,
    marginTop: 4,
  },
});

export default SellerRegistration;
