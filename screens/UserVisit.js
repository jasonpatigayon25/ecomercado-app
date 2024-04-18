import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert} from 'react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { Rating } from 'react-native-ratings';
import { getAuth } from 'firebase/auth';

const UserVisit = ({ route, navigation }) => {

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const backgroundUserIcon = require('../assets/background-user.webp'); 
  const [backgroundImage, setBackgroundImage] = useState(require('../assets/background-user.webp')); // Default background image


  useEffect(() => {
    const fetchCounts = async () => {
        if (email) {

            const followersQuery = query(collection(db, 'subscriptions'), where('subscribedTo_email', '==', email));
            const followersSnapshot = await getDocs(followersQuery);
            setFollowersCount(followersSnapshot.size);

            const followingQuery = query(collection(db, 'subscriptions'), where('subscriber_email', '==', email));
            const followingSnapshot = await getDocs(followingQuery);
            setFollowingCount(followingSnapshot.size);
        }
    };

    fetchCounts();
}, [email]);

  const [profile, setProfile] = useState({});
  const [averageRating, setAverageRating] = useState(0);
  const { email } = route.params;
  const [products, setProducts] = useState([]);
  const [donation, setDonations] = useState([]);
  
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isDonationsLoading, setIsDonationsLoading] = useState(true);

  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const auth = getAuth();
  const user = auth.currentUser;
  const currentUserEmail = user ? user.email : null;

  const [showSubscriptionMessage, setShowSubscriptionMessage] = useState(false);
  const [showUnsubscribeMessage, setShowUnsubscribeMessage] = useState(false);

  const handleSubscribe = async () => {
    if (!currentUserEmail) {
      console.warn("No user logged in");
      return;
    }
  
    const subscriptionRef = collection(db, 'subscriptions');
    await addDoc(subscriptionRef, {
      subscriber_email: currentUserEmail,
      subscribedTo_email: email
    });
    setIsSubscribed(true);
  
    setShowSubscriptionMessage(true);
    setTimeout(() => setShowSubscriptionMessage(false), 3000);
  };

  const handleUnsubscribe = async () => {
    if (!currentUserEmail) {
      console.warn("No user logged in");
      return;
    }
  
    const subscriptionQuery = query(collection(db, 'subscriptions'), where('subscriber_email', '==', currentUserEmail), where('subscribedTo_email', '==', email));
    const subscriptionSnapshot = await getDocs(subscriptionQuery);
    subscriptionSnapshot.forEach((doc) => {
      deleteDoc(doc.ref);
    });
    setIsSubscribed(false);
  
    setShowUnsubscribeMessage(true);
    setTimeout(() => setShowUnsubscribeMessage(false), 3000);
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      setIsProductsLoading(true);
      setIsDonationsLoading(true);

      const q = query(collection(db, 'users'), where('email', '==', email));
      const userQuerySnapshot = await getDocs(q);
      if (!userQuerySnapshot.empty) {
        const userData = userQuerySnapshot.docs[0].data();
        setProfile(userData);

        // Check if the user is a registered seller
        const registeredSellerQuery = query(collection(db, 'registeredSeller'), where('email', '==', email));
        const registeredSellerSnapshot = await getDocs(registeredSellerQuery);
        if (!registeredSellerSnapshot.empty) {
          const registeredSellerData = registeredSellerSnapshot.docs[0].data();
          setProfile({ ...userData, sellerName: registeredSellerData.sellerName });
          if (registeredSellerData.backgroundImage) {
            setBackgroundImage({ uri: registeredSellerData.backgroundImage });
          }
        }

        const averageRatingQuery = query(collection(db, 'userAverageRating'), where('email', '==', email));
        const averageRatingSnapshot = await getDocs(averageRatingQuery);
        if (!averageRatingSnapshot.empty) {
          const averageRatingData = averageRatingSnapshot.docs[0].data();
          setAverageRating(averageRatingData.averageRating || 0);
        }

        const productsQuery = query(collection(db, 'products'), where('seller_email', '==', email), orderBy('createdAt', 'desc'));
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);
        setIsProductsLoading(false);

        const donationsQuery = query(collection(db, 'donation'), where('donor_email', '==', email), orderBy('createdAt', 'desc'));
        const donationsSnapshot = await getDocs(donationsQuery);
        const donationsList = donationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDonations(donationsList);
        setIsDonationsLoading(false);
      } else {
        setIsProductsLoading(false);
        setIsDonationsLoading(false);
      }
    };

    fetchUserDetails();
  }, [email]);


  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!currentUserEmail) {
        console.warn("No user logged in");
        return;
      }

      const subscriptionQuery = query(collection(db, 'subscriptions'), where('subscriber_email', '==', currentUserEmail), where('subscribedTo_email', '==', email));
      const subscriptionSnapshot = await getDocs(subscriptionQuery);
      setIsSubscribed(!subscriptionSnapshot.empty);
    };

    checkSubscriptionStatus();
  }, [currentUserEmail, email]);

  const handleProductSelect = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleDonationSelect = (donation) => {
    navigation.navigate('DonationDetail', { donation });
  };
  
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={isSubscribed ? handleUnsubscribe : handleSubscribe} style={styles.subscribeButton}>
          <Icon name={isSubscribed ? "heart" : "heart-o"} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollableContent}>
        <View style={styles.profileHeader}>
          <Image source={backgroundImage} style={styles.profileBackground} />
        </View>

      <View style={styles.profileInfo}>
        <View style={styles.userPhotoContainer}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.userPhoto} />
          ) : (
            <Icon name="user" size={100} color="#05652D" />
          )}
        </View>
        <Text style={styles.sellerName}>{profile.sellerName}</Text> 
        <Text style={styles.userName}>{profile.firstName} {profile.lastName}</Text>
        <Text style={styles.userEmail}>{profile.email}</Text>
        <View style={styles.followContainer}>
          <Text style={styles.followText}>Followers: <Text style={styles.countText}>{followersCount}</Text></Text>
          {/* <Text style={styles.followText}>Following: <Text style={styles.countText}>{followingCount}</Text></Text> */}
        </View>
      </View>
      
      <View style={styles.content}>
      {/* <View style={styles.profileInfoContainer}>
    <View style={styles.profileImageContainer}>
        {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.profileImage} />
        ) : (
            <Icon name="user" size={80} color="#05652D" />
        )}
    </View>
    <View style={styles.accountInfoContainer}>
        <Text style={styles.name}>{profile.firstName} {profile.lastName}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        <View style={styles.followerFollowingContainer}>
            <Text style={styles.followText}>Followers: <Text style={styles.countText}>{followersCount}</Text></Text>
            <Text style={styles.followText}>Following: <Text style={styles.countText}>{followingCount}</Text></Text>
        </View>
          </View>
      </View> */}
        <View style={styles.divider} />
        <Text style={styles.productTitle}>Products</Text>
        <View style={styles.productsContainer}>
          {isProductsLoading ? (
            <ActivityIndicator size="large" color="#05652D" />
          ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="shopping-bag" size={24} color="#808080" />
                <Text style={styles.emptyText}>No products yet</Text>
              </View>
            ) : (
              products.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  onPress={() => handleProductSelect(product)} 
                  style={styles.productCard}
                >
                  <Image source={{ uri: product.photo }} style={styles.productImage} />
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>₱{product.price}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
          <View style={styles.divider} />
          <Text style={styles.productTitle}>Donations</Text>
          <View style={styles.productsContainer}>
          {isDonationsLoading ? (
            <ActivityIndicator size="large" color="#05652D" />
          ) : donation.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon5 name="hand-holding-heart" size={24} color="#808080" />
                <Text style={styles.emptyText}>No donations yet</Text>
              </View>
            ) : (
              donation.map((donation) => (
                <TouchableOpacity 
                  key={donation.id} 
                  onPress={() => handleDonationSelect(donation)} 
                  style={styles.productCard}
                >
                  <Image source={{ uri: donation.photo }} style={styles.productImage} />
                  <Text style={styles.productName}>{donation.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
      </View>
      </ScrollView>
      {showSubscriptionMessage && (
      <View style={styles.subscriptionMessage}>
        <Text style={styles.subscriptionMessageText}>
          You subscribed to {profile.firstName} {profile.lastName}
        </Text>
      </View>
    )}

    {showUnsubscribeMessage && (
      <View style={styles.subscriptionMessage}>
        <Text style={styles.subscriptionMessageText}>
          You unsubscribed from {profile.firstName} {profile.lastName}
        </Text>
      </View>
    )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  profileHeader: {
    position: 'relative',
    height: 200,

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingHorizontal: 10,
    paddingTop: 44,
    paddingBottom: 10,
  },
  backButtonIcon: {
    marginRight: 10,
    color: '#FFFFFF', 
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', 
    textAlign: 'center',
    flex: 1,
  },
  scrollableContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  profileInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden', 
    marginRight: 15,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  accountInfoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
  },
  email: {
    fontSize: 12,
    color: '#666', 
    marginVertical: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rating: {
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#05652D',
  },
  productTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 10,
    alignSelf: 'flex-start', 
  },
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFF',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 20,
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#808080',
    marginTop: 10,
  },
  subscriptionMessage: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  subscriptionMessageText: {
    color: '#fff',
    fontSize: 16,
  },
  followerFollowingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
},
profileBackground: {
  width: '100%',
  height: '100%',
  resizeMode: 'cover'
},
backButton: {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 10,
  // backgroundColor: '#FFFFFF', 
  // borderRadius: 20,
  // padding: 6, 
},
subscribeButton: {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  // backgroundColor: '#FFFFFF', 
  // borderRadius: 20,
  // padding: 6, 
},
profileInfo: {
  alignItems: 'left',
  marginTop: -50,
  marginLeft: 20,
},
userPhotoContainer: {
  width: 100,
  height: 100,
  borderRadius: 50,
  borderWidth: 4,
  borderColor: '#FFFFFF',
  overflow: 'hidden',

},
userPhoto: {
  width: '100%',
  height: '100%',
},
userName: {
  fontSize: 20,
  fontWeight: 'bold',
  marginTop: 8,
},
userEmail: {
  fontSize: 16,
  color: '#666666',
},
followContainer: {
  flexDirection: 'row',
  justifyContent: 'left',
  width: '100%',
  marginTop: 8,
},
followText: {
  fontSize: 14,
  color: '#333333',
},
countText: {
  fontWeight: 'bold',
  color: '#05652D',
},
sellerName: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#05652D',
  marginBottom: 2,
},
});

export default UserVisit;