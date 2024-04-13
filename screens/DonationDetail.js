import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';;
import { db } from '../config/firebase';

const DonationDetail = ({ navigation, route }) => {
  const { donation } = route.params;
  const auth = getAuth();
  const user = auth.currentUser;

  const [displayPhoto, setDisplayPhoto] = useState(donation.photo);

  useEffect(() => {
    let timer;
    if (displayPhoto !== donation.photo) {
      timer = setTimeout(() => {
        setDisplayPhoto(donation.photo);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [displayPhoto, donation.photo]);

  const handleSelectSubPhoto = (photo) => {
    setDisplayPhoto(photo);
  };

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

    if (donation.donor_email === user.email) {
      Alert.alert("Error", "You can't request your own donation.");
      return;
    }

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
      <TouchableOpacity onPress={() => navigation.navigate('DonationImage', { imageUrl: displayPhoto })}>
        <Image source={{ uri: displayPhoto }} style={styles.donationImage} />
      </TouchableOpacity>
        </View>
        <View style={styles.subPhotosContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {donation.subPhotos.map((photo, index) => (
              <TouchableOpacity key={index} onPress={() => handleSelectSubPhoto(photo)}>
                <Image source={{ uri: photo }} style={styles.subPhoto} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
            <Text style={styles.infoName}>{donation.name}</Text>
          </View>
          <View style={styles.infoItem}>
          <Text style={styles.itemNames}>{donation.itemNames.join(' · ')}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="bookmark-o" size={20} color="#05652D" />
            <Text style={styles.infoCategory}>{donation.category} Bundle</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="balance-scale" size={20} color="#05652D" />
            <Text style={styles.infoText}>Weight: {donation.weight} kg</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="heart" size={20} color="#05652D" />
            <Text style={styles.infoText}>Purpose: {donation.purpose}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Icon name="commenting" size={20} color="#05652D" />
            <Text style={styles.infoText}>Message: {donation.message}</Text>
          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#f9f9f9', 
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      paddingHorizontal: 20,
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
      paddingVertical: 20,
      paddingHorizontal: 16,
  },
  donationImage: {
      width: '100%',
      height: 300, 
      borderRadius: 10,
      resizeMode: 'cover',
      marginBottom: 20,
  },
  infoContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      marginBottom: 20,
  },
  infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
  },
  infoIcon: {
      marginRight: 10,
      color: '#05652D',
      fontSize: 24, 
  },
  infoLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
  },
  infoText: {
      fontSize: 16, 
      color: '#666',
      flex: 1, 
      marginLeft: 5,
  },
  infoName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 5,
  },
  itemNames: {
      fontSize: 16,
      color: '#000',
  },
  divider: {
      height: 1,
      backgroundColor: '#e1e1e1',
      marginVertical: 15,
  },
  navbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: '#FFF',
      borderTopWidth: 1,
      borderColor: '#e1e1e1',
  },
  navbarIconContainer: {
      alignItems: 'center',
      padding: 10,
      borderRadius: 30,
  },
  navbarIcon: {
      color: '#05652D',
      marginBottom: 4,
  },
  navbarLabel: {
      color: '#05652D',
      fontSize: 14,
  },
  buyNowButton: {
      backgroundColor: '#05652D',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
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
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
  },
  closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      color: '#05652D',
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
      width: '90%', 
      height: '70%',
  },
  centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  infoCategory: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#ECECEC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start', 
    overflow: 'hidden', 
    marginVertical: 4, 
    marginHorizontal: 2, 
    textAlign: 'center',
  },
  subPhotosContainer: {
    flexDirection: 'row', 
    marginTop: 10,
    paddingBottom: 20, 
  },
  subPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10, 
    resizeMode: 'cover', 
  },
});
  
  export default DonationDetail;
