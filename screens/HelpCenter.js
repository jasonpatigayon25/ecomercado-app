import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Button, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { feedbackCollection, db } from '../config/firebase';
import { addDoc, serverTimestamp, collection } from 'firebase/firestore';
import HC11 from '../modals/HC11';
import HC12 from '../modals/HC12';
import HC13 from '../modals/HC13';
import HC14 from '../modals/HC14';
import HC21 from '../modals/HC21';
import HC22 from '../modals/HC22';
import HC23 from '../modals/HC23';
import HC24 from '../modals/HC24';
import HC31 from '../modals/HC31';
import HC32 from '../modals/HC32';
import HC33 from '../modals/HC33';
import HC34 from '../modals/HC34';

const HelpCenter = ({ navigation }) => {
  const [concern, setConcern] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const user = getAuth().currentUser;
  const userEmail = user ? user.email : 'Not logged in';
  const notificationForAdminCollection = collection(db, 'notificationForAdmin');

  const [isHC11Visible, setHC11Visible] = useState(false);
  const [isHC12Visible, setHC12Visible] = useState(false);
  const [isHC13Visible, setHC13Visible] = useState(false);
  const [isHC14Visible, setHC14Visible] = useState(false);
  const [isHC21Visible, setHC21Visible] = useState(false);
  const [isHC22Visible, setHC22Visible] = useState(false);
  const [isHC23Visible, setHC23Visible] = useState(false);
  const [isHC24Visible, setHC24Visible] = useState(false);
  const [isHC31Visible, setHC31Visible] = useState(false);
  const [isHC32Visible, setHC32Visible] = useState(false);
  const [isHC33Visible, setHC33Visible] = useState(false);
  const [isHC34Visible, setHC34Visible] = useState(false);

  const handleOpenModal = () => {
    if (concern.trim() !== '') {
      setModalVisible(true);
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      await addDoc(feedbackCollection, {
        email: userEmail,
        description: concern,
        timestamp: serverTimestamp(),
      });

      const notificationText = `${userEmail} added feedback and concerns`;
      await addDoc(notificationForAdminCollection, {
        user: userEmail,
        text: notificationText,
        timestamp: serverTimestamp(),
      });

      setModalVisible(false);
      setConcern('');
      Alert.alert(
        "Submission Successful",
        "Your concern has been submitted successfully!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error submitting concern: ", error);
      Alert.alert("Error", "Failed to submit concern.");
    }
  };
  
  const handleCancelSubmit = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>How can we help you?</Text>

        <View style={styles.submitConcernContainer}>
          <View style={styles.iconContainer}>
            <Icon name="envelope" size={24} color="#05652D" style={styles.icon} />
          </View>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Report your concerns by leaving a message"
              placeholderTextColor="#999999"
              value={concern}
              onChangeText={setConcern}
              multiline
            />
            <View style={styles.underline} />
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleOpenModal}>
            <Icon name="paper-plane" size={24} color="#FFF" style={styles.submitIcon} />
          </TouchableOpacity>
        </View>
        <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Confirm Submission</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                Are you sure you want to submit the following concern?
              </Text>
              <Text style={styles.userConcern}>{concern}</Text>
            </ScrollView>
            <View style={styles.modalButtonContainer}>
              <Button title="Yes, Submit" color="#05652D" onPress={handleConfirmSubmit} />
            <View style={styles.modalButtonContainer}></View>
              <Button title="Cancel" color="gray" onPress={handleCancelSubmit} />
            </View>
          </View>
        </View>
      </Modal>
        <View style={styles.helpListContainer}>
          <View style={styles.helpListSection}>
            <Text style={styles.helpListSectionTitle}>GETTING STARTED</Text>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC11Visible(true)}>
              <Text style={styles.helpListItemText}>How to create an account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC12Visible(true)}>
              <Text style={styles.helpListItemText}>How to browse and search for products</Text>
            </TouchableOpacity>
          </View>

          {/* <View style={styles.helpListSection}>
            <Text style={styles.helpListSectionTitle}>MANAGING YOUR ACCOUNT</Text>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC21Visible(true)}>
              <Text style={styles.helpListItemText}>How to update your profile information</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC22Visible(true)}>
              <Text style={styles.helpListItemText}>How to reset your password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC23Visible(true)}>
              <Text style={styles.helpListItemText}>How to manage notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC24Visible(true)}>
              <Text style={styles.helpListItemText}>How to view activity history</Text>
            </TouchableOpacity>
          </View> */}

          <View style={styles.helpListSection}>
            <Text style={styles.helpListSectionTitle}>BUYING, SELLING, AND DONATING</Text>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC31Visible(true)}>
              <Text style={styles.helpListItemText}>How to buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC32Visible(true)}>
              <Text style={styles.helpListItemText}>How to sell</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC33Visible(true)}>
              <Text style={styles.helpListItemText}>How to donate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpListItem} onPress={() => setHC34Visible(true)}>
              <Text style={styles.helpListItemText}>How to chat with a seller</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <HC11 visible={isHC11Visible} onClose={() => setHC11Visible(false)} />
      <HC12 visible={isHC12Visible} onClose={() => setHC12Visible(false)} />
      <HC13 visible={isHC13Visible} onClose={() => setHC13Visible(false)} />
      <HC14 visible={isHC14Visible} onClose={() => setHC14Visible(false)} />
      <HC21 visible={isHC21Visible} onClose={() => setHC21Visible(false)} />
      <HC22 visible={isHC22Visible} onClose={() => setHC22Visible(false)} />
      <HC23 visible={isHC23Visible} onClose={() => setHC23Visible(false)} />
      <HC24 visible={isHC24Visible} onClose={() => setHC24Visible(false)} />
      <HC31 visible={isHC31Visible} onClose={() => setHC31Visible(false)} />
      <HC32 visible={isHC32Visible} onClose={() => setHC32Visible(false)} />
      <HC33 visible={isHC33Visible} onClose={() => setHC33Visible(false)} />
      <HC34 visible={isHC34Visible} onClose={() => setHC34Visible(false)} />
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'center',

    marginBottom: 10,
  },
  submitConcernContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    backgroundColor: '#DCF8C6',
    borderRadius: 30,
    padding: 10,
  },
  icon: {
    fontSize: 20,
    color: '#05652D',
  },
  textInputContainer: {
    flex: 1,
    marginLeft: 10,
    position: 'relative',
  },
  textInput: {
    fontSize: 16,
    color: '#05652D',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#05652D',
    opacity: 0.2,
  },
  submitButton: {
    backgroundColor: '#05652D',
    borderRadius: 30,
    padding: 10,
  },
  submitIcon: {
    fontSize: 20,
    color: '#FFF',
  },
  helpListContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  helpListSection: {
    marginBottom: 20,
  },
  helpListSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'center',
    marginBottom: 10,
  },
  helpListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  helpListItemText: {
    fontSize: 16,
    color: '#05652D',
    backgroundColor: '#E3EDE5',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  modalScrollView: {
    maxHeight: 200,
    width: '100%',
  },
  userConcern: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    backgroundColor: '#f0f0f0', 
    padding: 10,
    borderRadius: 5,
  },
});

export default HelpCenter;
