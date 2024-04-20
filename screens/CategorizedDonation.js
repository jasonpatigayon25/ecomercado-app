import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const CategorizedDonation = ({ route, navigation }) => {
  const { categoryTitle, sellerName, email } = route.params; // Now includes email
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    const fetchDonationsByCategory = async () => {
      const donationsQuery = query(
        collection(db, 'donation'),
        where('category', '==', categoryTitle),
        where('donor_email', '==', email),  // Filter donations by this specific email
        where('publicationStatus', '==', 'approved')
      );
      const donationsSnapshot = await getDocs(donationsQuery);
      const donationsList = donationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDonations(donationsList);
    };

    fetchDonationsByCategory();
  }, [categoryTitle, email]);  // Include email in dependency array

  const handleDonationSelect = (donation) => {
    navigation.navigate('DonationDetail', { donation });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>From: {sellerName}</Text>
      </View>
      <Text style={styles.title}>{categoryTitle}</Text>
      <ScrollView>
        <View style={styles.productsContainer}>
          {donations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No donations yet in this category</Text>
            </View>
          ) : (
            donations.map((donation) => (
              <TouchableOpacity
                key={donation.id}
                onPress={() => handleDonationSelect(donation)}
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
                <Text style={styles.productName}>{donation.name}</Text>
                <Text style={styles.productPrice}>{donation.itemNames.join(' · ')}</Text>
                <Text style={styles.productCategory}>{donation.category} Bundle</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 20,
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
});

export default CategorizedDonation;