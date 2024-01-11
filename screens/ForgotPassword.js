import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');

  const handleResetPassword = () => {
    const auth = getAuth();

    sendPasswordResetEmail(auth, email)
      .then(() => {
        alert('Password reset link sent to ' + email);
      })
      .catch((error) => {
        console.error('Error sending password reset email:', error);
        alert('Error sending password reset email. Please try again.');
      });
  };

  const handleSignInPress = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Forgot Password</Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.subtitle}>
          Enter your email address to receive a password reset link
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSignInPress}>
          <Text style={styles.text}>
            Remember your password?
            <Text style={styles.loginText}> Log In</Text>
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
    marginBottom: 5,
    color: '#000',
  },
  contentContainer: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#000',
  },
  button: {
    backgroundColor: '#05652D',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  loginText: {
    color: '#05652D',
    fontWeight: 'bold',
  },
});

export default ForgotPassword;
