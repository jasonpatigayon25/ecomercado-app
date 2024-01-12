import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, SafeAreaView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import CartModal from './CartModal';

const Cart = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const auth = getAuth();
  const user = auth.currentUser;
  const [productListeners, setProductListeners] = useState([]);

  useEffect(() => {
    if (user) {
      const cartRef = doc(db, 'carts', user.email);
      const unsubscribeCart = onSnapshot(cartRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const cartData = docSnapshot.data().cartItems || [];
          setCartItems(cartData);
          setupProductListeners(cartData);
        } else {
          setCartItems([]);
          productListeners.forEach(unsubscribe => unsubscribe());
          setProductListeners([]);
        }
      });

      return () => {
        unsubscribeCart();
        productListeners.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [user]);

  const setupProductListeners = (cartData) => {
    productListeners.forEach(unsubscribe => unsubscribe()); 
  
    const newListeners = cartData.map((cartItem) => {
      const productRef = doc(db, 'products', cartItem.productId);
      return onSnapshot(productRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedProduct = docSnapshot.data();
          setCartItems((currentItems) =>
            currentItems.map((item) =>
              item.productId === cartItem.productId
                ? { 
                    ...item, 
                    availableQuantity: updatedProduct.quantity, 
                    userQuantity: item.userQuantity || 1 
                  }
                : item
            )
          );
        }
      });
    });
  
    setProductListeners(newListeners);
  };
  
  const incrementQuantity = (productId) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId && item.userQuantity < item.availableQuantity
          ? { ...item, userQuantity: item.userQuantity + 1 }
          : item
      )
    );
  };

  const decrementQuantity = (productId) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId && item.userQuantity > 1
          ? { ...item, userQuantity: item.userQuantity - 1 }
          : item
      )
    );
  };

  

  const handleSelectItem = (productId) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(productId)) {
      newSelectedItems.delete(productId);
    } else {
      newSelectedItems.add(productId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map((item) => item.productId)));
    }
  };

  const handleCheckout = () => {
    const selectedProductsWithQuantities = cartItems
      .filter(item => selectedItems.has(item.productId))
      .map(item => ({
        ...item,
        orderedQuantity: item.userQuantity,
        orderedPrice: item.userQuantity * item.price
      }));

    const isUnavailable = selectedProductsWithQuantities.some(item => item.availableQuantity === 0);
  
    if (isUnavailable) {
      Alert.alert("Unavailable", "Cannot proceed to checkout because one or more selected items are not available.");
      return;
    }
  
    if (selectedProductsWithQuantities.length > 0) {
      navigation.navigate('CheckoutProducts', { selectedProducts: selectedProductsWithQuantities });
    } else {
      Alert.alert("No product selected", "Please select at least one product to checkout");
    }
  };
  
  
  const renderEmptyCart = () => (
    <View style={styles.emptyCartContainer}>
      <Icon name="shopping-cart" size={50} color="#ccc" />
      <Text style={styles.emptyCartText}>No Cart Yet</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemLeftSection}>
        <View style={styles.imageCheckboxContainer}>
          <TouchableOpacity onPress={() => handleSelectItem(item.productId)}>
            <Icon
              name={selectedItems.has(item.productId) ? 'check-square' : 'square'}
              size={24}
              color="#05652D"
            />
          </TouchableOpacity>
          <Image source={{ uri: item.photo }} style={styles.cartImage} />
        </View>
        <View style={styles.quantityControl}>
          <TouchableOpacity onPress={() => decrementQuantity(item.productId)}>
            <Icon name="minus" size={20} color="#05652D" />
          </TouchableOpacity>
          <Text style={styles.cartQuantity}>{item.userQuantity}</Text>
          <TouchableOpacity onPress={() => incrementQuantity(item.productId)}>
            <Icon name="plus" size={20} color="#05652D" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cartDetails}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartPrice}>₱{parseFloat(item.price).toFixed(2)}</Text>
        <Text style={styles.cartCategory}>{item.category}</Text>
        <Text style={styles.cartDescription}>Available Quantity: {item.availableQuantity}</Text>
        <Text style={styles.cartDescription}>Seller: {item.seller_email}</Text>
        <Text style={styles.cartDescription}>Location: {item.location}</Text>
        <Text 
          style={styles.cartDescription}
          numberOfLines={1}
          ellipsizeMode='tail'
        >
          {item.description}
        </Text>
      </View>
    </View>
  );

  const handleRemoveSelected = () => {
    if (selectedItems.size === 0) {
      Alert.alert('No items selected', 'Please select items to remove.');
      return;
    }
  
    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove the selected items?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => removeItems(),
        },
      ],
    );
  };
  
  const removeItems = () => {
    const newCartItems = cartItems.filter(item => !selectedItems.has(item.productId));
  
    const cartRef = doc(db, 'carts', user.email);
    updateDoc(cartRef, { cartItems: newCartItems });

    setCartItems(newCartItems);
    setSelectedItems(new Set()); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Wish')} style={styles.wishlistButton}>
          <Image
            source={require('../assets/wishlist.png')}
            style={styles.wishlistIcon}
          />
        </TouchableOpacity>
      </View>
      {cartItems.length === 0 && renderEmptyCart()}
      <FlatList
        data={cartItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.productId}_${index}`}
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.selectAllButton}
        onPress={handleSelectAll}>
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveSelected}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        <TouchableOpacity onPress={handleCheckout}>
          <View style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Check Out</Text>
          </View>
        </TouchableOpacity>
      </View>
      <CartModal
        item={currentItem}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  backButton: {
    padding: 5,
    marginLeft: 5,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemLeftSection: {
    flexDirection: 'column',
    marginRight: 15,
    alignItems: 'center',
  },
  imageCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginLeft: 10,
  },
  cartDetails: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginHorizontal: 10,
    paddingRight: 20, 
  },
  cartName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  cartPrice: {
    color: '#05652D',
    fontSize: 16,
    fontWeight: '600',
  },
  cartCategory: {
    fontSize: 12,
    color: '#787878',
  },
  cartDescription: {
    fontSize: 10,
    color: '#787878',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  selectAllButton: {
    backgroundColor: '#fff', 
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: '#05652D',
  },
  selectAllText: {
    color: '#05652D',
    textAlign: 'center',
    fontSize: 16,
  },
  checkoutButton: {
    backgroundColor: '#05652D',
    padding: 10,
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: '#05652D' ,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyCartText: {
    fontSize: 20,
    color: '#ccc',
    marginTop: 10,
  },
  wishlistButton: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  wishlistIcon: {
    width: 32,
    height: 32,
  },
  viewDetailsButton: {
    position: 'absolute', 
    top: 10, 
    right: 10,
    backgroundColor: '#05652D',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewDetailsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#fff', 
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: '#D32F2F' ,
  },
  removeButtonText: {
    color: '#D32F2F',
    textAlign: 'center',
    fontSize: 16,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15, 
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  cartQuantity: {
    marginHorizontal: 5,
    fontSize: 16,
  },
});

export default Cart;