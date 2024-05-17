import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialIcons'; 
import { usersCollection } from '../config/firebase';
import { addDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import TermsModal from '../modals/TermsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import axios from 'axios';
import { Dimensions } from 'react-native';

const screenHeight = Dimensions.get('window').height;

const Signup = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isRepeatPasswordVisible, setIsRepeatPasswordVisible] = useState(false);
  const currentDate = new Date();
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  
  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  const [address, setAddress] = useState('');

  useFocusEffect(
    React.useCallback(() => {
        if (route.params?.location) {
            setAddress(route.params.location);
        }
    }, [route.params?.location])
);


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
    setAddress(selectedAddress); 
    setLocationSearchModalVisible(false); 
  };

  const handleButtonPress = async () => {
    const auth = getAuth();

    const isAnyInputMissing = !email.trim() || !firstname.trim() || !lastname.trim() || !contactNumber.trim() || !address.trim() || !password.trim() || !repeatPassword.trim();

    if (isAnyInputMissing) {
      Alert.alert('Missing inputs. Please provide the missing information.');
      return;
    }
    if (!termsChecked) {
      Alert.alert('Please accept the terms and conditions.');
      return;
    }

    if (!termsChecked) {
      setIsTermsModalVisible(true);
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Please enter a valid email address.');
      return;
    }

    if (password !== repeatPassword) {
      Alert.alert('Passwords do not match. Please re-enter the password.');
      return;
    }

    const validatePassword = (pass) => {
      const MIN_LENGTH = 8;
      const MAX_LENGTH = 32;
      const hasUpperCase = /[A-Z]/.test(pass);
      const hasLowerCase = /[a-z]/.test(pass);
      const hasDigit = /[0-9]/.test(pass);
      
      if (pass.length < MIN_LENGTH || pass.length > MAX_LENGTH) {
        Alert.alert(`Password should be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
        return false;
      }
      
      if (!hasUpperCase) {
        Alert.alert('Password should contain at least one uppercase letter.');
        return false;
      }
      
      if (!hasLowerCase) {
        Alert.alert('Password should contain at least one lowercase letter.');
        return false;
      }
      
      if (!hasDigit) {
        Alert.alert('Password should contain at least one numeric digit.');
        return false;
      }
      
      return true;
    };

    if (!validatePassword(password)) {
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        const userData = {
          email: email,
          firstName: firstname,
          lastName: lastname,
          contactNumber: `+63${contactNumber}`,
          address: address,
          dateRegistered: Timestamp.fromDate(currentDate), 
          uid: user.uid  
        };

        try {
          const docRef = await addDoc(usersCollection, userData);
          console.log(`User added with ID: ${docRef.id}`);
          await AsyncStorage.setItem('hasJustRegistered', 'true');
          await auth.signOut();
          Alert.alert('Registration complete. Please log in to ECOMercado.');
          navigation.navigate('Login');
        } catch (error) {
          console.error('Error occurred:', error);
          Alert.alert('Registration failed. Please try again later.');
        }

      })
      .catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
          Alert.alert('Email already taken, please provide another email address.');
        } else {
            console.error('Error occurred during authentication:', error);
            Alert.alert('Registration failed. Please try again later.');
        }
      });
};


  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={styles.backButtonContainer}>
            <Icon name="arrow-left" size={24} color="#05652D" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Sign Up</Text>
      </View>
      <ScrollView style={styles.contentContainer}>
        <Image
          source={require('../assets/AppLogo.png')}
          style={styles.logo}
        />
        <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize='none'
        />
        </View>
        <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter First Name"
          value={firstname}
          onChangeText={setFirstname}
        />
        </View>
        <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Last Name"
          value={lastname}
          onChangeText={setLastname}
        />
         </View>
        <View style={styles.inputContainer}>
          <Text style={styles.prefix}>PH +63</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Enter Contact Number"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="number-pad"
            maxLength={10}
          />
          </View>
       
        <View style={styles.inputContainer}>
          <TouchableOpacity 
              style={styles.inputTouchable}
              onPress={() => navigation.navigate('MapLocationSelector')}
          >
              <Text style={[styles.inputText, { color: address ? '#000' : '#A9A9A9' }]}>
                  {address || "Enter Address"}
              </Text>
          </TouchableOpacity>
          <TouchableOpacity 
              onPress={() => navigation.navigate('MapLocationSelector')}
              style={styles.iconContainer}
          >
              <Icon2 name="my-location" size={24} color="#D3D3D3" />
          </TouchableOpacity>
      </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            secureTextEntry={!isPasswordVisible}
            autoCapitalize='none'
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.iconContainer}>
            <Icon name={isPasswordVisible ? "eye-slash" : "eye"} size={24} color="#D3D3D3" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry={!isRepeatPasswordVisible}
            autoCapitalize='none'
            value={repeatPassword}
            onChangeText={setRepeatPassword}
          />
          <TouchableOpacity onPress={() => setIsRepeatPasswordVisible(!isRepeatPasswordVisible)} style={styles.iconContainer}>
            <Icon name={isRepeatPasswordVisible ? "eye-slash" : "eye"} size={24} color="#D3D3D3" />
          </TouchableOpacity>
        </View>
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={[styles.checkbox, termsChecked ? styles.checked : null]}
            onPress={() => setTermsChecked(!termsChecked)}
          />
          <Text style={styles.termsText} onPress={() => setIsTermsModalVisible(true)}>I agree to the Terms and Conditions</Text>
        </View>
        <TermsModal
          isVisible={isTermsModalVisible}
          onClose={(accepted) => {
            setTermsChecked(accepted);
            setIsTermsModalVisible(false);
          }}
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleButtonPress}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLoginPress}>
          <Text style={styles.text}>Already have an account? 
          <Text style={styles.loginText}> Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    backgroundColor: '#E3FCE9',  
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff', 
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButtonContainer: {
    marginRight: 20,
  },
  title: {
    fontSize: 22,
    color: '#3a3a3a', 
    fontWeight: '600',
  },
  contentContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  logo: {
    width: 300,
    height: 70,
    alignSelf: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dedede',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputTouchable: {
    flex: 1,
    justifyContent: 'center',

  },
  inputText: {
    color: '#000',
    fontSize: 16
},
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',  
  },
  iconContainer: {

  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#05652D',
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#fff', 
  },
  termsText: {
    fontSize: 14,
    color: '#3a3a3a',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#05652D',
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#05652D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#3a3a3a',
  },
  loginText: {
    color: '#05652D',
    fontWeight: 'bold',
  },
  modalView: {
    height: screenHeight / 2, 
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTextInput: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  searchResultsContainer: {
    width: '100%',
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
  checkboxIcon: {
    position: 'absolute',
    alignSelf: 'center',
    marginTop: 1,
  },
  checked: {
    backgroundColor: '#05652D', 
    borderColor: '#05652D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefix: {
    marginRight: 10,
    fontSize: 16,
    color: '#333333',
  },
});

export default Signup;