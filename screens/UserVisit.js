import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert} from 'react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { Rating } from 'react-native-ratings';
import { getAuth } from 'firebase/auth';
import ProfileTab from '../navbars/ProfileTab';

const UserVisit = ({ route, navigation }) => {
  const [productTab, setProductTab] = useState('Latest');  
  const [priceSort, setPriceSort] = useState('High'); 
  const [selectedTab, setSelectedTab] = useState('Products');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [backgroundProfileUri, setBackgroundProfileUri] = useState(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);

  const backgroundUserIcon = require('../assets/background-user.webp'); 
  const [backgroundImage, setBackgroundImage] = useState(require('../assets/background-user.webp')); 
  const [profileImage, setProfileImage] = useState(null);

  const [priceSortOrder, setPriceSortOrder] = useState('desc');

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

  const fetchProfileImages = async () => {

    let userBackgroundUri = null;
    let userPhotoUri = null;
  
    const userQuery = query(collection(db, 'users'), where('email', '==', email));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      userBackgroundUri = userData.backgroundProfileUri;
      userPhotoUri = userData.photoUrl;
    }
  
    const registeredSellerQuery = query(collection(db, 'registeredSeller'), where('email', '==', email));
    const sellerSnapshot = await getDocs(registeredSellerQuery);
    if (!sellerSnapshot.empty) {
      const sellerData = sellerSnapshot.docs[0].data();
      setBackgroundProfileUri(sellerData.backgroundPhotoUri || userBackgroundUri);
      setProfilePhotoUri(sellerData.profilePhotoUri || userPhotoUri);
    } else {
      setBackgroundProfileUri(userBackgroundUri);
      setProfilePhotoUri(userPhotoUri);
    }
  };
  
  useEffect(() => {
    fetchProfileImages();
  }, [email]);

  const [profile, setProfile] = useState({});
  const [averageRating, setAverageRating] = useState(0);
  const { email } = route.params;
  const [products, setProducts] = useState([]);
  const [donations, setDonations] = useState([]);
  
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

        const registeredSellerQuery = query(collection(db, 'registeredSeller'), where('email', '==', email));
        const registeredSellerSnapshot = await getDocs(registeredSellerQuery);
        if (!registeredSellerSnapshot.empty) {
          const registeredSellerData = registeredSellerSnapshot.docs[0].data();
          setProfile({ ...userData, sellerName: registeredSellerData.sellerName });
          if (registeredSellerData.backgroundPhotoUri) {
            setBackgroundImage({ uri: registeredSellerData.backgroundPhotoUri });
          }
        }

        const averageRatingQuery = query(collection(db, 'userAverageRating'), where('email', '==', email));
        const averageRatingSnapshot = await getDocs(averageRatingQuery);
        if (!averageRatingSnapshot.empty) {
          const averageRatingData = averageRatingSnapshot.docs[0].data();
          setAverageRating(averageRatingData.averageRating || 0);
        }

        const productsQuery = query(collection(db, 'products'), where('seller_email', '==', email), where('publicationStatus', '==', 'approved'),  orderBy('createdAt', 'desc'));
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);
        setIsProductsLoading(false);

        const donationsQuery = query(collection(db, 'donation'), where('donor_email', '==', email), where('publicationStatus', '==', 'approved'), orderBy('createdAt', 'desc'));
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

  useEffect(() => {
    const fetchDonations = async () => {
      setIsDonationsLoading(true);

      const donationsQuery = query(collection(db, 'donation'), where('donor_email', '==', email), orderBy('createdAt', 'desc'));
      const donationsSnapshot = await getDocs(donationsQuery);
      const donationsList = donationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDonations(donationsList);
      setIsDonationsLoading(false);
    };

    fetchDonations();
  }, [email]);

  const handleDonationSelect = (donation) => {
    navigation.navigate('DonationDetail', { donation });
  };
  
  const handleChatWithUser = async () => {
    if (!currentUserEmail) {
      console.log('User not authenticated');
      return;
    }
  
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('users', 'array-contains', currentUserEmail));
      const querySnapshot = await getDocs(q);
  
      let existingChatId = null;
  
      for (const doc of querySnapshot.docs) {
        const chatData = doc.data();
        if (chatData.users.includes(email)) {
          existingChatId = doc.id;
          break;  
        }
      }
  
      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: email,
        });
      } else {
        const newChatRef = collection(db, 'chats');
        const newChat = {
          users: [currentUserEmail, email],
          messages: [],
        };
  
        const docRef = await addDoc(newChatRef, newChat);
        navigation.navigate('Chat', {
          chatId: docRef.id,
          receiverEmail: email,
        });
      }
    } catch (error) {
      console.error('Error handling chat with donor:', error);
    }
  };
  
  const defaultBackgroundImage = require('../assets/background-user.webp');
  const defaultProfileImage = require('../assets/default-user.png');
  
  const handleViewImage = (imageUrl) => {
    if (imageUrl !== defaultBackgroundImage && imageUrl !== defaultProfileImage) {
      navigation.navigate('ViewerImage', { imageUrl });
    }
  };

    useEffect(() => {
      const fetchProducts = async () => {
          setIsProductsLoading(true);
          const baseQuery = collection(db, 'products');
          let queryRef = query(
              baseQuery, 
              where('seller_email', '==', email),
              where('publicationStatus', '==', 'approved')
          );

          if (productTab === 'Latest') {
              queryRef = query(queryRef, orderBy('createdAt', 'desc'));
          } else if (productTab === 'Price') {
              const direction = priceSort === 'Low' ? 'asc' : 'desc'; 
              queryRef = query(queryRef, orderBy('price', direction));
          }

          const querySnapshot = await getDocs(queryRef);
          const productList = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              price: parseFloat(doc.data().price)
          }));

          if (productTab === 'Price') {
              productList.sort((a, b) => {
                  if (priceSort === 'Low') {
                      return a.price - b.price;
                  } else {
                      return b.price - a.price;
                  }
              });
          }

          setProducts(productList);
          setIsProductsLoading(false);
      };

      fetchProducts();
  }, [email, productTab, priceSort]);

  const togglePriceSort = () => {
    setPriceSort(prev => (prev === 'High' ? 'Low' : 'High'));
  };

  const [categories, setCategories] = useState([]);
  const [categoryTab, setCategoryTab] = useState('Product Categories');
  const [productCategories, setProductCategories] = useState([]);
  const [donationCategories, setDonationCategories] = useState([]);

  useEffect(() => {
    const fetchProductCategories = async () => {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductCategories(categoriesData);
    };
  
    if (selectedTab === 'Categories' && categoryTab === 'Product Categories') {
      fetchProductCategories();
    }
  }, [categoryTab, selectedTab]);

  useEffect(() => {
    const fetchDonationCategories = async () => {
      const querySnapshot = await getDocs(collection(db, 'donationCategories'));
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDonationCategories(categoriesData);
    };
  
    if (selectedTab === 'Categories' && categoryTab === 'Donation Categories') {
      fetchDonationCategories();
    }
  }, [categoryTab, selectedTab]);

  const handleCategorySelect = (category) => {
    if (selectedTab === 'Categories' && categoryTab === 'Product Categories') {
      navigation.navigate('CategorizedProduct', {
        categoryTitle: category.title,
        sellerName: profile.sellerName,
        email: email
      });
    } else if (selectedTab === 'Categories' && categoryTab === 'Donation Categories') {
      navigation.navigate('CategorizedDonation', {
        categoryTitle: category.title,
        email: email 
      });
    }
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
      {backgroundProfileUri ? (
    <TouchableOpacity onPress={() => handleViewImage(backgroundProfileUri)}>
        <View style={styles.profileHeader}>
          <Image source={{ uri: backgroundProfileUri }} style={styles.profileBackground} resizeMode="cover" />
        </View>
      </TouchableOpacity>
        ) : (
          <View style={styles.profileHeader}>
            <Image source={defaultBackgroundImage} style={styles.profileBackground} resizeMode="cover" />
          </View>
        )}

        <View style={styles.profileInfo}>
        <View style={styles.userPhotoContainer}>
      {profilePhotoUri && profilePhotoUri !== defaultProfileImage ? (
        <TouchableOpacity onPress={() => handleViewImage(profilePhotoUri)}>
          <Image source={{ uri: profilePhotoUri }} style={styles.userPhoto} />
        </TouchableOpacity>
      ) : (
        <Icon name="user" size={100} color="#05652D" />
      )}
    </View>
        <TouchableOpacity onPress={isSubscribed ? handleUnsubscribe : handleSubscribe} style={isSubscribed ? styles.unfollowButton : styles.followButton}>
            <Text style={isSubscribed ? styles.unfollowText : styles.followButtonText}>
              {isSubscribed ? "Unfollow" : "Follow"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChatWithUser} style={styles.messageButton}>
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
          <View style={styles.sellerNameContainer}>
            <Icon5 name="store" size={24} color="#05652D" style={styles.marketIcon} />
            <Text style={styles.sellerName}>{profile.sellerName}</Text>
          </View>
        <Text style={styles.userName}>{profile.firstName} {profile.lastName}</Text>
        <Text style={styles.userEmail}>{profile.email}</Text>
        <View style={styles.followContainer}>
          <Text style={styles.followText}>Followers: <Text style={styles.countText}>{followersCount}</Text></Text>
           {/* <Text style={styles.followText}>Following: <Text style={styles.countText}>{followingCount}</Text></Text> */}
        </View>
      </View>
      <ProfileTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <View style={styles.content}>
      {selectedTab === 'Products' && (
        <View style={styles.content}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity onPress={() => setProductTab('Popular')} style={styles.tab}>
              <Text style={productTab === 'Popular' ? styles.activeTabText : styles.tabText}>Popular</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProductTab('Latest')} style={styles.tab}>
              <Text style={productTab === 'Latest' ? styles.activeTabText : styles.tabText}>Latest</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setProductTab('Price'); togglePriceSort(); }} style={styles.tab}>
        <Text style={productTab === 'Price' ? styles.activeTabText : styles.tabText}>
            Price {priceSort === 'High' ? '<' : '>'}
        </Text>
    </TouchableOpacity>
          </View>
          {isProductsLoading ? (
            <ActivityIndicator size="large" color="#05652D" />
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products yet</Text>
            </View>
          ) : (
            <View style={styles.productsContainer}>
              {products.filter(product => product.publicationStatus === 'approved').map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  onPress={() => handleProductSelect(product)} 
                  style={styles.productCard}
                >
                  <Image source={{ uri: product.photo }} style={styles.productImage} />
                  <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                  <Text style={styles.productPrice}>₱{product.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
       {selectedTab === 'Donations' && (
          <View style={styles.content}>
            {isDonationsLoading ? (
              <ActivityIndicator size="large" color="#05652D" />
            ) : donations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No donations yet</Text>
              </View>
            ) : (
          <View style={styles.productsContainer}>
            {donations.map((donation) => (
              <TouchableOpacity 
                key={donation.id} 
                onPress={() => handleDonationSelect(donation)} 
                style={styles.productCard}
              >
                <Image source={{ uri: donation.photo }} style={styles.productImage} />
                <View style={styles.donationContent}>
                {donation.subPhotos && donation.subPhotos.length > 0 && (
                    <View style={styles.subPhotosContainer}>
                      {donation.subPhotos.slice(0, 3).map((subPhoto, index) => (
                        <Image key={index} source={{ uri: subPhoto }} style={styles.subPhoto} />
                      ))}
                      {donation.subPhotos.length > 3 && (
                        <Text style={styles.morePhotosIndicator}>+{donation.subPhotos.length - 3} more</Text>
                      )}
                    </View>
                  )}
                  <Text style={styles.productName}>{donation.name}</Text>
                  <Text style={styles.productPrice}>{donation.itemNames.join(' · ')}</Text>
                  <Text style={styles.productCategory}>{donation.category} Bundle</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
            )}
          </View>
          )}
          {selectedTab === 'Categories' && (
            <View style={styles.content}>
              <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setCategoryTab('Product Categories')} style={styles.tab}>
                  <Text style={categoryTab === 'Product Categories' ? styles.activeTabText : styles.tabText}>Product Categories</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCategoryTab('Donation Categories')} style={styles.tab}>
                  <Text style={categoryTab === 'Donation Categories' ? styles.activeTabText : styles.tabText}>Donation Categories</Text>
                </TouchableOpacity>
              </View>
              {categoryTab === 'Product Categories' && (
                <View style={styles.categoryContainer}>
                  {productCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={styles.categoryCard}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Image source={{ uri: category.image }} style={styles.categoryImage} />
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {categoryTab === 'Donation Categories' && (
                <View style={styles.categoryContainer}>
                  {donationCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={styles.categoryCard}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Image source={{ uri: category.image }} style={styles.categoryImage} />
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
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

    backgroundColor: '#ccc'
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
    width: '50%',
    backgroundColor: '#FFF',
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',

    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 4,
  },
  productPrice: {
    color: '#05652D',
    fontSize: 12,
    marginLeft: 5,
  },
  productCategory: {
    fontSize: 12,
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
},
subscribeButton: {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
},
profileInfo: {
  alignItems: 'left',
  marginTop: -50,
  marginLeft: 20,
  marginBottom: 20,
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
followButton: {
  position: 'absolute',
  top: 0,
  right: 10, 
  backgroundColor: '#05652D', 
  borderRadius: 20,
  padding: 10,
},
unfollowButton: {
  position: 'absolute',
  top: 0,
  right: 10,
  backgroundColor: '#fff',
  borderColor: '#05652D', 
  borderWidth: 1,
  borderRadius: 20,
  padding: 10,
},
followButtonText: {
  color: '#FFFFFF', 
  fontSize: 16,
},
unfollowText: {
  color: '#05652D', 
  fontSize: 16,
},
messageButton: {
  position: 'absolute',
  top: 60,
  right: 10,
  backgroundColor: '#05652D', 
  borderBottomLeftRadius: 10,
  borderTopEndRadius: 10,
  padding: 10,
},
messageButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
},
sellerNameContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 2,
},
marketIcon: {
  marginRight: 10,
},
tabsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  backgroundColor: '#E3FCE9',
  borderBottomWidth: 2,
  padding: 10,
  borderColor: '#D3D3D3',
},
tab: {
  flex: 1,
  padding: 10,
},
tabText: {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
},
activeTabText: {
  fontSize: 16,
  color: '#05652D',
  fontWeight: 'bold',
  textAlign: 'center',
},
categoryContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-around',
},
categoryCard: {
  width: '48%',
  aspectRatio: 1,
  marginBottom: 10,
  padding: 10,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FFF',
  borderRadius: 10,
  elevation: 2,
},
categoryImage: {
  width: 100,
  height: 100,
  borderRadius: 20,
},
categoryTitle: {
  marginTop: 8,
  textAlign: 'center',
  fontSize: 16,
  fontWeight: 'bold',
},
subPhotosContainer: {
  flexDirection: 'row',
  marginTop: 4,
  alignItems: 'center',
},
subPhoto: {
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 4,
},
morePhotosIndicator: {
  fontSize: 10,
  color: '#666',
  marginLeft: 4,
},
});

export default UserVisit;