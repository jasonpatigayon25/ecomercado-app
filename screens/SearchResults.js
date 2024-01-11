import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { runTransaction, doc } from 'firebase/firestore';

const SearchResults = ({ route, navigation }) => {
  const { searchQuery } = route.params;
  const [products, setProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [relatedLimit, setRelatedLimit] = useState(5);
  const [categoryMatch, setCategoryMatch] = useState(null);

  const showMoreRelatedProducts = () => {
    setRelatedLimit(oldLimit => oldLimit + 5);
  };

  const incrementProductHit = async (productId) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user logged in");
      return;
    }
  
    const userEmail = user.email;
    const hitRef = doc(db, 'searchHits', productId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const hitDoc = await transaction.get(hitRef);
        const data = hitDoc.data();
        const users = data ? (data.users || []) : [];
        if (!hitDoc.exists() || !users.includes(userEmail)) {
          const newHits = data && data.hits ? data.hits + 1 : 1;
          const updatedUsers = users.includes(userEmail) ? users : [...users, userEmail];
          transaction.set(hitRef, { hits: newHits, users: updatedUsers, productId: productId }, { merge: true });
        }
      });
    } catch (error) {
      console.error("Error updating product hits:", error);
    }
  };

  const incrementUserRecommendHit = async (productId) => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user logged in");
      return;
    }
  
    const userId = user.uid;
    const userEmail = user.email;
    const hitRef = doc(db, 'userRecommend', userId);
  
    try {
      await runTransaction(db, async (transaction) => {
        const hitDoc = await transaction.get(hitRef);
        const data = hitDoc.data();
        const productHits = data ? (data.productHits || {}) : {};
  
        if (!hitDoc.exists() || (productHits[productId] || 0) < 10) {
          const newCount = (productHits[productId] || 0) + 1;
          productHits[productId] = newCount;
          transaction.set(hitRef, { productHits, userEmail }, { merge: true });
        }
      });
    } catch (error) {
      console.error("Error updating user recommendations:", error);
    }
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="search" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No Results Found</Text>
    </View>
  );

  const fetchCategoryProducts = async (category) => {
    const q = query(collection(db, "products"), where("category", "==", category));
    const snapshot = await getDocs(q);
    const categoryProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRelatedProducts(categoryProducts);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const q = query(collection(db, "products"));
      const querySnapshot = await getDocs(q);
      const searchedProducts = [];
      let matchedCategory = null;
  
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        if (product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          searchedProducts.push(product);
          if (!matchedCategory) {
            matchedCategory = product.category;
          }
        }
        if (product.category.toLowerCase() === searchQuery.toLowerCase()) {
          matchedCategory = product.category;
        }
      });
  
      setProducts(searchedProducts);
      setLoading(false);
      setCategoryMatch(matchedCategory);
  
      if (matchedCategory) {
        fetchCategoryProducts(matchedCategory);
      }
    };
  
    fetchProducts();
  }, [searchQuery]);

  const ProductItem = ({ product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={async () => {
        await incrementProductHit(product.id);
        navigation.navigate('ProductDetail', { product });
      }}
    >
      <Image source={{ uri: product.photo }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text
          style={styles.productName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Name: {product.name}
        </Text>
        <Text
          style={styles.productPrice}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Price: ₱{product.price}
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
      <Text style={styles.header} numberOfLines={1} ellipsizeMode="tail">
        Results for "{searchQuery}"
      </Text>
    </View>
  );

  const renderRelatedProducts = () => {
    if (relatedProducts.length > 0 && categoryMatch) {
      return (
        <>
          <Text style={styles.relatedTitle}>
            Products Related to "{searchQuery}"
          </Text>
          <FlatList
            data={relatedProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ProductItem product={item} />}
          />
        </>
      );
    }
    return null;
  };

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductItem product={item} />}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderRelatedProducts}
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
  productDescription: {
    fontStyle: 'italic',
    color: '#333',
    fontSize: 12,
    overflow: 'hidden',
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  showMoreButton: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#E3FCE9',
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 40,
    borderWidth: 1,
  },
  showMoreButtonText: {
    color: '#000',
    fontWeight: 'bold',
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
});

export default SearchResults;