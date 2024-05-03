import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Alert } from 'react-native';
import UserContext from '../contexts/UserContext';
import { collection, query, where, getDocs, getFirestore} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { setUser } = useContext(UserContext);

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUpPress = () => {
    navigation.navigate('Signup');
  };

  const handleLoginButton = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter both email and password.", [{ text: "OK" }]);
      return;
    }
  
    const auth = getAuth();
    const db = getFirestore();
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        if (userDoc.data().banned) {
          console.log(`User ${email} is banned.`);
          Alert.alert("Account Banned", "Your account has been banned permanently.", [{ text: "OK" }]);
          return;
        }
  
        await AsyncStorage.setItem('userEmail', email);
        setUser({ email: email });
        navigation.navigate('Main', { username: email });
        setPassword('');
  
        registerIndieID(email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
          .then(() => {
            console.log('Device registered for notifications with subID:', email);
  
            const notificationData = {
              subID: email,
              appId: 18345,
              appToken: 'TdOuHYdDSqcy4ULJFVCN7l',
              title: 'Welcome!',
              message: 'You have successfully logged in.'
            };
  
            axios.post('https://app.nativenotify.com/api/indie/notification', notificationData, { timeout: 30000 })
              .then(response => {
                console.log("Push notification sent successfully", response.data);
              })
              .catch(error => {
                console.error("Error sending push notification", error);
              });
          })
          .catch((error) => {
            console.error('Error registering device for notifications:', error);
          });
      } else {
        console.error(`No user found with email: ${email}`);
        Alert.alert(
          "Login Failed",
          "Incorrect email or password. Please check your credentials and try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Login Failed",
        "Incorrect email or password. Please check your credentials and try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // nothing
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <View style={styles.backButtonContainer}>
            <Icon name="arrow-left" size={24} color="#05652D" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Login</Text>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/AppLogo.png')}
            style={styles.logo}
          />
        </View>
        <View style={styles.inputContainer}>
          <Icon name="user" size={24} color="#D3D3D3" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            onChangeText={setEmail}
            value={email}
            autoCapitalize='none'
          />
        </View>
        <View style={styles.inputContainer}>
          <Icon name="lock" size={24} color="#D3D3D3" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            secureTextEntry={!isPasswordVisible}
            onChangeText={setPassword}
            value={password}
            autoCapitalize='none'
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Icon name={isPasswordVisible ? "eye-slash" : "eye"} size={24} color="#D3D3D3" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleLoginButton}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSignUpPress}>
          <Text style={styles.text}>Don't have an account? 
          <Text style={styles.signUpText}> Sign Up</Text>
          </Text>
        </TouchableOpacity>
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
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 5,
    color: '#000',
    marginLeft: 20,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 320,
    height: 70,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#000',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#05652D',
  },
  buttonContainer: {
    height: 50,
    marginVertical: 10,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#05652D',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  signUpText: {
    color: '#05652D',
    fontWeight: 'bold',
  },
});

export default Login;
