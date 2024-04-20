import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';

const CategorizedDonation = ({ route, navigation }) => {
  const { categoryTitle, sellerName } = route.params;
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    const fetchDonationsByCategory = async () => {
      const donationsQuery = query(collection(db, 'donation'), where('category', '==', categoryTitle));
      const donationsSnapshot = await getDocs(donationsQuery);
      const donationsList = donationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDonations(donationsList);
    };

    fetchDonationsByCategory();
  }, [categoryTitle]);

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
          {donations.map((donation) => (
            <TouchableOpacity
              key={donation.id}
              onPress={() => handleDonationSelect(donation)}
              style={styles.productCard}
            >
              <Image source={{ uri: donation.photo }} style={styles.productImage} />
              <Text style={styles.productName}>{donation.name}</Text>
              <Text style={styles.productPrice}>{donation.itemNames.join(' · ')}</Text>
              <Text style={styles.productCategory}>{donation.category} Bundle</Text>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 10,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
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
    fontSize: 14,
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
});

export default CategorizedDonation;
