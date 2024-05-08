import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { query, where, getDocs, collection, limit, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

const SearchDonations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recommendedDonations, setRecommendedDonations] = useState([]);
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
        const donationsQuery = query(
          collection(db, 'donation'),
          where('publicationStatus', '==', 'approved'),
          limit(50)
        );
  
        const donationsResults = await getDocs(donationsQuery);
        const currentLocation = selectedCity.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
  
        const filteredData = donationsResults.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(donation => 
            donation.location && donation.location.toLowerCase().includes(currentLocation) &&
            (donation.name.toLowerCase().includes(searchLower) ||
             (donation.itemNames && donation.itemNames.some(name => name.toLowerCase().includes(searchLower))))
          )
          .reduce((acc, current) => {
            
            const x = acc.find(item => item.id === current.id);
            if (!x) {
              return acc.concat([current]);
            } else {
              return acc;
            }
          }, []);
  
        setSearchResults(filteredData);
      } catch (error) {
        console.error("Error searching donations: ", error);
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

  useEffect(() => {
    const fetchRecommendedDonations = async () => {
      setLoadingRecommended(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
    
        if (!user) {
          console.error("No user logged in");
          return;
        }
  
        const userRecommendRef = doc(db, 'userRecommendDonation', user.uid);
        const userRecommendSnapshot = await getDoc(userRecommendRef);
        const donationHits = userRecommendSnapshot.exists() ? userRecommendSnapshot.data().donationHits || {} : {};
  
        const allDonationsQuery = query(
          collection(db, 'donation'),
          where('publicationStatus', '==', 'approved')
        );
        const allDonationsSnapshot = await getDocs(allDonationsQuery);
        let allDonations = allDonationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
        const currentLocation = selectedCity.toLowerCase();
        allDonations = allDonations
          .filter(donation => 
            donation.donor_email !== user.email &&
            donation.location && donation.location.toLowerCase().includes(currentLocation)
          )
          .sort((a, b) => (donationHits[b.id] || 0) - (donationHits[a.id] || 0));
  
        const topDonations = allDonations.slice(0, 3);
        const topDonorEmail = topDonations[0]?.donor_email;
    
        let donorDonations = allDonations.filter(donation => donation.donor_email === topDonorEmail);
        donorDonations = donorDonations.filter(donation => !topDonations.includes(donation));
    
        let otherDonations = allDonations.filter(donation => 
          donation.donor_email !== topDonorEmail && !topDonations.includes(donation)
        );
    
        const prioritizedRecommended = [...topDonations, ...donorDonations, ...otherDonations];
        setRecommendedDonations(prioritizedRecommended);
      } catch (error) {
        console.error("Error fetching recommended donations: ", error);
      } finally {
        setLoadingRecommended(false);
      }
    };
  
    fetchRecommendedDonations();
  }, [selectedCity]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const q = query(
          collection(db, 'donation'),
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

  const navigateToDonationDetail = async (donation) => {
    try {
      navigation.navigate('DonationDetail', { donation });
    
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error("No user logged in");
        return;
      }
  
      const userEmail = user.email;
  
      if (donation.donor_email === userEmail) {
        return;
      }
  
      const userRecommendRef = doc(db, 'userRecommendDonation', user.uid);
      const userRecommendSnapshot = await getDoc(userRecommendRef);
      const userRecommendData = userRecommendSnapshot.data();
  
      const updatedDonationHits = {
        ...(userRecommendData?.donationHits || {}),
        [donation.id]: (userRecommendData?.donationHits?.[donation.id] || 0) + 1,
      };
  
      await setDoc(userRecommendRef, { donationHits: updatedDonationHits, userEmail });
    } catch (error) {
      console.error("Error updating product count in userRecommend: ", error);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const q = query(collection(db, 'donationCategories'));
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
    navigation.navigate('WishDonation', { shouldOpenConfirmModal: true });
  };

  const navigateToSearchProducts = () => {
    navigation.navigate('SearchProducts');
  };


  const navigateToSearchResults = () => {
    navigation.navigate('SearchDonationResults', { searchQuery });
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchQuery(suggestion);
  };

  const handleCategoryPress = (category) => {
    setSearchQuery(category);
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
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.switchContainer} onPress={navigateToSearchProducts}>
          <Text style={styles.switchText}><Icon name="search" size={16} color="#fff" /> Search Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterContainer} onPress={() => navigation.navigate('MapLocationBasedDonation')}>
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
          <Text style={styles.noResultsText}>No donations found for '{searchQuery}'
          {selectedCity && selectedCity !== 'Cebu' && ` in ${selectedCity}`}</Text>
        </View>
      )}
  
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={renderDonationItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#05652D" />
      </View>
    ) : (
      <>
        {recommendedDonations.length > 0 ? (
          <>
            <Text style={styles.recommendedText}>Donations You Can Request</Text>
            <FlatList
              data={recommendedDonations}
              renderItem={renderDonationItem}
              keyExtractor={(item, index) => index.toString()}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.recommendedContainer}
            />
          </>
        ) : (
          <View style={styles.noResultsContainer}>
            <Icon name="search" size={20} color="#ccc" />
            <Text style={styles.noResultsText}>No donations found in {selectedCity}</Text>
          </View>
        )}
      </>
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  switchContainer: {
    backgroundColor: '#05652D',
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
  switchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 5,
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
  },
  categoryItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default SearchDonations;