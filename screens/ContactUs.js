import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, FlatList, Modal, Button } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';

const ContactUs = ({ navigation }) => {
  const [feedback, setFeedback] = useState('');
  const user = getAuth().currentUser;
  
  const userEmail = user ? user.email : 'Not logged in'; 

  const handleBackPress = () => {
    navigation.goBack();
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Contact Us</Text>
      </View>
      <View style={styles.content}>
        <Image source={require('../assets/ecomercado-icon.png')} style={styles.logo} />
        <Text style={styles.description}>
          We're here to help! If you have any questions or need assistance, please feel free to contact us.
        </Text>
        <View style={styles.contactInfoContainer}>
          <View style={styles.contactInfoItem}>
            <Icon name="envelope" size={24} color="#05652D" style={styles.contactInfoIcon} />
            <Text style={styles.contactInfoText}>ecomercadoapp@gmail.com</Text>
          </View>
          <View style={styles.contactInfoItem}>
            <Icon name="phone" size={24} color="#05652D" style={styles.contactInfoIcon} />
            <Text style={styles.contactInfoText}>09957092312</Text>
          </View>
          <View style={styles.contactInfoItem}>
            <Icon name="facebook" size={24} color="#05652D" style={styles.contactInfoIcon} />
            <Text style={styles.contactInfoText}>ECOMercado</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FCE9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#B2DFDB', 
    elevation: 3,
  },
  backButtonIcon: {
    marginRight: 15,
    color: '#004D40',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#004D40',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#004D40',
    textAlign: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  contactInfoContainer: {
    marginTop: 20,
    width: '100%',
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactInfoIcon: {
    marginRight: 10,
    color: '#004D40',
  },
  contactInfoText: {
    fontSize: 18,
    color: '#004D40',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#004D40',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#004D40',
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#E3FCE9', 
  },
  submitButton: {
    backgroundColor: '#004D40',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centeredView: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#004D40',
  },
  modalText: {
    fontSize: 16,
    color: '#004D40',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#004D40',
    elevation: 2,
  },
});

export default ContactUs;
