import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Alert } from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, usersCollection } from '../config/firebase';
import { useFocusEffect } from '@react-navigation/native'; 
import { Rating } from 'react-native-ratings';

const Account = ({ navigation }) => {

  const marketIcon = require('../assets/market.png');
  const donationIcon = require('../assets/donation.png');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  const [averageRating, setAverageRating] = useState(0)

  const fetchUserDetails = async () => {
    setLoading(true);
    if (user) {
      console.log(`Fetching details for user email: ${user.email}`);
      const q = query(usersCollection, where("email", "==", user.email));

      const userAvgRatingRef = doc(db, 'userAverageRating', user.email);
      const userAvgRatingDoc = await getDoc(userAvgRatingRef);
      if (userAvgRatingDoc.exists()) {
        setAverageRating(userAvgRatingDoc.data().averageRating);
      }
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setProfile({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            photoUrl: userData.photoUrl || '',
          });
        } else {
          console.log("No user profile found for email:", user.email);
        }
      } catch (error) {
        console.error("Error fetching user profile by email:", error);
      }
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserDetails();
    }, [user])
  );

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSellerManagement = () => {
    navigation.navigate('SellerManagement');
  };

  const handleDonationManagement = () => {
    navigation.navigate('DonationManagement');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrderHistory');
  };

  const handleRequestApproval = () => {
    navigation.navigate('RequestApproval');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Log Out',
          style: 'destructive',
          onPress: async () => {
            const auth = getAuth();
            try {
              await signOut(auth);
              navigation.navigate('Login');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content2}>
        <View style={styles.accountInfoContainer}>
          <TouchableOpacity style={styles.editIconContainer} onPress={handleEditProfile}> 
            <Icon name="edit" size={20} color="#05652D" style={styles.editIcon} />
          </TouchableOpacity>
          <View style={styles.profileImageContainer}>
            {profile.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileImageIcon}>{getInitials(profile.firstName, profile.lastName)}</Text>
            )}
          </View>
          <View>
            <Text style={styles.name}>{`${profile.firstName} ${profile.lastName}`}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <View>
              <Rating
                type="star"
                ratingCount={5}
                imageSize={20}
                readonly
                startingValue={averageRating}
                style={styles.rating}
              />
              <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.settingTitle}>My Transactions</Text>
        <View style={styles.optionsContainer}>
        <View style={styles.transactionsRow}>
          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleSellerManagement}>
            <View style={styles.optionIconContainer}>
              <Image source={marketIcon} style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>Seller Management</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleDonationManagement}>
            <View style={styles.optionIconContainer}>
              <Image source={donationIcon} style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>Donation Management</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsRow}>
          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleOrderHistory}>
            <View style={styles.optionIconContainer}>
              <Icon name="history" size={25} color="#05652D" style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>My Order Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleRequestApproval}>
            <View style={styles.optionIconContainer}>
              <Icon name="check-circle" size={25} color="#05652D" style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>Donation Requests Approval</Text>
          </TouchableOpacity>
        </View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.settingTitle}>Settings</Text>
        <View style={styles.settingsContainer}>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('HelpCenter')}>
            <Icon name="question-circle" size={25} color="#05652D" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Help Center</Text>
            <Icon name="angle-right" size={25} color="#05652D" style={styles.settingArrowIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('ChangePassword')}>
            <Icon name="lock" size={25} color="#05652D" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Change Password</Text>
            <Icon name="angle-right" size={25} color="#05652D" style={styles.settingArrowIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <Icon name="sign-out" size={25} color="#05652D" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>Log Out</Text>
              <Icon name="angle-right" size={25} color="#05652D" style={styles.settingArrowIcon} />
            </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 3,
  },
  backButtonIcon: {
    marginRight: 15,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content2: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  optionsContainer: {
    flexGrow: 1,
    padding: 20,
  },
  accountInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,

  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginRight: 20,
    backgroundColor: '#808080'
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#E3FCE9',
    borderRadius: 20,
    padding: 5,
  },
  editIcon: {
    color: '#05652D',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D', 
  },
  email: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#05652D',
  },
  settingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 15, 
    paddingHorizontal: 20, 
  },
  divider: {
    height: 1,
    backgroundColor: '#D3D3D3',
    marginVertical: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 18,
    color: '#05652D',
    flex: 1,
  },
  optionArrowIcon: {
    color: '#05652D',
  },
  settingIcon: {
    marginRight: 20,
    color: '#05652D',
  },
  transactionsIcon: {
    marginRight: 20,
    width: 30,
    height: 30,
  },
  settingsContainer: {
    //
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    marginRight: 15,
    color: '#05652D',
    fontSize: 24,
  },
  settingLabel: {
    fontSize: 18,
    flex: 1,
    color: '#05652D',
  },
  settingArrowIcon: {
    color: '#05652D',
    fontSize: 24,
  },
  profileImageIcon: {
    fontSize: 40, 
    color: '#FFFFFF',
    fontWeight: 'bold',
    backgroundColor: '#05652D', 
    width: 100, 
    height: 100, 
    borderRadius: 50,
    textAlign: 'center',
    lineHeight: 100, 
    alignSelf: 'center', 
  },
  transactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  optionItemCube: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  
  halfWidth: {
    width: '48%', 
  },
  
  optionIconContainer: {
    marginBottom: 5, 
  },
  
  transactionsIcon: {
    width: 30,
    height: 30,
  },
  
  optionLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: '#05652D',
  },
});

export default Account;
