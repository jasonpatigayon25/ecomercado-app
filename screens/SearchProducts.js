import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList, Image, ScrollView, Animated, ActivityIndicator  } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { query, where, getDocs, collection, limit, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

const SearchProducts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigation = useNavigation();
  const searchInputRef = useRef(null);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [selectedCity, setSelectedCity] = useState('Cebu'); 

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (navigation.getState().routes.slice(-1)[0].params?.selectedCity) {
        setSelectedCity(navigation.getState().routes.slice(-1)[0].params.selectedCity);
      }
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const handleSearch = async () => {
      setLoadingSearch(true);
      try {
        const productsQuery = query(
          collection(db, 'products'),
          where('publicationStatus', '==', 'approved'),
          limit(50)
        );

        const productsResults = await getDocs(productsQuery);
        const currentLocation = selectedCity.toLowerCase();
        const searchLower = searchQuery.toLowerCase();

        const filteredData = productsResults.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(product => 
            product.location && product.location.toLowerCase().includes(currentLocation) &&
            ((product.name && product.name.toLowerCase().includes(searchLower)) ||
            (product.category && product.category.toLowerCase() === searchLower)) 
          );

        setSearchResults(filteredData);
      } catch (error) {
        console.error("Error searching products: ", error);
      } finally {
        setLoadingSearch(false);
      }
    };

    if (searchQuery) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedCity]);

  const fetchRecommendedProducts = async () => {
    setLoadingRecommended(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
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
      let allProducts = allProductsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      const currentLocation = selectedCity.toLowerCase();
  
      allProducts = allProducts
        .filter(product =>
          product.seller_email !== user.email && 
          product.location && product.location.toLowerCase().includes(currentLocation)
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

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          limit(50),
          orderBy('name'),
        );
        const querySnapshot = await getDocs(q);
        const suggestionTexts = querySnapshot.docs.map(doc => doc.data().name);
        setSuggestions(suggestionTexts);
      } catch (error) {
        console.error("Error fetching suggestions: ", error);
      }
    };

    if (searchQuery) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const navigateToProduct = async (product) => {
    try {
      navigation.navigate('ProductDetail', { product });
    
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error("No user logged in");
        return;
      }
  
      if (product.seller_email === user.email) {

        return;
      }
    
      const userRecommendRef = doc(db, 'userRecommend', user.uid);
      const userRecommendSnapshot = await getDoc(userRecommendRef);
      const userRecommendData = userRecommendSnapshot.data();
    
      let updatedProductHits;
    
      if (!userRecommendData) {
        updatedProductHits = { [product.id]: 1 };
        await setDoc(userRecommendRef, { productHits: updatedProductHits, userEmail: user.email });
      } else {
        const productHits = userRecommendData.productHits || {};
        updatedProductHits = {
          ...productHits,
          [product.id]: (productHits[product.id] || 0) + 1,
        };
        await setDoc(userRecommendRef, { productHits: updatedProductHits }, { merge: true });
      }
    } catch (error) {
      console.error("Error updating product count in userRecommend: ", error);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const q = query(collection(db, 'categories'));
        const querySnapshot = await getDocs(q);
        const fetchedCategories = querySnapshot.docs.map(doc => doc.data().title);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories: ", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const navigateToWish = () => {
    navigation.navigate('Wish', { shouldOpenConfirmModal: true });
  };

  const navigateToSearchDonation = () => {
    navigation.navigate('SearchDonations');
  };


  const navigateToSearchResults = () => {

    const matchedCategory = categories.find(category => category.toLowerCase() === searchQuery.toLowerCase());
    if (matchedCategory) {

      navigation.navigate('CategoryResults', { categoryName: matchedCategory });
    } else if (searchQuery.length > 0) {

      navigation.navigate('SearchProductResults', { searchQuery });
    }
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchQuery(suggestion);
  };

  const handleCategoryPress = (category) => {
    setSearchQuery(category);
  };

  const renderProductItem = ({ item }) => {
    if (item.publicationStatus === 'approved') {
      return (
        <TouchableOpacity onPress={() => navigateToProduct(item)} style={styles.productCard}>
          <Image source={{ uri: item.photo }} style={styles.productImage} />
          <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₱{item.price}</Text>
        </TouchableOpacity>
      );
    }
    return null; 
  };

  const renderLikeProductItem = ({ item }) => {
    if (item.publicationStatus === 'approved') {
      return (
        <TouchableOpacity onPress={() => navigateToProduct(item)} style={styles.productCard}>
          <Image source={{ uri: item.photo }} style={styles.productImage} />
          <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₱{item.price}</Text>
        </TouchableOpacity>
      );
    }
    return null; 
  };

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSuggestionPress(item)} style={styles.suggestionItem}>
      <Text>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.input}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.searchImageButton} onPress={navigateToWish}>
          <Image source={require('../assets/zoom-in.png')} style={styles.searchImageIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchButton} onPress={searchQuery.length > 0 ? navigateToSearchResults : null}>
          <Icon name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.switchContainer} onPress={navigateToSearchDonation}>
          <Text style={styles.switchText}><Icon name="search" size={16} color="#fff" /> Search Donation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterContainer} onPress={() => navigation.navigate('MapLocationBased')}>
          <Text style={styles.filterText}>{selectedCity} <Icon name="filter" size={20} color="#666" /></Text>
        </TouchableOpacity>
      </View>
  
      <View style={styles.textContainer}>
        {searchQuery.length > 0 && (
          <Text style={styles.searchingText}>Searching for "{searchQuery}"</Text>
        )}
      </View>

      
      {loadingSearch && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#05652D" />
        </View>
      )}
  
      {searchQuery.length > 0 && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity key={index} onPress={() => handleSuggestionPress(suggestion)} style={styles.suggestionItem}>
                <Text>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
  
       {searchQuery.length > 0 && !loadingSearch && searchResults.length === 0 && (
        <View style={styles.noResultsContainer}>
          <Icon name="search" size={20} color="#ccc" />
          <Text style={styles.noResultsText}>
            No products found for '{searchQuery}'
            {selectedCity && selectedCity !== 'Cebu' && ` in ${selectedCity}`}
          </Text>
        </View>
      )}
  
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={renderProductItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          key={"searched-products"}
        />
      )}
  
  {searchQuery.length === 0 && (
  <>
            {loadingCategories ? (
            <ActivityIndicator size="large" color="#05652D" style={styles.loadingIndicator} />
          ) : categories.length > 0 ? (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.categoryText}>Categories</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category, index) => (
                  <TouchableOpacity key={index} onPress={() => handleCategoryPress(category)} style={styles.categoryItem}>
                    <Text>{category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noResultsContainer}>
              <Icon name="search" size={20} color="#ccc" />
              <Text style={styles.noResultsText}>No categories found.</Text>
            </View>
          )}
    {loadingRecommended ? (
      <ActivityIndicator size="large" color="#05652D" style={styles.loadingIndicator} />
    ) : recommendedProducts.length > 0 ? (
      <>
        <Text style={styles.recommendedText}>Products You May Like</Text>
        <FlatList
          data={recommendedProducts}
          renderItem={renderLikeProductItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.recommendedContainer}
        />
      </>
    ) : (
      <View style={styles.noResultsContainer}>
        <Icon name="search" size={50} color="#ccc" />
        <Text style={styles.noResultsText}>No products found in {selectedCity}.</Text>
      </View>
    )}
  </>
)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#05652D',
    borderRadius: 10,
  },
  searchImageButton: {
    marginRight: 10,
  },
  switchButton: {
    marginRight: 10,
    borderColor: '#05652D',
    borderWidth: 2,
    paddingHorizontal: 2,
    paddingVertical: 10,
    borderRadius: 20,
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productCard: {
    width: '50%',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    marginBottom: 10,
    borderRadius: 8,
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
  searchingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
  },
  searchIcon: {
    position: 'absolute',
    right: 10,
    width: 20,
    height: 20,
  },
  switchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  filterText: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  filterIcon: {
    marginRight: 5,
  },
  recommendedText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 20,
  },
  categoryText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recommendedContainer: {
    paddingHorizontal: 10,
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  suggestionItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#E0F7FA',
    borderRadius: 10,
  },
   categoryItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  switchContainer: {
    backgroundColor: '#088F8F',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  filterText: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
  
});

export default SearchProducts;