import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome';

const SearchDonationScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [randomDonations, setRandomDonations] = useState([]);

  useEffect(() => {
    const fetchRandomDonations = async () => {
      const donationsRef = collection(db, "donation");
      const q = query(donationsRef, limit(10)); 
      const querySnapshot = await getDocs(q);
      const donations = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(doc => !doc.isDonated); 
      setRandomDonations(donations.slice(0, 5));
    };
  
    fetchRandomDonations();
  }, []);
  
  const handleSearch = async () => {
    setLoading(true);
  
    try {
      const trimmedSearchText = searchText.trim();
      if (trimmedSearchText === '') {
        setSearchResults([]);
        setLoading(false);
        return;
      }
  
      const donationQuery = query(
        collection(db, "donation"),
        where("name", ">=", trimmedSearchText),
        where("name", "<=", trimmedSearchText + '\uf8ff')
      );
  
      const querySnapshot = await getDocs(donationQuery);
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(doc => !doc.isDonated); // Only include donations without 'isDonated' set to true
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching donations:", error);
      setSearchResults([]);
    }
  
    setLoading(false);
  };

  useEffect(() => {
    if (searchText.trim().length > 0) {
      handleSearch();
    }
  }, [searchText]);

  const DonationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.donationItem}
      onPress={() => navigation.navigate('DonationDetail', { donation: item })}
    >
      <Image source={{ uri: item.photo }} style={styles.donationImage} />
      <Text style={styles.donationName}
      numberOfLines={1}
      ellipsizeMode="tail">{item.name}</Text>
    </TouchableOpacity>
  );

  const handleSearchPress = () => {
    const trimmedSearchText = searchText.trim();

    if (trimmedSearchText === '') {
      return;
    }

    navigation.navigate('SearchDonationResults', { searchQuery: trimmedSearchText });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search Donations"
        value={searchText}
        onChangeText={setSearchText}
        onSubmitEditing={handleSearchPress}
        returnKeyType="search"
      />
            <TouchableOpacity
        style={styles.searchDonationButton}
        onPress={() => navigation.navigate('SearchScreen')}
      >
        <Icon name="search" size={18} color="#05652D" style={styles.icon} />
        <Text style={styles.searchDonationButtonText}>Search for Products</Text>
        <Icon name="shopping-cart" size={18} color="#05652D" style={styles.icon} />
      </TouchableOpacity>
      {loading && <Text>Loading...</Text>}
      {!loading && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DonationItem item={item} />}
        />
      )}
      {!loading && searchText.trim().length === 0 && (
        <>
          <Text style={styles.randomDonationsTitle}>Suggested Donations</Text>
          <FlatList
            data={randomDonations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <DonationItem item={item} />}
          />
        </>
      )}
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
  donationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  donationImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  donationName: {
    fontWeight: 'bold',
  },
  randomDonationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  placeholderText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
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
});

export default SearchDonationScreen;
