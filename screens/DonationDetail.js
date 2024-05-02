import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';;
import { db } from '../config/firebase';
import moment from 'moment';

const DonationDetail = ({ navigation, route }) => {
  const { donation } = route.params;
  const auth = getAuth();
  const user = auth.currentUser;

  const handleVisitDOnor = () => {
    navigation.navigate('UserVisit', { email: donation.donor_email });
  };

  const [donorName, setDonorName] = useState('');
  const donorEmail = donation.donor_email; 

  useEffect(() => {
    const fetchDonorName = async () => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', donorEmail));
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setDonorName(`${userData.firstName} ${userData.lastName}`);
        } else {
          console.log('No user found with that email');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (donorEmail) {
      fetchDonorName();
    }
  }, [donorEmail]);

  const DonorDetailsCard = () => (
    <View style={styles.sellerCard}>
      <Text style={styles.sellerCardHeader}>{donorName}</Text>
      <Text style={styles.sellerCardSubtext}>{donation.donor_email}</Text>
      <View style={styles.sellerCardRow}>
        <Icon name="map-marker" size={16} color="#05652D" />
        <Text style={styles.sellerCardAddress}>{donation.location}</Text>
      </View>
      <TouchableOpacity style={styles.visitButton} onPress={handleVisitDOnor}>
        <Text style={styles.visitButtonText}>Visit</Text>
      </TouchableOpacity>
    </View>
  );

  const [displayPhoto, setDisplayPhoto] = useState(donation.photo);

  const addDonationWishlistIcon = require('../assets/hand.png');
  const addDonationWishlistIcon2 = require('../assets/hand1.png');

  const handleAddToWishlist = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    // Cannot wishlist your own donation
    if (donation.donor_email === user.email) {
      Alert.alert("Error", "You cannot add your own donation to the wishlist.");
      return;
    }
  
    const wishlistRef = doc(db, 'wishlists', user.email);
    
    try {
      const docSnap = await getDoc(wishlistRef);
      let updatedWishItems = [];
  
      if (docSnap.exists()) {
        const existingWishItems = docSnap.data().wishItems || [];
        const isItemInWishlist = existingWishItems.some(wishItem => wishItem.donationId === donation.id);
      
        if (!isItemInWishlist) {
          updatedWishItems = [...existingWishItems, {
            donationId: donation.id,
            name: donation.name,
            photo: donation.photo,
            category: donation.category,
            purpose: donation.purpose,
            donor_email: donation.donor_email,
            location: donation.location,
            dateListed: new Date()

          }];
          await updateDoc(wishlistRef, { wishItems: updatedWishItems });
          console.log('Donation added to wishlist');
        } else {
          console.log('Donation is already in the wishlist');
          Alert.alert('Donation is already in your wishlist.');
        }
      } else {
        updatedWishItems = [{
          donationId: donation.id,
          name: donation.name,
          photo: donation.photo,
          category: donation.category,
          purpose: donation.purpose,
          donor_email: donation.donor_email,
          location: donation.location,
          dateListed: new Date()
        }];
        await setDoc(wishlistRef, {
          userEmail: user.email,
          wishItems: updatedWishItems
        });
        console.log('Donation added to wishlist');
      }
      navigation.navigate('DonationWishlist');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
  };
  


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
  
      const chatMessage = `${requesterEmail} is interested in the donation: ${donation.name}`;
  
      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: donorEmail,
          donationDetails: { name: donation.name, donationId: donation.id, initialMessage: chatMessage }
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
          donationDetails: { name: donation.name, donationId: donation.id, initialMessage: chatMessage }
        });
      }
    } catch (error) {
      console.error('Error in handleChatWithDonor:', error);
    }
  };
  
  const handleRequestNowPress = async () => {
    if (!user) {
      Alert.alert("Error", "You need to be logged in to make a request.");
      return;
    }
  
    const donationData = {
      id: donation.id,
      name: donation.name,
      photo: donation.photo,
      donor_email: donation.donor_email,
      location: donation.location,
      weight: donation.weight,
      category: donation.category,
      purpose: donation.purpose,
      itemNames: donation.itemNames || []
    };
  
    try {
      const donationRef = doc(db, 'donation', donation.id);
      const donationDoc = await getDoc(donationRef);
      if (donationDoc.exists()) {
        navigation.navigate('RequestCheckout', {
          selectedDonations: [donationData],
        });
      } else {
        Alert.alert("Error", "Donation details are not available at the moment.");
      }
    } catch (error) {
      console.error("Error retrieving donation details:", error);
      Alert.alert("Error", "Failed to retrieve donation details.");
    }
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
            <TouchableOpacity onPress={handleAddToWishlist}>
            <Image source={addDonationWishlistIcon} style={styles.wishlistIcon} />
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
        <DonorDetailsCard />
      </ScrollView>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={handleChatWithDonor} style={styles.navbarIconContainer}>
          <Icon name="comment" size={24} color="#05652D" />
          <Text style={styles.navbarLabel}>Chat with Donor</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddToWishlist} style={styles.navbarIconContainer}>
          <Image source={addDonationWishlistIcon2} style={styles.navbarIcon} />
          <Text style={styles.navbarLabel}>Add to Wishlist</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRequestNowPress} style={[styles.navbarIconContainer, styles.requestNowButton]}>
          <Text style={styles.requestNowLabel}>Request Now</Text>
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
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  navbarIcon: {
    width: 24,
    height: 24,  
    marginBottom: 4,
  },
  requestNowButton: {
    backgroundColor: '#05652D',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  requestNowLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navbarLabel: {
    fontSize: 14,
    color: '#05652D',
  },
  wishlistIcon: {
    width: 24,
    height: 24,  
    marginBottom: 4, 
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
  wishlistIcon: {
    width: 32,
    height: 32,
    marginLeft: 15,
  },
  wishlistIcon1: {
    width: 24,
    height: 24,
  },
  sellerCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sellerCardHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sellerCardSubtext: {
    fontSize: 16,
    color: '#666',
  },
  sellerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sellerCardAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  visitButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#05652D',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  visitButtonText: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
  
  export default DonationDetail;
