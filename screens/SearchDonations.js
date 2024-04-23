import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { query, where, getDocs, collection, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const SearchDonations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recommendedDonations, setRecommendedDonations] = useState([]);
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
        const nameQuery = query(
          collection(db, 'donation'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          limit(5),
          orderBy('name'),
        );
  
        const itemNameQuery = query(
          collection(db, 'donation'),
          where('itemNames', 'array-contains-any', [searchQuery]), // Change array-contains to array-contains-any
          limit(5),
        );
  
        const [nameResults, itemNameResults] = await Promise.all([
          getDocs(nameQuery),
          getDocs(itemNameQuery),
        ]);
  
        const nameData = nameResults.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const itemNameData = itemNameResults.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
        const results = [...nameData, ...itemNameData];
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching donations: ", error);
      }
    };
  
    if (searchQuery) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const fetchRecommendedDonations = async () => {
      try {
        const recommendedQ = query(
          collection(db, 'donation'),
          limit(5)
        );
        const recommendedSnapshot = await getDocs(recommendedQ);
        const recommendedResults = recommendedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecommendedDonations(recommendedResults);
      } catch (error) {
        console.error("Error fetching recommended donations: ", error);
      }
    };

    fetchRecommendedDonations();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, 'donation'),
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

  const navigateToDonationDetail = (donation) => {
    navigation.navigate('DonationDetail', { donation });
  };

  const navigateToWish = () => {
    navigation.navigate('Wish');
  };

  const navigateToSearchResults = () => {
    navigation.navigate('SearchDonationResults', { searchQuery });
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchQuery(suggestion);
  };

  const renderDonationItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigateToDonationDetail(item)} style={styles.productCard}>
      <Image source={{ uri: item.photo }} style={styles.productImage} />
      {item.subPhotos && item.subPhotos.length > 0 && (
        <View style={styles.subPhotosContainer}>
          {item.subPhotos.slice(0, 3).map((subPhoto, index) => (
            <Image key={index} source={{ uri: subPhoto }} style={styles.subPhoto} />
          ))}
          {item.subPhotos.length > 3 && (
            <Text style={styles.morePhotosIndicator}>+{item.subPhotos.length - 3} more</Text>
          )}
        </View>
      )}
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.itemNames.join(' · ')}</Text>
      <Text style={styles.productCategory}>{item.category} Bundle</Text>
    </TouchableOpacity>
  );

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
          placeholder="Search donations..."
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
      <View style={styles.textContainer}>
        {searchQuery.length > 0 && (
          <Text style={styles.searchingText}>Searching for "{searchQuery}"</Text>
        )}
      </View>
      <View style={styles.filterContainer}>
        <Text style={styles.filterText}>Cebu<Icon name="filter" size={20} color="#666" style={styles.filterIcon} /></Text>
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
          renderItem={renderDonationItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          key={"searched-donations"}
        />
      )}

      {searchQuery.length === 0 && recommendedDonations.length > 0 && (
        <>
          <Text style={styles.recommendedText}>Donations You Can Request</Text>
          <FlatList
            data={recommendedDonations}
            renderItem={renderDonationItem}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            key={"searched-donations"}
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
  wishButton: {
    padding: 10,
    marginLeft: 10,
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
  },
  donationCard: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  donationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 6,
  },
  itemNamesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#ECECEC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginVertical: 2,
    marginHorizontal: 2,
    textAlign: 'center',
  },
  donationCategory: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-start',
  },
  searchingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 50,
    right: 10,
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
  subPhotosContainer: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  subPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 2,
  },
  morePhotosIndicator: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 6,
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
  searchImageButton: {
    padding: 10,
  },
});

export default SearchDonations;
