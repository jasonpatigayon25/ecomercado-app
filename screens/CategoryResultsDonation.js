import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const CategoryResultsDonation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryName } = route.params;
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      const q = query(
        collection(db, 'donation'),
        where('category', '==', categoryName),
        where('publicationStatus', '==', 'approved')
      );
      try {
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

  const DonationItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('DonationDetail', { donation: item })}
      style={styles.productCard}
    >
      <Image source={{ uri: item.photo }} style={styles.productImage} />
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productCategory}>{item.category}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (donations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="shopping-basket" size={50} color="#ccc" />
        <Text style={styles.emptyText}>No donations yet in this category</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.productsContainer}>
        {donations.map((donation) => (
          <DonationItem key={donation.id} item={donation} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
});

export default CategoryResultsDonation;
