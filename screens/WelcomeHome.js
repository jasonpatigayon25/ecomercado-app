import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, ScrollView, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { FlatList } from 'react-native-gesture-handler';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit, getDoc, doc, where, documentId } from 'firebase/firestore';
import NavbarLogin from '../navbars/NavbarLogin';

const WelcomeHome = ({ navigation }) => {
  const [firestoreCategories, setFirestoreCategories] = useState([]);
  const [selectedHeader] = useState('Most Popular Products');
  const [mostPopularProducts, setMostPopularProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [donations, setDonations] = useState([]);

  const carouselRef = useRef(null);

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

  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
  
      const products = (await Promise.all(productPromises)).filter(Boolean);
      setMostPopularProducts(products);
    };
  
    fetchMostPopularProducts();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFirestoreCategories(categories);
    };

    const fetchRandomProducts = async () => {
      const productsRef = collection(db, 'products');
      const allProductsQuery = query(productsRef, orderBy("name"), limit(10));
      const querySnapshot = await getDocs(allProductsQuery);
      const allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      allProducts.sort(() => 0.5 - Math.random());
      setRecommendedProducts(allProducts);
    };

    fetchCategories();
    fetchRandomProducts();
  }, []);

  const handleSearchFocus = () => {
    handleNavigateToModal();
  };

  const Category = ({ id, image, title }) => (
    <TouchableOpacity onPress={handleNavigateToModal}>
      <View style={styles.category}>
        <Image source={{ uri: image }} style={styles.categoryImage} />
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleNavigateToModal = () => {
    setModalVisible(true);
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity onPress={handleNavigateToModal}>
      <Image source={{ uri: item.photo }} style={styles.carouselImage} />
    </TouchableOpacity>
  );

  const renderRecommendedProductItem = ({ item }) => (
    <TouchableOpacity onPress={handleNavigateToModal}>
      <Image source={{ uri: item.photo }} style={styles.recommendedImage} />
    </TouchableOpacity>
  );
  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  useEffect(() => {
    const fetchDonations = async () => {
      const donationsRef = collection(db, 'donation');
      const snapshot = await getDocs(donationsRef);
      let donationsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      // shuffle 10 item donations
      donationsList.sort(() => Math.random() - 0.5);
      setDonations(donationsList.slice(0, 10));
    };
  
    fetchDonations();
  }, []);
  
  const DonationItem = ({ item }) => (
    <TouchableOpacity onPress={handleNavigateToModal}>
      <Image source={{ uri: item.photo }} style={styles.donationImage} />
    </TouchableOpacity>
  );  

  return (
    <View style={styles.container}>
      <View style={styles.mainHeader}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Products"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={handleSearchFocus}
          />
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Welcome to ECOMercado!</Text>
              <Text style={styles.modalSubHeader}>Please Login your account to Access this feature</Text>

              <TouchableOpacity style={[styles.modalButton, styles.loginButton]} onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.buttonText, styles.loginButtonText]}>Log In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.modalButton, styles.signupButton]} onPress={() => navigation.navigate('Signup')}>
                <Text style={[styles.buttonText, styles.signupButtonText]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Icon name="comments" size={24} color="#05652D" style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Icon name="shopping-cart" size={24} color="#05652D" style={styles.icon} />
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
            <ScrollView contentContainerStyle={styles.modalGrid}>
              {firestoreCategories.map((category) => (
                <Category key={category.id} id={category.id} image={category.image} title={category.title} />
              ))}
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
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommendedProducts.map((product) => (
              <View key={product.id}>
                {renderRecommendedProductItem({ item: product })}
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={[styles.donationsContainer, styles.sectionContainer]}>
          <Text style={styles.sectionTitle}>Recent Donations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {donations.map((donation) => (
              <View key={donation.id}>
                <DonationItem item={donation} />
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      <NavbarLogin
        onLoginPress={() => navigation.navigate('Login')}
        onSignUpPress={() => navigation.navigate('Signup')}
      />
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
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    marginLeft: 15,
    backgroundColor: '#FFF',
    color: '#000',
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E3FCE9',
  },
  locationIcon: {
    marginRight: 10,
  },
  locationText: {
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
  modalContent: {
    position: 'absolute',
    bottom: 0,            
    width: '100%',        
    padding: 20,
    backgroundColor: '#05652D', 
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  modalSubHeader: {
    color: 'white',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  }, 
  loginButton: {
    backgroundColor: 'white',
  },
  signupButton: {
    borderColor: 'white',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  }, 
  loginButtonText: {
    color: '#05652D',
  }, 
  signupButtonText: {
    color: 'white',
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
});

export default WelcomeHome;