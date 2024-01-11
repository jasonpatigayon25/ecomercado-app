import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';;
import { db } from '../config/firebase';

const DonationDetail = ({ navigation, route }) => {
  const { donation } = route.params;
  const auth = getAuth();
  const user = auth.currentUser;

  const [modalVisible, setModalVisible] = React.useState(false);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleChatWithDonor = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    if (donation.donor_email === user.email) {
      Alert.alert("Error", "You are trying to chat about your donation.");
      return;
    }
  
    const donorEmail = donation.donor_email;
    const requesterEmail = user.email;
  
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('users', 'array-contains', requesterEmail));
      const querySnapshot = await getDocs(q);
  
      let existingChatId = null;
  
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(donorEmail)) {
          existingChatId = doc.id;
        }
      });
  
      const chatMessage = requesterEmail === user.email 
                           ? `Interested in donation: ${donation.name}` 
                           : `${user.displayName || 'A user'} is interested in your donation: ${donation.name}`;
  
      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: donorEmail,
          donationDetails: { name: donation.name, imageUrl: donation.photo, initialMessage: chatMessage }
        });
      } else {
        const newChatRef = collection(db, 'chats');
        const newChatDoc = {
          users: [requesterEmail, donorEmail],
          messages: [],
        };
        const docRef = await addDoc(newChatRef, newChatDoc);
        navigation.navigate('Chat', {
          chatId: docRef.id,
          receiverEmail: donorEmail,
          donationDetails: { name: donation.name, imageUrl: donation.photo, initialMessage: chatMessage }
        });
      }
    } catch (error) {
      console.error('Error in handleChatWithDonor:', error);
    }
  };
  
  const handleRequestNowPress = () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    if (donation.isDonated) {
      Alert.alert("Unavailable", "This donation has already been donated.");
      return;
    }
  
    // Check if the current user is trying to request their own donation
    if (donation.donor_email === user.email) {
      Alert.alert("Error", "You can't request your own donation.");
      return;
    }
  
    // Navigate to the RequestDonationScreen if the user is not requesting their own donation
    navigation.navigate('RequestDonationScreen', { donation });
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress}>
            <Icon name="arrow-left" size={24} color="#05652D" style={styles.backIcon} />
            </TouchableOpacity>
            <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={handleChatWithDonor}>
                <Icon name="comment" size={24} color="#05652D" style={styles.icon} />
            </TouchableOpacity>
            </View>
        </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Image source={{ uri: donation.photo }} style={styles.donationImage} />
          </TouchableOpacity>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoName}>{donation.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="map-marker" size={20} color="#05652D" style={styles.infoIcon} />
            <Text style={styles.infoText}>{donation.location}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="user" size={20} color="#05652D" style={styles.infoIcon} />
            <Text style={styles.infoText}>{donation.donor_email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Icon name="info-circle" size={20} color="#05652D" style={styles.infoIcon} />
            <Text style={[styles.infoLabel, styles.boldText]}>Message:</Text>
          </View>
          <Text style={styles.descriptionText}>
            {donation.message}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.navbar}>
         <TouchableOpacity onPress={handleChatWithDonor}>
          <View style={styles.navbarIconContainer}>
            <Icon name="comment" size={24} color="#05652D" style={styles.navbarIcon} />
            <Text style={styles.navbarLabel}>Chat with Donor</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRequestNowPress} style={[styles.navbarIconContainer, styles.buyNowButton]}>
        <Text style={styles.buyNowLabel}>Request Now</Text>
      </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Image source={{ uri: donation.photo }} style={styles.fullImage} />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Icon name="close" size={24} color="#05652D" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f2f2f2',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 20,
      width: '100%',
      backgroundColor: '#05652D',
    },
    backIcon: {
      color: '#FFF', 
    },
    iconsContainer: {
      flexDirection: 'row',
    },
    content: {
      flexGrow: 1,
      padding: 16,
    },
    donationImage: {
      width: '100%',
      height: 250,
      borderRadius: 8,
      resizeMode: 'cover',
      marginBottom: 16,
    },
    infoContainer: {
      backgroundColor: '#FFF',
      borderRadius: 8,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
      marginBottom: 16,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoIcon: {
      marginRight: 8,
      color: '#05652D', 
    },
    infoLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333', 
    },
    infoText: {
      fontSize: 14,
      color: '#666',
    },
    infoPrice: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#05652D', 
    },
    infoCategory: {
      fontSize: 18,
      color: '#666',
    },
    infoName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
    },
    divider: {
      height: 1,
      backgroundColor: '#e1e1e1',
      marginVertical: 12,
    },
    descriptionText: {
      fontSize: 16,
      color: '#666',
    },
    navbar: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderColor: '#e1e1e1',
    },
    navbarIconContainer: {
      alignItems: 'center',
      padding: 8,
      backgroundColor: '#fff',
      borderRadius: 20,
    },
    navbarIcon: {
      color: '#05652D',
    },
    navbarLabel: {
      color: '#05652D',
      fontSize: 12,
      marginTop: 4,
    },
    buyNowButton: {
      backgroundColor: '#05652D',
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 30,
    },
    buyNowLabel: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    icon: {
      color: '#FFF', 
      marginLeft: 15,
    },
    fullImage: {
      width: 340,
      height: 340,
      resizeMode: 'contain',
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      color: '#05652D',
    },
    textStyle: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
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
      shadowRadius: 4,
      elevation: 5,
      width: '100%', 
      height: '60%',
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    ratingModalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
    },
    ratingModalView: {
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      paddingTop: 20, 
      paddingBottom: 20, 
      paddingHorizontal: 20, 
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    ratingInput: {
      borderBottomWidth: 1,
      borderBottomColor: '#f2f2f2',
      width: '100%',
      padding: 10,
      marginBottom: 20,
    },
    ratingMessageInput: {
      width: '100%',
      height: 100,
      padding: 10,
      borderWidth: 1,
      borderColor: '#f2f2f2',
      marginBottom: 20,
      textAlignVertical: 'top',
    },
    ratingSubmitButton: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
      backgroundColor: "#05652D",
    },
    ratingCancelButton: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
      backgroundColor: "#cccccc",
      marginTop: 10,
    },
    buttonTextStyle: {
      color: "white",
      fontWeight: "bold",
      textAlign: "center"
    },
    ratingCenteredView: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    rateSellerButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: '#FFD700',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
    rateSellerButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 5,
    },
    rateIcon: {
      color: '#fff',
    },
      productNameWithRate: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    imageContainer: {
      position: 'relative',
    },
  });
  
  
  export default DonationDetail;
