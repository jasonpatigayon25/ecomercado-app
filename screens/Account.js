import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Alert } from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { query, where, getDocs, doc, getDoc, collection } from 'firebase/firestore';
import { db, usersCollection } from '../config/firebase';
import { useFocusEffect } from '@react-navigation/native'; 
import { Rating } from 'react-native-ratings';

const Account = ({ navigation }) => {

  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [receivingCount, setReceivingCount] = useState(0);

  const [pendingSCount, setPendingSCount] = useState(0);
  const [approvedSCount, setApprovedSCount] = useState(0);
  const [receivingSCount, setReceivingSCount] = useState(0);

  const [pendingRCount, setPendingRCount] = useState(0);
  const [approvedRCount, setApprovedRCount] = useState(0);
  const [receivingRCount, setReceivingRCount] = useState(0);

  const [pendingDCount, setPendingDCount] = useState(0);
  const [approvedDCount, setApprovedDCount] = useState(0);
  const [receivingDCount, setReceivingDCount] = useState(0);

  const [carouselIndexOrders, setCarouselIndexOrders] = useState(0);
  const [carouselIndexSeller, setCarouselIndexSeller] = useState(0);
  const [carouselIndexRequests, setCarouselIndexRequests] = useState(0);
  const [carouselIndexDonor, setCarouselIndexDonor] = useState(0);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const sellerManagementIcon = require('../assets/seller-management.png');
  const donationManagementIcon = require('../assets/donation-management.png');
  const orderIcon = require('../assets/order-history.png');
  const requestIcon = require('../assets/donation-history.png');
  
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchOrdersData();
      fetchOrdersSellerData();
      fetchRequestsData();
      fetchRequestsDonorData();
      const intervalOrders = setInterval(() => {
        cycleCarouselOrders();
      }, 3000);

      const intervalSeller = setInterval(() => {
        cycleCarouselSeller();
      }, 3000);

      const intervalRequests = setInterval(() => {
        cycleCarouselRequests();
      }, 3000);

      const intervalDonor = setInterval(() => {
        cycleCarouselDonor();
      }, 3000);

      return () => {
        clearInterval(intervalOrders);
        clearInterval(intervalSeller);
        clearInterval(intervalRequests);
        clearInterval(intervalDonor);
      };
    }
  }, [user]);

  const cycleCarouselOrders = () => {
    setCarouselIndexOrders((prevIndex) => (prevIndex + 1) % 3);
  };

  const cycleCarouselSeller = () => {
    setCarouselIndexSeller((prevIndex) => (prevIndex + 1) % 3);
  };

  const cycleCarouselRequests = () => {
    setCarouselIndexRequests((prevIndex) => (prevIndex + 1) % 3);
  };

  const cycleCarouselDonor = () => {
    setCarouselIndexDonor((prevIndex) => (prevIndex + 1) % 3);
  };

  const fetchOrdersData = async () => {
    if (user) {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('buyerEmail', '==', user.email)
      );

      try {
        const querySnapshot = await getDocs(ordersQuery);
        let pending = 0;
        let approved = 0;
        let receiving = 0;

        querySnapshot.forEach(doc => {
          const order = doc.data();
          if (order.status === 'Pending') pending++;
          else if (order.status === 'Approved') approved++;
          else if (order.status === 'Receiving') receiving++;
        });

        setPendingCount(pending);
        setApprovedCount(approved);
        setReceivingCount(receiving);
      } catch (error) {
        console.error('Error fetching orders data:', error);
      }
    }
  };

  const fetchOrdersSellerData = async () => {
    if (user) {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('sellerEmail', '==', user.email)
      );

      try {
        const querySnapshot = await getDocs(ordersQuery);
        let pending = 0;
        let approved = 0;
        let receiving = 0;

        querySnapshot.forEach(doc => {
          const order = doc.data();
          if (order.status === 'Pending') pending++;
          else if (order.status === 'Approved') approved++;
          else if (order.status === 'Receiving') receiving++;
        });

        setPendingSCount(pending);
        setApprovedSCount(approved);
        setReceivingSCount(receiving);
      } catch (error) {
        console.error('Error fetching orders data:', error);
      }
    }
  };

  const fetchRequestsData = async () => {
    if (user) {
      const requestsQuery = query(
        collection(db, 'requests'),
        where('requesterEmail', '==', user.email)
      );

      try {
        const querySnapshot = await getDocs(requestsQuery);
        let pending = 0;
        let approved = 0;
        let receiving = 0;

        querySnapshot.forEach(doc => {
          const request = doc.data();
          if (request.status === 'Pending') pending++;
          else if (request.status === 'Approved') approved++;
          else if (request.status === 'Receiving') receiving++;
        });

        setPendingRCount(pending);
        setApprovedRCount(approved);
        setReceivingRCount(receiving);
      } catch (error) {
        console.error('Error fetching orders data:', error);
      }
    }
  };

  const fetchRequestsDonorData = async () => {
    if (user) {
      const requestsQuery = query(
        collection(db, 'requests'),
        where('donorEmail', '==', user.email)
      );
  
      try {
        const querySnapshot = await getDocs(requestsQuery);
        let pending = 0;
        let approved = 0;
        let receiving = 0;
  
        querySnapshot.forEach(doc => {
          const request = doc.data();
          if (request.status === 'Pending') pending++;
          if (request.status === 'Approved') approved++;
          if (request.status === 'Receiving') receiving++;
        });
  
        setPendingDCount(pending);
        setApprovedDCount(approved);
        setReceivingDCount(receiving);
      } catch (error) {
        console.error('Error fetching donor data:', error);
      }
    }
  };

const cycleCarousel = () => {
  setCarouselIndex((carouselIndex + 1) % 3);
};

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
        fetchFollowersCount(); 
        fetchFollowingCount(); 
    }, [user])
);

  const fetchFollowersCount = async () => {
    if (user) {
        const subscribersQuery = query(
            collection(db, "subscriptions"), 
            where("subscribedTo_email", "==", user.email)
        );
        try {
            const querySnapshot = await getDocs(subscribersQuery);
            setFollowersCount(querySnapshot.size); 
        } catch (error) {
            console.error("Error fetching subscriber count:", error);
        }
    }
};

const fetchFollowingCount = async () => {
  if (user) {
      const followingQuery = query(
          collection(db, "subscriptions"), 
          where("subscriber_email", "==", user.email)
      );
      try {
          const querySnapshot = await getDocs(followingQuery);
          setFollowingCount(querySnapshot.size); 
      } catch (error) {
          console.error("Error fetching following count:", error);
      }
  }
};


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
    navigation.navigate('DonorManagement');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrderHistory');
  };

  const handleRequestApproval = () => {
    navigation.navigate('RequestHistory');
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
        <View style={styles.followerFollowingContainer}>
            <Text style={styles.followText}>Followers: <Text style={styles.countText}>{followersCount}</Text></Text>
            <Text style={styles.followText}>Following: <Text style={styles.countText}>{followingCount}</Text></Text>
        </View>
          </View>
      </View>
        <View style={styles.divider} />
        <Text style={styles.settingTitle}>My Transactions</Text>
        <View style={styles.optionsContainer}>
        <View style={styles.transactionsRow}>
          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleSellerManagement}>
            <View style={styles.optionIconContainer}>
              <Image source={sellerManagementIcon} style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>Seller Management</Text>
            <TouchableOpacity style={styles.carouselContainer} onPress={cycleCarousel}>
            <Text style={styles.carouselText}>
              {carouselIndexSeller  === 0 && pendingSCount > 0 && `${pendingSCount} To Approve`}
              {carouselIndexSeller  === 1 && approvedSCount > 0 && `${approvedSCount} To Deliver`}
              {carouselIndexSeller  === 2 && receivingSCount> 0 && `${receivingSCount} Delivered`}
            </Text>
          </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleDonationManagement}>
            <View style={styles.optionIconContainer}>
              <Image source={donationManagementIcon} style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>Donation Management</Text>
            <TouchableOpacity style={styles.carouselContainer} onPress={cycleCarousel}>
            <Text style={styles.carouselText}>
              {carouselIndexDonor === 0 && pendingDCount > 0 && `${pendingDCount} To Approve`}
              {carouselIndexDonor === 1 && approvedDCount > 0 && `${approvedDCount} To Deliver`}
              {carouselIndexDonor === 2 && receivingDCount > 0 && `${receivingDCount} Delivered`}
            </Text>

            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsRow}>
          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleOrderHistory}>
            <View style={styles.optionIconContainer}>
              <Image source={orderIcon} style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>My Order Transactions</Text>
            <TouchableOpacity style={styles.carouselContainer} onPress={cycleCarousel}>
            <Text style={styles.carouselText}>
              {carouselIndexOrders  === 0 && pendingCount > 0 && `${pendingCount} To Pay`}
              {carouselIndexOrders  === 1 && approvedCount > 0 && `${approvedCount} To Deliver`}
              {carouselIndexOrders  === 2 && receivingCount > 0 && `${receivingCount} To Receive`}
            </Text>
          </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={handleRequestApproval}>
            <View style={styles.optionIconContainer}>
              <Image source={requestIcon} style={styles.transactionsIcon} />
            </View>
            <Text style={styles.optionLabel}>Donation Request Transactions</Text>
            <TouchableOpacity style={styles.carouselContainer} onPress={cycleCarousel}>
            <Text style={styles.carouselText}>
              {carouselIndexRequests  === 0 && pendingRCount > 0 && `${pendingRCount} To Approve`}
              {carouselIndexRequests  === 1 && approvedRCount > 0 && `${approvedRCount} To Deliver`}
              {carouselIndexRequests  === 2 && receivingRCount > 0 && `${receivingRCount} To Receive`}
            </Text>
            </TouchableOpacity>
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
    marginBottom: 15,
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
  followText: {
    fontSize: 12,
    color: 'black', 
},
countText: {
    color: '#05652D', 
    fontWeight: 'bold'
},
followerFollowingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
},
carouselContainer: {
  position: 'absolute',
  top: -8,
  right: 0,
  backgroundColor: '#05652D',
  paddingVertical: 5,
  paddingHorizontal: 5,
  borderTopEndRadius: 20,
  borderBottomStartRadius: 20,
},

carouselText: {
  color: '#FFFFFF',
  fontSize: 10,
},
});

export default Account;
