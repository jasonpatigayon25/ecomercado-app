import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';

const CategorizedProduct = ({ route, navigation }) => {
  const { categoryTitle, sellerName, email } = route.params; 
  const [categoryItems, setCategoryItems] = useState([]);

  useEffect(() => {
    const fetchCategoryItems = async () => {
      try {
        const q = query(collection(db, 'products'), 
                        where('category', '==', categoryTitle),
                        where('seller_email', '==', email), 
                        where('publicationStatus', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategoryItems(items);
      } catch (error) {
        console.error('Error fetching category items:', error);
      }
    };

    fetchCategoryItems();
  }, [categoryTitle, email]);  

  const handleProductSelect = (item) => {
    navigation.navigate('ProductDetail', { product: item });
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
          {categoryItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products yet in this category</Text>
            </View>
          ) : (
            categoryItems.map((item) => (
              <TouchableOpacity key={item.id}
              onPress={() => handleProductSelect(item)}  style={styles.productCard}>
                <Image source={{ uri: item.photo }} style={styles.productImage} />
                <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                <Text style={styles.productCategory}>{item.category}</Text>
                <Text style={styles.productPrice}>₱{item.price}</Text>
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
    fontSize: 14,
    fontWeight: 'bold',
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

export default CategorizedProduct;
