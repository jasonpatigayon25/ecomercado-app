import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';

const NavbarLogin = ({ onLoginPress, onSignUpPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Text style={styles.ecomercadoText}>ECOMercado!</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onLoginPress} style={[styles.button, styles.loginButton]}>
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSignUpPress} style={[styles.button, styles.signUpButton]}>
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 8,
    paddingHorizontal: 20,

  },
  welcomeContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ecomercadoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginLeft: 10,
  },
  loginButton: {
    backgroundColor: '#FFF',
  },
  signUpButton: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  loginText: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  signupText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default NavbarLogin;
