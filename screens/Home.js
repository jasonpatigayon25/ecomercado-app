import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { FlatList } from 'react-native-gesture-handler';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit, getDoc, doc, where, documentId, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

const Home = ({ navigation }) => {
  const [firestoreCategories, setFirestoreCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedHeader] = useState('Most Popular Products');
  const [mostPopularProducts, setMostPopularProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categorySearchText, setCategorySearchText] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationLevel, setLocationLevel] = useState('city');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [donations, setDonations] = useState([]);
  const carouselRef = useRef(null);
  const [isLocationFilterActive, setIsLocationFilterActive] = useState(false);
  const wishlistIcon = require('../assets/wishlist-donation.png');
  const [userCity, setUserCity] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < mostPopularProducts.length) {
          return nextIndex;
        }
        return 0; 
      });
    }, 3000); 
  
    return () => clearInterval(timer); 
  }, [mostPopularProducts.length]);

  useEffect(() => {
    if (carouselRef.current && currentIndex < mostPopularProducts.length) {
      carouselRef.current.scrollToIndex({ animated: true, index: currentIndex });
    }
  }, [currentIndex, mostPopularProducts.length]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCartCount();
      const onBackPress = () => {
        Alert.alert("Exit App", "Do you want to close the app?", [
          {
            text: "No",
            onPress: () => null,
            style: "cancel"
          },
          { text: "Yes", onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [])
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "categories"));
      let categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      categories.sort((a, b) => a.title.localeCompare(b.title));
      setFirestoreCategories(categories);
    };
  
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchMostPopularProducts = async () => {
      const searchHitsRef = collection(db, "searchHits");
      const hitsQuery = query(searchHitsRef, orderBy("hits", "desc"), limit(5));
      const querySnapshot = await getDocs(hitsQuery);
    
      const productPromises = querySnapshot.docs.map(async (hit) => {
        const productRef = doc(db, "products", hit.data().productId);
        const productSnap = await getDoc(productRef);
        return productSnap.exists() ? { id: productSnap.id, ...productSnap.data() } : null;
      });
    
      const products = (await Promise.all(productPromises))
        .filter(Boolean)
        .filter(product => !product.isDisabled && product.quantity > 0);
    
      setMostPopularProducts(products);
    };
  
    fetchMostPopularProducts();
  }, []);

  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        console.error("No user logged in");
        return;
      }
  
      const userEmail = user.email;
      const productsRef = collection(db, 'products');
  
      const userRecommendRef = doc(db, 'userRecommend', user.uid);
      const userRecommendSnapshot = await getDoc(userRecommendRef);
      const userRecommendData = userRecommendSnapshot.data();
  
      let recommendedProducts = [];
  
      if (userRecommendData && Object.keys(userRecommendData.productHits).length > 0) {
        const topProductHits = Object.entries(userRecommendData.productHits)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
  
        const topProductIds = topProductHits.map(([productId]) => productId);
        const topProductsQuery = query(productsRef, where(documentId(), 'in', topProductIds));
        const topProductsSnapshot = await getDocs(topProductsQuery);
        let topProducts = topProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
        let categories = topProducts.map(product => product.category);
        categories = [...new Set(categories)];
  
        const additionalProducts = [];
        for (const category of categories) {
          const categoryProductsSnapshot = await getDocs(query(productsRef, where("category", "==", category), limit(5)));
          const categoryProducts = categoryProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          additionalProducts.push(...categoryProducts);
        }
  
        recommendedProducts = [...new Map(topProducts.concat(additionalProducts).map(product => [product.id, product])).values()];
      } else {
        const allProductsQuery = query(collection(db, 'products'), orderBy("name"), limit(10));
        const allProductsSnapshot = await getDocs(allProductsQuery);
        recommendedProducts = allProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      recommendedProducts = recommendedProducts.filter(product => 
        !product.isDisabled && product.quantity > 0 && product.seller_email !== userEmail
      );

      if (locationEnabled && userCity) {
        recommendedProducts = recommendedProducts.filter(product => 
          product.location && product.location.includes(userCity)
        );
      }
  
      setRecommendedProducts(recommendedProducts.slice(0, Math.min(20, Math.max(10, recommendedProducts.length))));
    };
  
    fetchRecommendedProducts();
  }, [locationEnabled, userCity]);
  
  const handleSearchFocus = () => {
    navigation.navigate('SearchScreen', { searchText });
  };

  const Category = ({ id, image, title }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CategoryResults', { categoryName: title })}>
      <View style={styles.category}>
        <Image source={{ uri: image }} style={styles.categoryImage} />
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { product: item })}>
      <Image source={{ uri: item.photo }} style={styles.carouselImage} />
    </TouchableOpacity>
  );

  const renderRecommendedProductItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { product: item })}>
      <Image source={{ uri: item.photo }} style={styles.recommendedImage} />
    </TouchableOpacity>
  );

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const fetchWishlistCount = () => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user && user.email) {
      const wishlistRef = doc(db, 'wishlists', user.email);
      const unsubscribe = onSnapshot(wishlistRef, (doc) => {
        if (doc.exists()) {
          const wishlistData = doc.data();
          const wishItems = wishlistData.wishItems;
          setWishlistCount(wishItems.length);
        } else {
          console.log('No wishlist found for the current user.');
          setWishlistCount(0);
        }
      }, (error) => {
        console.error("Error fetching wishlist count: ", error);
      });
      return unsubscribe; 
    }
  };
  
  useEffect(() => {
    const unsubscribe = fetchWishlistCount();
    return unsubscribe; 
  }, []);

  const fetchCartCount = () => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user && user.email) {
      const cartRef = doc(db, 'carts', user.email);
      const unsubscribe = onSnapshot(cartRef, (doc) => {
        if (doc.exists()) {
          const cartData = doc.data();
          const cartItems = cartData.cartItems;
          setCartCount(Object.keys(cartItems).length);
        } else {
          console.log('No cart found for the current user.');
          setCartCount(0);
        }
      }, (error) => {
        console.error("Error fetching cart count: ", error);
      });
      return unsubscribe; 
    }
  };
  
  useEffect(() => {
    const unsubscribe = fetchCartCount();
    return unsubscribe; 
  }, []);

  useEffect(() => {
    const fetchDonations = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        console.error("No user logged in");
        return;
      }
  
      const donationsRef = collection(db, 'donation');
      const querySnapshot = await getDocs(query(donationsRef, orderBy("createdAt", "asc"), limit(20)));
  
      let donationsList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(donation => donation.isDonated !== true)
        .filter(donation => donation.isDisabled !== true)
        .filter(donation => donation.donor_email !== user.email);
  
      setDonations(donationsList);
    };
  
    fetchDonations();
  }, []);

  const shuffleDonations = () => {
    let shuffled = [...donations];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDonations(shuffled);
  };
  
  const DonationItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('DonationDetail', { donation: item })}>
      <Image source={{ uri: item.photo }} style={styles.donationImage} />
    </TouchableOpacity>
  );  

  const handleLocation = async () => {
    setIsLocationLoading(true);
    
    try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission not granted');
      setIsLocationLoading(false);
      return;
    }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
  
      const googleApiKey = 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g';
  
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`
      );
  
      if (response.data.results.length > 0) {
        const addressComponents = response.data.results[0].address_components;
        const cityComponent = addressComponents.find(component => component.types.includes("locality"));
        const provinceComponent = addressComponents.find(component => component.types.includes("administrative_area_level_2"));
        const countryComponent = addressComponents.find(component => component.types.includes("country"));
  
        let locationText = '';
        switch (locationLevel) {
          case 'city':
            locationText = cityComponent ? cityComponent.long_name : 'Unknown City';
            setLocationLevel('province');
            break;
          case 'province':
            locationText = provinceComponent ? provinceComponent.long_name : 'Unknown Province';
            setLocationLevel('country');
            break;
          case 'country':
            locationText = countryComponent ? countryComponent.long_name : 'Philippines'; 
            setLocationLevel('city');
            break;
          default:
            locationText = 'Unknown Location';
            setLocationLevel('city');
            break;
        }
  
        setUserCity(locationText);
        setLocationEnabled(true);
      }
      setIsLocationLoading(false);
    } catch (error) {
      console.error('Error fetching location: ', error);
      setIsLocationLoading(false);
    }
  };
  

  return (
    <View style={styles.container}>
      <View style={styles.mainHeader}>
      
        <View style={styles.searchContainer}>
          
        <View style={styles.inputIconContainer}>
          <Icon name="search" size={20} color="#A9A9A9" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Products"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={handleSearchFocus}
          />
        </View>
          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('CCC')}>
              <Icon name="comments" size={24} color="#05652D" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
              <View style={{ position: 'relative' }}>
                <Icon name="shopping-cart" size={24} color="#05652D" style={styles.icon} />
                {cartCount > 0 && (
                  <View style={styles.cartCountContainer}>
                    <Text style={styles.cartCountText}>{cartCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('DonationWishlist')}>
            <View style={{ position: 'relative' }}>
              <Image source={wishlistIcon} style={styles.wishlistIcon} />
              {wishlistCount > 0 && (
                <View style={styles.cartCountContainer}>
                  <Text style={styles.cartCountText}>{wishlistCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.categoryHeader}>
        <View style={styles.viewAllIconContainer}>
          <TouchableOpacity onPress={toggleModal}>
            <View style={styles.viewAllIconBackground}>
              <Icon name="th-list" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={toggleModal}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeModalIconContainer} onPress={toggleModal}>
              <Icon name="times-circle" size={30} color="#05652D" />
            </TouchableOpacity>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search Categories"
              value={categorySearchText}
              onChangeText={setCategorySearchText}
            />
            {categorySearchText !== '' && (
              <Text style={styles.searchingText}>Searching '{categorySearchText}'...</Text>
            )}
            <ScrollView contentContainerStyle={styles.modalGrid}>
              {firestoreCategories.filter(category => 
                category.title.toLowerCase().includes(categorySearchText.toLowerCase())
              ).length > 0 ? (
                firestoreCategories.filter(category => 
                  category.title.toLowerCase().includes(categorySearchText.toLowerCase())
                ).map((category) => (
                  <Category key={category.id} id={category.id} image={category.image} title={category.title} />
                ))
              ) : (
                <View style={styles.notFoundContainer}>
                  <Text style={styles.notFoundText}>Category not found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {firestoreCategories.map((category) => (
            <Category key={category.id} id={category.id} image={category.image} title={category.title} />
          ))}
        </ScrollView>
      </View>
      <ScrollView>
        <View style={[styles.carouselContainer, styles.sectionContainer]}>
        <FlatList
          ref={carouselRef}
          data={mostPopularProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              carouselRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
        />
          <View style={styles.carouselTitleContainer}>
            <Text style={styles.carouselTitle}>{selectedHeader}</Text>
          </View>
        </View>
        <View style={[styles.recommendedContainer, styles.sectionContainer]}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <View style={styles.locationFilterContainer}>
              {isLocationLoading ? (
                <ActivityIndicator size="small" color="#05652D" />
              ) : locationEnabled ? (
                <TouchableOpacity onPress={handleLocation}>
                  <View style={styles.locationContainer}>
                    <Text style={styles.locationText}>{userCity}</Text>
                    <Icon name="map-marker" size={15} color="#05652D" style={styles.locationIcon} />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleLocation} style={styles.enableLocationButton}>
                  {locationLevel === 'city' && (
                    <>
                      <Text style={styles.locationText}>Enable Nearby</Text>
                      <Icon name="map-marker" size={15} color="#05652D" style={styles.locationIcon} />
                    </>
                  )}
                  {locationLevel === 'province' && (
                    <>
                      <Text style={styles.locationText}>Go to Province</Text>
                      <Icon name="map-marker" size={15} color="#05652D" style={styles.locationIcon} />
                    </>
                  )}
                  {locationLevel === 'country' && (
                    <>
                      <Text style={styles.locationText}>Go to Philippines</Text>
                      <Icon name="map-marker" size={15} color="#05652D" style={styles.locationIcon} />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommendedProducts.map((product) => (
              <View key={product.id}>
                {renderRecommendedProductItem({ item: product })}
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={[styles.donationsContainer, styles.sectionContainer]}>
          <View style={styles.donationsHeader}>
            <Text style={styles.sectionTitle}>Recent Donations for Users</Text>
            <TouchableOpacity onPress={shuffleDonations} style={styles.shuffleButton}>
              <Icon name="random" size={20} color="#05652D" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {donations.map((donation) => (
              <View key={donation.id}>
                <DonationItem item={donation} />
              </View>
            ))}
          </ScrollView>
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
  mainHeader: {
    paddingTop: 10,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    backgroundColor: '#E3FCE9',
  },
  categoryHeader: {
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    marginLeft: 15,
  },
  
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#000',
    borderColor: '#D3D3D3',
  },
  
  searchIcon: {
    paddingLeft: 15,
    color: '#A9A9A9',
  },
  iconsContainer: {
    flexDirection: 'row',
  },
  icon: {
    marginHorizontal: 5,
  },
  categoriesContainer: {
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  category: {
    alignItems: 'center',
    marginRight: 10,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 12,
    color: '#000',
    marginBottom: 20,
  },
  categoryShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  categoryShadowImage: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  carouselContainer: {
    marginBottom: 20,
    justifyContent: 'center',
  },
  carouselImageContainer: {
    width: 320,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselHeaderText: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 5,
  },
  recommendedContainer: {
    marginBottom: 20,
  },
  sectionContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#05652D',
  },
  recommendedImage: {
    width: 200,
    height: 150,
    marginRight: 10,
    borderRadius: 10,
  },

  viewAllIconContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 1,
  },
  viewAllIconBackground: {
    backgroundColor: '#05652D',
    padding: 5, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#05652D', 
  },
  viewAllIcon: {
    color: '#FFF', 
    fontSize: 16,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  closeModalIconContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  closeModalIcon: {
    opacity: 0.8,
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  closeModalIconContainer: {
    alignSelf: 'flex-end',
  },
  closeModalIcon: {
    color: '#05652D',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 50,
    borderRadius: 20,
    padding: 20,
  },

  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
searchSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: '#E3FCE9',
    borderWidth: 1,
    borderColor: '#05652D',
  },
  suggestionText: {
    color: '#05652D',
    fontSize: 14,
  },
  locationIcon: {
    marginRight: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    top: -10,
    right: -10,
    justifyContent: 'center',
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    top: -10,
    right: -10,
  },
  locationText: {
    marginRight: 5, 
    color: '#05652D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3FCE9',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E3E3',
  },
  ribbonContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  backgroundColor: '#05652D',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderTopRightRadius: 10, 
  },
  ribbonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  carouselImage: {
    width: 320, 
    height: 200, 
    marginRight: 10,
    borderRadius: 20,
  },
  carouselTitleContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    backgroundColor: 'rgba(5, 101, 45, 0.7)', 
    padding: 8,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  carouselTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  donationsContainer: {
    marginBottom: 20,
  },
  donationImage: {
    width: 200,
    height: 150,
    marginRight: 10,
    borderRadius: 10,
  },
  locationText: {
    color: '#05652D',
    fontSize: 12,
    marginRight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    top: -15,
    right: -10,
    justifyContent: 'center',
  }, 
  donationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  shuffleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    top: -5,
    right: -5,
  }, 
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFF',
    color: '#000',
  },
  searchingText: {
    textAlign: 'left',
    marginBottom: 10,
    marginHorizontal: 10,
    color: '#05652D',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  notFoundText: {
    marginTop: 10,
    fontSize: 16,
  }, 
  cartCountContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cartCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  wishlistIcon: {
    width: 24,
    height: 24,
    marginLeft: 15,
    resizeMode: 'contain', 
  }
});


export default Home;