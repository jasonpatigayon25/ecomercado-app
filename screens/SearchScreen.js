import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, limit, getDocs, doc, runTransaction, orderBy, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';

const SearchScreen = ({ navigation, route }) => {
  
  useEffect(() => {
    if (route.params?.searchQuery) {
      setSearchText(route.params.searchQuery);
      handleSearch(route.params.searchQuery);
    }
  }, [route.params?.searchQuery]);
  const [searchText, setSearchText] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [randomProducts, setRandomProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [recentSearches, setRecentSearches] = useState([]);

  const saveSearchQuery = async (query) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user) {
      const recentSearchRef = doc(collection(db, 'recentSearches'));
      await setDoc(recentSearchRef, {
        userId: user.uid,
        userEmail: user.email,
        query: query,
        timestamp: new Date()
      });
    }
  };

  const fetchRecentSearches = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user) {
      const recentSearchesRef = collection(db, 'recentSearches');
      const q = query(
        recentSearchesRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(3)
      );
      const querySnapshot = await getDocs(q);
      const searches = querySnapshot.docs.map(doc => doc.data().query);
      setRecentSearches(searches);
    }
  };
  
  useEffect(() => {
    fetchRecentSearches();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const suggestionsRef = collection(db, "products");
      const suggestionsQuery = query(suggestionsRef, limit(5));
      const suggestionsSnapshot = await getDocs(suggestionsQuery);
      return suggestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };
  
    const fetchRandomProducts = async (suggestions) => {
      if (!suggestions) {
        return;
      }
    
      const randomProductsRef = collection(db, "products");
      const randomProductsQuery = query(
        randomProductsRef,
        where("publicationStatus", "not-in", ["decline", "pending"]),
        limit(10)
      );
      const randomProductsSnapshot = await getDocs(randomProductsQuery);
      const randomProducts = randomProductsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(product => !suggestions.some(suggestion => suggestion.id === product.id))
        .slice(0, 5);
    
      setRandomProducts(randomProducts);
    };
  
    const fetchData = async () => {
      const fetchedSuggestions = await fetchSuggestions();
      setProductSuggestions(fetchedSuggestions);
      await fetchRandomProducts(fetchedSuggestions);
    };
  
    fetchData();
  }, []);
  
  const incrementProductHit = async (productId) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user logged in");
      return;
    }
  
    const userEmail = user.email;
    const hitRef = doc(db, 'searchHits', productId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const hitDoc = await transaction.get(hitRef);
        const data = hitDoc.data();
        const users = data ? (data.users || []) : []; 
        if (!hitDoc.exists() || !users.includes(userEmail)) {
          const newHits = data && data.hits ? data.hits + 1 : 1;
          const updatedUsers = users.includes(userEmail) ? users : [...users, userEmail];
          transaction.set(hitRef, { hits: newHits, users: updatedUsers, productId: productId }, { merge: true });
        }
      });
    } catch (error) {
      console.error("Error updating product hits:", error);
    }
  };

  const incrementUserRecommendHit = async (productId) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user logged in");
      return;
    }
  
    const userId = user.uid;
    const userEmail = user.email;
    const hitRef = doc(db, 'userRecommend', userId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const hitDoc = await transaction.get(hitRef);
        const data = hitDoc.data();
        const productHits = data ? (data.productHits || {}) : {};
  
        if (!hitDoc.exists() || (productHits[productId] || 0) < 10) {
          const newCount = (productHits[productId] || 0) + 1;
          productHits[productId] = newCount;
          transaction.set(hitRef, { productHits, userEmail }, { merge: true });
        }
      });
    } catch (error) {
      console.error("Error updating user recommendations:", error);
    }
  };

  const handleProductSelect = async (product) => {
    await incrementProductHit(product.id);
    await incrementUserRecommendHit(product.id);
    navigation.navigate('ProductDetail', { product });
  };

  const handleSearchPress = () => {
    const trimmedSearchText = searchText.trim();
  
    if (trimmedSearchText === '') {
      return;
    }
  
    // Navigate to SearchScreen with the searchQuery parameter
    navigation.navigate('SearchResults', { searchQuery: trimmedSearchText });
  };

  const handleSearch = async () => {
    if (searchText.trim() === '') {
      setProductSuggestions([]);
      setRandomProducts([]);
      setSearchResults([]);
      setLoading(false);
      return;
    }
  
    setLoading(true);
  
    const productRef = collection(db, "products");
  
    try {
      const nameQuery = query(
        productRef,
        where("name", ">=", searchText),
        where("name", "<=", searchText + '\uf8ff')
      );
      const nameQuerySnapshot = await getDocs(nameQuery);
  
      const combinedResults = {};
      nameQuerySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.publicationStatus !== "decline" && data.publicationStatus !== "pending") {
          combinedResults[doc.id] = { id: doc.id, ...data };
        }
      });

      const categoryQuery = query(
        productRef,
        where("category", ">=", searchText),
        where("category", "<=", searchText + '\uf8ff')
      );
      const categoryQuerySnapshot = await getDocs(categoryQuery);
      categoryQuerySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.publicationStatus !== "decline" && data.publicationStatus !== "pending" && !combinedResults[doc.id]) {
          combinedResults[doc.id] = { id: doc.id, ...data };
        }
      });
  
      setSearchResults(Object.values(combinedResults));
    } catch (error) {
      console.error("Error searching products:", error);
      setSearchResults([]);
    }
  
    setLoading(false);
  };
  

  useEffect(() => {
    if (searchText.trim().length > 0) {
      handleSearch(searchText);
    } else {
      setSearchResults([]); 
    }
  }, [searchText]);

  const ProductItem = ({ product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleProductSelect(product)}
    >
      <Image source={{ uri: product.photo }} style={styles.productImage} />
      <Text 
        style={styles.productName}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {product.name}
      </Text>
      <Text 
        style={styles.productPrice}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        ₱{product.price}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItems = () => {
    if (loading) {
      return;
    }

    if (searchResults.length === 0) {
      return null; 
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductItem product={item} />}
      />
    );
  };

  const renderItem = ({ item, index }) => {
    if (item.type === 'sectionTitle') {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    } else if (item.type === 'recentSearch') {
      return (
        <TouchableOpacity key={index} onPress={() => setSearchText(item.query)}>
          <Text style={styles.recentSearchItem}>{item.query}</Text>
        </TouchableOpacity>
      );
    } else if (item.type === 'product') {
      return <ProductItem product={item} />;
    } else if (item.type === 'suggestion') {
      return (
        <TouchableOpacity onPress={() => setSearchText(item.name)}>
          <Text style={styles.suggestionItem}>{item.name}</Text>
        </TouchableOpacity>
      );
    }
  };
  
  const renderListData = () => {
    const combinedData = [];
    if (recentSearches.length > 0 && searchText.trim().length === 0) {
      combinedData.push({ type: 'sectionTitle', title: 'Recent Searches', id: 'recentSearches' });
      recentSearches.forEach((search, index) => combinedData.push({ 
        type: 'recentSearch', 
        query: search, 
        id: `recent_${search}_${index}` 
      }));
    }
    if (searchText.trim().length === 0) {
      combinedData.push({ type: 'sectionTitle', title: 'Suggestions', id: 'suggestions' });
      productSuggestions.forEach(suggestion => combinedData.push({ type: 'suggestion', ...suggestion }));
      combinedData.push({ type: 'sectionTitle', title: 'Products You Might Like', id: 'randomProducts' });
      randomProducts.forEach(product => combinedData.push({ type: 'product', ...product }));
    }
    return combinedData;
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search Products"
        value={searchText}
        onChangeText={setSearchText}
        onSubmitEditing={handleSearchPress}
        autoFocus={true}
        returnKeyType="search"
      />
      <TouchableOpacity
        style={styles.searchDonationButton}
        onPress={() => navigation.navigate('SearchDonationScreen')}
      >
        <Icon name="search" size={18} color="#05652D" style={styles.icon} />
        <Text style={styles.searchDonationButtonText}>Search for Donations</Text>
        <Icon2 name="hand-heart" size={18} color="#05652D" style={styles.icon} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Wish')} style={styles.wishlistButton}>
        <Image
          source={require('../assets/wishlist2.png')}
          style={styles.wishlistIcon}
        />
      </TouchableOpacity>
      {renderProductItems()}
      <FlatList
        data={renderListData()}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={() => loading ? <Text>Loading...</Text> : null}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 25,
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  randomProductsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  productName: {
    fontWeight: 'bold',
  },
  productPrice: {
    marginLeft: 'auto',
  },
  searchDonationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    width: 210,
    borderColor: '#E0E0E0',
  },
  searchDonationButtonText: {
    color: '#05652D',
  },
  icon: {
    marginHorizontal: 5,
  },
  wishlistButton: {
    position: 'absolute',
    right: 25,
    top: 15,
  },
  wishlistIcon: {
    width: 32,
    height: 32,
  },
  recentSearchesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  recentSearchItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    paddingLeft: 10,
  },
  recentSearchItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});

export default SearchScreen;
