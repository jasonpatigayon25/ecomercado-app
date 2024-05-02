import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const CategoryResults = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryName } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categoryName) {
        console.error("Category name is undefined or not passed correctly");
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'products'),
          where('category', '==', categoryName),
          where('publicationStatus', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryName]);

  const ProductItem = ({ product }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ProductDetail', { product })}
      style={styles.productCard}
    >
      <Image source={{ uri: product.photo }} style={styles.productImage} />
      <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
      <Text style={styles.productCategory}>{product.category}</Text>
      <Text style={styles.productPrice}>₱{product.price}</Text>
    </TouchableOpacity>
  );

  const renderProducts = () => {
    let filteredProducts = products;
    if (searchQuery) {
      filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (loading) {
      return <ActivityIndicator size="large" color="#0000ff" />;
    }

    if (filteredProducts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="shopping-basket" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No Products Found</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.productsContainer}>
        {filteredProducts.map((product) => (
          <ProductItem key={product.id} product={product} />
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
        <Text style={styles.headerText}>Category: {categoryName}</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by product name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {renderProducts()}
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
  searchInput: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
});

export default CategoryResults;