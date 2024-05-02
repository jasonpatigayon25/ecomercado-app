import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, SafeAreaView, Alert, SectionList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDoc, onSnapshot, updateDoc, getDocs, where, query } from 'firebase/firestore';
import CartModal from './CartModal';

const Cart = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const auth = getAuth();
  const user = auth.currentUser;
  const [productListeners, setProductListeners] = useState([]);
  const [sellerName, setSellerName] = useState('');

  useEffect(() => {
    const newTotalPrice = cartItems.reduce((acc, item) => {
      return selectedItems.has(item.productId) ? acc + (item.price * item.userQuantity) : acc;
    }, 0);
    setTotalPrice(newTotalPrice);
  }, [cartItems, selectedItems]);

  const fetchSellerName = async (sellerEmail) => {
    const sellerRef = collection(db, 'registeredSeller');
    const q = query(sellerRef, where("email", "==", sellerEmail));
    const querySnapshot = await getDocs(q);
    const sellerData = querySnapshot.docs.map(doc => doc.data());
    return sellerData.length > 0 ? sellerData[0].sellerName : '';
  };

  useEffect(() => {
    if (user) {
      const cartRef = doc(db, 'carts', user.email);
      const unsubscribeCart = onSnapshot(cartRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          let cartData = docSnapshot.data().cartItems || [];
          
          cartData.sort((a, b) => b.dateCarted.seconds - a.dateCarted.seconds);
          setCartItems(cartData);
          setupProductListeners(cartData);
          fetchSellerName(user.email).then(sellerName => {
            setSellerName(sellerName);
          });
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
      const initializedCartItem = {
        ...cartItem,
        userQuantity: cartItem.userQuantity || 1,
      };
  
      const productRef = doc(db, 'products', cartItem.productId);
      const unsubscribe = onSnapshot(productRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedProduct = docSnapshot.data();
          const sellerName = await fetchSellerName(cartItem.seller_email);
          setCartItems((currentItems) =>
            currentItems.map((item) =>
              item.productId === cartItem.productId
                ? {
                    ...item,
                    availableQuantity: updatedProduct.quantity,
                    sellerName: sellerName,
                    userQuantity: item.userQuantity || 1,
                  }
                : item
            )
          );
        }
      });
  
      return unsubscribe;
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

  const groupedCartItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      if (!groups[item.sellerName]) {
        groups[item.sellerName] = [];
      }
      groups[item.sellerName].push(item);
    });
    Object.keys(groups).forEach(sellerName => {
      groups[sellerName].sort((a, b) => b.dateCarted.seconds - a.dateCarted.seconds);
    });
    return groups;
  }, [cartItems]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
    onPress={async () => {
      const productRef = doc(db, 'products', item.productId);
      const docSnap = await getDoc(productRef);
      if (docSnap.exists()) {
        const productData = docSnap.data();
        navigation.navigate('ProductDetail', { product: { id: item.productId, ...productData } });
      } else {
        console.log('No such product!');
      }
    }}
    style={styles.cartItem}
  >
      <View style={styles.itemLeftSection}>
        <TouchableOpacity onPress={() => handleSelectItem(item.productId)}>
          <Icon
            name={selectedItems.has(item.productId) ? 'check-square' : 'square'}
            size={24}
            color="#05652D"
          />
        </TouchableOpacity>
        <Image source={{ uri: item.photo }} style={styles.cartImage} />
      </View>
      <View style={styles.cartDetails}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartPrice}>₱{parseFloat(item.price).toFixed(2)}</Text>
        <Text style={styles.cartCategory}>{item.category}</Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cartDescription}>{item.description}</Text>
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
    </TouchableOpacity>
  );

  const renderSectionList = () => {
    const sections = Object.keys(groupedCartItems).map(key => ({
      title: key,
      data: groupedCartItems[key]
    }));
  
    return (
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.productId + index}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
      />
    );
  };

  const navigateToUserVisit = (sellerEmail) => {
    navigation.navigate('UserVisit', { email: sellerEmail });
  };

  const handleSelectSellerItems = (sellerEmail) => {
    const newSelectedItems = new Set(selectedItems);
    cartItems.forEach((item) => {
      if (item.seller_email === sellerEmail) {
        if (newSelectedItems.has(item.productId)) {
          newSelectedItems.delete(item.productId);
        } else {
          newSelectedItems.add(item.productId);
        }
      }
    });
    setSelectedItems(newSelectedItems);
  };
  
  const renderSectionHeader = ({ section: { title, data } }) => {
    const sellerEmail = data[0]?.seller_email;
    const isAllSelected = data.every(item => selectedItems.has(item.productId));
  
    return (
      <View style={styles.sellerHeader}>
        <TouchableOpacity onPress={() => handleSelectSellerItems(sellerEmail)} style={styles.sectionSelectAllButton}>
          <Icon
            name={isAllSelected ? 'check-square' : 'square'}
            size={24}
            color="#05652D"
          />
        </TouchableOpacity>
        <Icon name="store" size={20} color="#808080" style={styles.shopIcon} />
        <Text style={styles.sellerName}>{title}</Text>
        <TouchableOpacity
          style={styles.visitButton}
          onPress={() => navigateToUserVisit(sellerEmail)}
        >
          <Text style={styles.visitButtonText}>Visit</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
        <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')} style={styles.wishlistButton}>
         <Icon name="search" size={24} color="#FFFFFF" style={styles.icon} />
        </TouchableOpacity>
      </View>
      {cartItems.length === 0 ? renderEmptyCart() : renderSectionList()}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
          <Icon name={selectedItems.size === cartItems.length ? "check-square" : "square"} size={24} color="#05652D" />
          <Text style={styles.selectAllText}> All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeButton} onPress={handleRemoveSelected}>
          <Icon name="trash" size={20} color="#D32F2F" />
          <Text style={styles.removeButtonText}> Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCheckout} style={styles.checkoutButton}>
          <View>
            <Text style={styles.checkoutButtonText}>Check Out ({selectedItems.size})</Text>
            <Text style={styles.totalPriceText}>Total: ₱{totalPrice.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <CartModal item={currentItem} visible={modalVisible} onClose={() => setModalVisible(false)} />
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
    paddingTop: 30,
    paddingBottom: 15,
    paddingHorizontal: 15,

    borderBottomWidth: 1,  
    borderBottomColor: '#ccc',
    backgroundColor: '#FAF9F6',  
  },
  itemLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 8,
    marginTop: 10,
  },
  sectionSelectAllButton: {
    marginRight: 10,
  },
  sellerName: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
    flex: 1,
    textAlign: 'left', 
    marginLeft: 10,
  },
  itemLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  cartImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cartDetails: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 20, 
  },
  cartName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartPrice: {
    color: '#05652D',
    marginVertical: 5,
  },
  cartCategory: {
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
  cartDescription: {
    fontSize: 12,
    color: '#787878',
    marginVertical: 5,
  },
  cartQty: {
    fontSize: 12,
    color: '#666',
  },
  cartMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginTop: 10, 
  },
  cartQuantity: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 10,
    borderRadius: 20,
/*     borderWidth: 3,
    borderColor: '#05652D', */
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
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: '#05652D',
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPriceText: {
    color: '#FFD700', 
    fontSize: 12, 
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 10,
    borderRadius: 20,
/*     borderWidth: 3,
    borderColor: '#D32F2F', */
  },
  removeButtonText: {
    color: '#D32F2F',
    textAlign: 'center',
    fontSize: 16,
  },
  cartQty: {
    fontSize: 12,
    color: '#666',
  },
  cartMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    margin: 10,
  },
  cartQuantity: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  cartItemContainer: {
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  visitButton: {
    position: 'absolute',
    right: 8,
    top: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#05652D',
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  shopIcon: {
    marginLeft: 10,
},
});

export default Cart;