import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  useEffect(() => {
    if (!categoryName) {
      console.error("Category name is undefined or not passed correctly");
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
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

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const ProductItem = ({ product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => navigation.navigate('ProductDetail', { product })}
    >
      <Image source={{ uri: product.photo }} style={styles.productImage} />
      <View style={styles.productInfo}>
      <Text 
        style={styles.productName}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {product.name}
      </Text>
      <Text 
        style={styles.productPrice}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        ₱{product.price}
      </Text>
      <Text 
        style={styles.productDescription}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {product.description}
      </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <Text style={styles.header}>Category: "{categoryName}"</Text>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="shopping-basket" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No Products Yet</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductItem product={item} />}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyComponent} 
    />
  );
};

const styles = StyleSheet.create({
   container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center', 
    flex: 1, 
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: 'bold',
  },
  productPrice: {
    color: 'green',
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
    marginTop: 10,
  },
  productDescription: {
    fontStyle: 'italic',
    color: '#333',
    fontSize: 12,
    overflow: 'hidden',
  },
});

export default CategoryResults;
