import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList, Image, ScrollView, Animated  } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { query, where, getDocs, collection, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const SearchProducts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const navigation = useNavigation();
  const searchInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const handleSearch = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          limit(5),
          orderBy('name'),
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(product => product.publicationStatus === 'approved');
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching products: ", error);
      }
    };
  
    if (searchQuery) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      try {
        const recommendedQ = query(
          collection(db, 'products'),
          limit(5)
        );
        const recommendedSnapshot = await getDocs(recommendedQ);
        const recommendedResults = recommendedSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(product => product.publicationStatus === 'approved');
      setRecommendedProducts(recommendedResults);
      } catch (error) {
        console.error("Error fetching recommended products: ", error);
      }
    };

    fetchRecommendedProducts();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          limit(5),
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

  const navigateToProduct = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const navigateToWish = () => {
    navigation.navigate('Wish');
  };

  const navigateToSearchDonation = () => {
    navigation.navigate('SearchDonations');
  };

  const navigateToSearchResults = () => {
    navigation.navigate('SearchProductResults', { searchQuery: searchQuery });
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchQuery(suggestion);
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
    return null; // Do not render anything if the product is not approved
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
        <TouchableOpacity style={styles.filterContainer} onPress={() => {  }}>
          <Text style={styles.filterText}>Cebu <Icon name="filter" size={20} color="#666" /></Text>
        </TouchableOpacity>
      </View>

      <View style={styles.textContainer}>
        {searchQuery.length > 0 && (
          <Text style={styles.searchingText}>Searching for "{searchQuery}"</Text>
        )}
      </View>



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

      {searchQuery.length === 0 && recommendedProducts.length > 0 && (
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
});

export default SearchProducts;