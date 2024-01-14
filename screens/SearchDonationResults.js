import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const SearchDonationResults = ({ route, navigation }) => {
  const { searchQuery } = route.params;
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      
      try {
        const donationsQuery = query(
          collection(db, "donation"),
          where("name", ">=", searchQuery),
          where("name", "<=", searchQuery + '\uf8ff')
        );
        const querySnapshot = await getDocs(donationsQuery);
        const searchedDonations = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(donation => donation.isDonated !== true); 

        setDonations(searchedDonations);
      } catch (error) {
        console.error("Error fetching donations:", error);
        // Handle the error appropriately
      }

      setLoading(false);
    };

    fetchDonations();
  }, [searchQuery]);

  const DonationItem = ({ donation }) => (
    <TouchableOpacity
      style={styles.donationItem}
      onPress={() => navigation.navigate('DonationDetail', { donation })}>
      <Image source={{ uri: donation.photo }} style={styles.donationImage} />
      <View style={styles.donationInfo}>
        <Text 
          style={styles.donationName}
          numberOfLines={1}
          ellipsizeMode="tail">{donation.name}</Text>
        <Text style={styles.donationLocation}
          numberOfLines={1}
          ellipsizeMode="tail">{donation.location}</Text>
        <Text style={styles.donationMessage}
          numberOfLines={1}
          ellipsizeMode="tail">{donation.message}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Results for "{searchQuery}"</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <>
          <FlatList
            data={donations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <DonationItem donation={item} />}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Icon name="search" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No Results Found</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  donationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
  },
  donationImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 10,
  },
  donationInfo: {
    flex: 1,
  },
  donationName: {
    fontWeight: 'bold',
  },
  donationLocation: {
    color: 'grey',
  },
  donationMessage: {
    fontStyle: 'italic',
    color: '#333',
    fontSize: 12,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
  },
});

export default SearchDonationResults;