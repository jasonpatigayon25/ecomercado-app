import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { query, where, getDocs, collection, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const SearchProductResults = () => {
  const [searchedItems, setSearchedItems] = useState([]);
  const [relatedItems, setRelatedItems] = useState([]);
  const route = useRoute();
  const { searchQuery } = route.params;
  const navigation = useNavigation();

  useEffect(() => {
    const fetchSearchedItems = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          orderBy('name'),
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSearchedItems(results);
      } catch (error) {
        console.error("Error fetching searched items: ", error);
      }
    };

    fetchSearchedItems();
  }, [searchQuery]);

  useEffect(() => {
    const fetchRelatedItems = async () => {
      try {
        const searchedItem = searchedItems[0]; 
        const q = query(
          collection(db, 'products'),
          orderBy('name'),
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(product => product.category === searchedItem?.category && product.publicationStatus === 'approved')
          .slice(0, 5);
        setRelatedItems(results);
      } catch (error) {
        console.error("Error fetching related items: ", error);
      }
    };
  
    if (searchedItems.length > 0) {
      fetchRelatedItems();
    }
  }, [searchedItems]);

  const navigateToProduct = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const renderSearchedItem = (item) => (
    <TouchableOpacity  onPress={() => navigateToProduct(item)} style={styles.productCard} key={item.id}>
      <Image source={{ uri: item.photo }} style={styles.productImage} />
      <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
      <Text style={styles.productCategory}>{item.category}</Text>
      <Text style={styles.productPrice}>₱{item.price}</Text>
    </TouchableOpacity>
  );

  const renderRelatedItem = (item) => (
    <TouchableOpacity  onPress={() => navigateToProduct(item)} style={styles.productCard} key={item.id}>
      <Image source={{ uri: item.photo }} style={styles.productImage} />
      <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
      <Text style={styles.productCategory}>{item.category}</Text>
      <Text style={styles.productPrice}>₱{item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.resultText}>Result for "{searchQuery}"</Text>
      </View>
      <ScrollView>
        <View style={styles.searchedItemsContainer}>
          {/* <Text style={styles.subHeaderText}>Searched Items</Text> */}
          <View style={styles.itemContainer}>
            {searchedItems.map(item => renderSearchedItem(item))}
          </View>
        </View>

        {relatedItems.length > 0 && (
          <View style={styles.relatedItemsContainer}>
            <Text style={styles.subHeaderText}>Products related to '{searchQuery}'</Text>
            <View style={styles.itemContainer}>
              {relatedItems.map(item => renderRelatedItem(item))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    // flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  subHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '50%',
    backgroundColor: '#f9f9f9',
    padding: 10,
    marginBottom: 10,
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
  searchedItemsContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  relatedItemsContainer: {
  },
});

export default SearchProductResults;