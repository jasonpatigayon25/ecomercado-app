import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const CategoryResultsDonation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryName } = route.params;
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const q = query(
          collection(db, 'donation'),
          where('category', '==', categoryName),
          where('publicationStatus', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        const fetchedDonations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDonations(fetchedDonations);
      } catch (error) {
        console.error("Error fetching donations: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [categoryName]);

  const DonationItem = ({ donation }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('DonationDetail', { donation })}
      style={styles.productCard}
    >
      <Image source={{ uri: donation.photo }} style={styles.productImage} />
      {donation.subPhotos && donation.subPhotos.length > 0 && (
                    <View style={styles.subPhotosContainer}>
                      {donation.subPhotos.slice(0, 3).map((subPhoto, index) => (
                        <Image key={index} source={{ uri: subPhoto }} style={styles.subPhoto} />
                      ))}
                      {donation.subPhotos.length > 3 && (
                        <Text style={styles.morePhotosIndicator}>+{donation.subPhotos.length - 3} more</Text>
                      )}
                    </View>
                  )}
      <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{donation.name}</Text>
      <Text style={styles.productPrice}>{donation.itemNames.join(' · ')}</Text>
      <Text style={styles.productCategory}>{donation.category}</Text>
    </TouchableOpacity>
  );

  const renderDonations = () => {
    let filteredDonations = donations;
    if (searchQuery) {
      filteredDonations = donations.filter(donation =>
        donation.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (loading) {
      return <ActivityIndicator size="large" color="#0000ff" />;
    }

    if (filteredDonations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon5 name="heart" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No donations found</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.productsContainer}>
        {filteredDonations.map((donation) => (
          <DonationItem key={donation.id} donation={donation} />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Category: {categoryName} Bundle</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by donation name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {renderDonations()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButton: {
    marginRight: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#808080',
    marginTop: 10,
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
  productPrice: {
    color: '#05652D',
    fontSize: 12,
    marginLeft: 5,
  },
  searchInput: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
});

export default CategoryResultsDonation;
