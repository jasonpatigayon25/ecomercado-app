import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

const SearchProducts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const handleSearch = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          // where('publicationStatus', '==', 'approved'),
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const navigateToProduct = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const fetchRecommendations = async (userEmail) => {
    try {
      const recQuery = query(collection(db, 'userRecommend'), where('userEmail', '==', userEmail));
      const querySnapshot = await getDocs(recQuery);
      
      if (querySnapshot.empty) {
        // Fallback to other user's recommendations if current user has none
        const fallbackQuery = query(collection(db, 'userRecommend'), orderBy('userEmail'), limit(1));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        if (!fallbackSnapshot.empty) {
          processRecommendations(fallbackSnapshot.docs[0].data());
        }
      } else {
        processRecommendations(querySnapshot.docs[0].data());
      }
    } catch (error) {
      console.error("Error fetching recommendations: ", error);
    }
  };

  const processRecommendations = (recommendationsData) => {
    const sortedRecommendations = Object.entries(recommendationsData.productHits)
      .sort((a, b) => b[1] - a[1]) // Sort by click count descending
      .map(([productId, _]) => productId);
    
    fetchRecommendedProducts(sortedRecommendations);
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigateToProduct(item)} style={styles.productCard}>
      <Image source={{ uri: item.photo }} style={styles.productImage} />
      <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
      <Text style={styles.productCategory}>{item.category}</Text>
      <Text style={styles.productPrice}>₱{item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.searchButton}>
          <Icon name="search" size={20} color="#05652D" />
        </TouchableOpacity>
      </View>
      {searchQuery.length > 0 && (
        <Text style={styles.searchingText}>Searching for "{searchQuery}"</Text>
      )}
      <FlatList
        data={searchResults}
        renderItem={renderProductItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        key={"two-columns"}
      />
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
});

export default SearchProducts;