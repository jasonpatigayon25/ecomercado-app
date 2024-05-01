import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, Alert, Button } from 'react-native';
import { ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import { FlatList } from 'react-native-gesture-handler';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit, getDoc, doc, where, documentId, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const Home = ({ navigation, route }) => {
  const [firestoreCategories, setFirestoreCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedHeader] = useState('Most Popular Products');
  const [mostPopularProducts, setMostPopularProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categorySearchText, setCategorySearchText] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [donations, setDonations] = useState([]);
  const carouselRef = useRef(null);
  const wishlistIcon = require('../assets/wishlist-donation.png');

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingMostPopular, setLoadingMostPopular] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingDonations, setLoadingDonations] = useState(true);

  const [categoryType, setCategoryType] = useState('productCategories');

  const [selectedCity, setSelectedCity] = useState('Cebu'); 

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.selectedCity) {
        setSelectedCity(route.params.selectedCity);
      }
    }, [route.params?.selectedCity])
  );

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
      setLoadingCategories(true);
    try {
      const collectionName = categoryType === 'productCategories' ? "categories" : "donationCategories";
      const querySnapshot = await getDocs(collection(db, collectionName));
      let categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      categories.sort((a, b) => a.title.localeCompare(b.title));
      setFirestoreCategories(categories);
      setLoadingCategories(false); 
    } catch (error) {
      console.error("Error fetching categories: ", error);
      setLoadingCategories(false); 
    }
  };
  
    fetchCategories();
  }, [categoryType]);

  const fetchMostPopularProducts = async () => {
    setLoadingMostPopular(true);
    try {
      const userRecommendsRef = collection(db, "userRecommend");
      const snapshot = await getDocs(userRecommendsRef);
      const productHits = {};
  
      snapshot.forEach(doc => {
        const data = doc.data();
        Object.entries(data.productHits || {}).forEach(([productId, hits]) => {
          if (productHits[productId]) {
            productHits[productId] += hits;
          } else {
            productHits[productId] = hits;
          }
        });
      });
  
      const topProductIds = Object.entries(productHits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
  
      const productDetails = await Promise.all(
        topProductIds.map(async productId => {
          const productRef = doc(db, "products", productId);
          const productSnap = await getDoc(productRef);
          return productSnap.exists() ? { id: productSnap.id, ...productSnap.data() } : null;
        })
      );
  
      const filteredProducts = productDetails.filter(Boolean).filter(product => product.publicationStatus === 'approved' && !product.isDisabled && product.quantity > 0);
      
      setMostPopularProducts(filteredProducts);
    } catch (error) {
      console.error("Error fetching most popular products: ", error);
    } finally {
      setLoadingMostPopular(false);
    }
  };
  
  useEffect(() => {
    fetchMostPopularProducts();
  }, []);
  
  const fetchRecommendedProducts = async () => {
    setLoadingRecommended(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        console.error("No user logged in");
        setLoadingRecommended(false);
        return;
      }
  
      const userRecommendRef = doc(db, 'userRecommend', user.uid);
      const userRecommendSnapshot = await getDoc(userRecommendRef);
      const productHits = userRecommendSnapshot.exists() ? userRecommendSnapshot.data().productHits || {} : {};
  
      const allProductsQuery = query(
        collection(db, 'products'),
        where('publicationStatus', '==', 'approved')
      );
      const allProductsSnapshot = await getDocs(allProductsQuery);
      let allProducts = allProductsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  
      const currentLocation = selectedCity.toLowerCase();
  
      allProducts = allProducts
        .filter(product => 
          product.seller_email !== user.email && 
          product.location.toLowerCase().includes(currentLocation)
        )
        .sort((a, b) => (productHits[b.id] || 0) - (productHits[a.id] || 0));
  
      const topProducts = allProducts.slice(0, 3);
  
      const topCategory = topProducts[0]?.category;
  
      const relatedCategoryProducts = allProducts.filter(product =>
        product.category === topCategory &&
        !topProducts.includes(product) &&
        product.location.toLowerCase().includes(currentLocation)
      ).slice(0, 5);
  
      const remainingProducts = allProducts.filter(product => 
        !topProducts.includes(product) &&
        !relatedCategoryProducts.includes(product) &&
        product.location.toLowerCase().includes(currentLocation)
      );
  
      const combinedRecommendedProducts = [...topProducts, ...relatedCategoryProducts, ...remainingProducts];
  
      setRecommendedProducts(combinedRecommendedProducts);
    } catch (error) {
      console.error("Error fetching recommended products: ", error);
    } finally {
      setLoadingRecommended(false);
    }
  };
  
  useEffect(() => {
    fetchRecommendedProducts();
  }, [selectedCity]);
  
  const handleSearchFocus = () => {
    navigation.navigate('SearchProducts', { searchText });
  };

  const Category = ({ id, image, title, type }) => {
    const targetScreen = type === 'productCategories' ? 'CategoryResults' : 'CategoryResultsDonation';
  
    return (
      <>
        {loadingCategories ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#05652D" style={styles.loadingIndicator} />
          </View>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate(targetScreen, { categoryName: title })}>
            <View style={styles.category}>
              <Image source={{ uri: image }} style={styles.categoryImage} />
              <Text style={styles.categoryTitle}>{title}</Text>
            </View>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { product: item })}>
      <View style={styles.popularContainer}>
      <Image source={{ uri: item.photo }} style={styles.carouselImage} />
      </View>
    </TouchableOpacity>
  );

  const renderRecommendedProductItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { product: item })}>
      <View style={styles.recommendationContainer}>
      <Image source={{ uri: item.photo }} style={styles.recommendedImage} />
      <View style={styles.productDetailsContainer}>
        <View style={styles.nameBackground}>
          <Text style={styles.nameText}>{item.name}</Text>
        </View>
      </View>
      </View>
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
      setLoadingDonations(true); 
      try {
        const auth = getAuth();
        const user = auth.currentUser;
    
        if (!user) {
          console.error("No user logged in");
          setLoadingDonations(false);
          return;
        }
    
        const currentLocation = selectedCity.toLowerCase();
        const userRecommendRef = doc(db, 'userRecommendDonation', user.uid);
        const userRecommendSnapshot = await getDoc(userRecommendRef);
        const donationHits = userRecommendSnapshot.exists() ? userRecommendSnapshot.data().donationHits || {} : {};
    
        const allDonationsQuery = query(
          collection(db, 'donation'),
          where('publicationStatus', '==', 'approved')
        );
        const allDonationsSnapshot = await getDocs(allDonationsQuery);
        let allDonations = allDonationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
        allDonations.sort((a, b) => (donationHits[b.id] || 0) - (donationHits[a.id] || 0));
    
        const topDonations = allDonations.slice(0, 3);
        const topDonorEmail = topDonations[0]?.donor_email;
        let donorDonations = allDonations.filter(donation => donation.donor_email === topDonorEmail && !topDonations.some(topDonation => topDonation.id === donation.id));
    
        let remainingDonations = allDonations.filter(donation => 
          donation.donor_email !== topDonorEmail && !topDonations.some(topDonation => topDonation.id === donation.id)
        );
    
        remainingDonations.sort(() => Math.random() - 0.5);
    
        const recommendedDonations = [...topDonations, ...donorDonations, ...remainingDonations];
    
        let filteredRecommendedDonations = recommendedDonations.filter(donation =>
          donation.location.toLowerCase().includes(currentLocation) &&
          donation.isDonated !== true &&
          donation.isDisabled !== true &&
          donation.donor_email !== user.email
        );
    
        setDonations(filteredRecommendedDonations);
        setLoadingDonations(false);
      } catch (error) {
        console.error("Error fetching donations: ", error);
        setLoadingDonations(false); 
      }
    };
    
    fetchDonations();
  }, [selectedCity]);

  const shuffleDonations = () => {
    let shuffled = [...donations];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDonations(shuffled);
  };
  
  const DonationItem = ({ item }) => {
    const displayExtraPhotos = () => {
      const subPhotosToShow = item.subPhotos.slice(0, 3);
      const moreCount = item.subPhotos.length - 3;
  
      return (
        <View style={styles.subPhotosOverlay}>
          {subPhotosToShow.map((photo, index) => (
            <Image key={index} source={{ uri: photo }} style={styles.subPhoto} />
          ))}
          {item.subPhotos.length > 3 && (
            <Text style={styles.morePhotosText}>+{moreCount} more</Text>
          )}
        </View>
      );
    };
  
    return (
      <TouchableOpacity onPress={() => navigation.navigate('DonationDetail', { donation: item })}>
        <View style={styles.donationItemContainer}>
          <Image source={{ uri: item.photo }} style={styles.donationImage} />
          <Text style={styles.donationName} numberOfLines={1} ellipsizeMode='tail'>
          {item.name}
        </Text>
          {item.subPhotos && item.subPhotos.length > 0 && displayExtraPhotos()}
        </View>
      </TouchableOpacity>
    );
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
      <ScrollView>
      <View style={styles.categoryHeader}>
      <View style={styles.switchContainer}>
      <Button
            title="Product Categories"
            onPress={() => setCategoryType('productCategories')}
            color={categoryType === 'productCategories' ? '#05652D' : '#D3D3D3'}
          />
          <Button
            title="Donation Categories"
            onPress={() => setCategoryType('donationCategories')}
            color={categoryType === 'donationCategories' ? '#05652D' : '#D3D3D3'}
          />
      </View>
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
            <Category
              key={category.id}
              id={category.id}
              image={category.image}
              title={category.title}
              type={categoryType} 
            />
          ))}
        </ScrollView>
      </View>
        <View style={[styles.carouselContainer, styles.sectionContainer]}>
        {loadingMostPopular ? (
            <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#05652D" style={styles.loadingIndicator}/>
          </View>
        ) : (
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
      )}
          <View style={styles.carouselTitleContainer}>
            <Text style={styles.carouselTitle}>{selectedHeader}</Text>
          </View>
        </View>
        <View style={[styles.recommendedContainer, styles.sectionContainer]}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity style={styles.filterContainer} onPress={() => navigation.navigate('MapLocationBasedHome')}>
              <Text style={styles.filterText}>{selectedCity} <Icon name="filter" size={20} color="#666" /></Text>
            </TouchableOpacity>
          </View>
          {loadingRecommended ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#05652D" style={styles.loadingIndicator}/>
                    </View>
                ) : recommendedProducts.length === 0 ? (
                    <View style={styles.emptyProductIcon}>
                        <Icon name="shopping-bag" size={50} color="#D3D3D3" />
                        <Text style={styles.notFoundText}>No products found in {selectedCity}</Text>
                    </View>
                ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommendedProducts.map((product) => (
                <View key={product.id}>
                  {renderRecommendedProductItem({ item: product })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={[styles.donationsContainer, styles.sectionContainer]}>
                <View style={styles.donationsHeader}>
                    <Text style={styles.sectionTitle}>Donations You Can Request</Text>
                    <TouchableOpacity onPress={shuffleDonations} style={styles.shuffleButton}>
                        <Icon name="random" size={20} color="#05652D" />
                    </TouchableOpacity>
                </View>
                {loadingDonations ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#05652D" style={styles.loadingIndicator}/>
                    </View>
                ) : donations.length === 0 ? (
                    <View style={styles.emptyProductIcon}>
                        <Icon2 name="hand-heart" size={50} color="#D3D3D3" />
                        <Text style={styles.notFoundText}>No donations found in {selectedCity}</Text>
                    </View>
                ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {donations.map((donation) => (
              <View key={donation.id}>
                <DonationItem item={donation} />
              </View>
            ))}
          </ScrollView>
        )}
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
    marginTop: 10,
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
    resizeMode: 'cover',
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

    borderTopLeftRadius: 20,
    borderBottomRightRadius: 50,
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
    color: '#CCC',
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
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  switchButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    color: 'grey',
  },
  activeSwitchButton: {
    fontWeight: 'bold',
    color: 'green',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    top: -10,
  },
  filterText: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyProductIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyProductIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 100,
    height: 100,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 6,
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
  productPrice: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nameBackground: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    padding: 5,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 10,
  },
  nameText: {
    color: 'white',
  },
  productDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  recommendationContainer: {
    marginRight: 5,
  },
  donationItemContainer: {
    marginBottom: 15,
    width: 200,
    height: 200,
    marginRight: 5,
    position: 'relative',
  },
  donationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  donationName: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 5,
    color: 'white',
    fontSize: 16,
    // fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 5,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  subPhotosOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 5,
    borderBottomEndRadius: 10,
    borderBottomStartRadius: 10,
  },
  subPhoto: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#fff', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  morePhotosText: {
    color: '#FFF', 
    marginLeft: 5,
    fontWeight: 'bold',
  },
  
});


export default Home;