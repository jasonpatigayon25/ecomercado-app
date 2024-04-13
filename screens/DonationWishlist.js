import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, SafeAreaView, Alert, SectionList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDoc, onSnapshot, updateDoc, getDocs, where, query } from 'firebase/firestore';
import CartModal from './CartModal';

const DonationWishlist = ({ navigation }) => {
    const [wishItems, setWishItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [modalVisible, setModalVisible] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const auth = getAuth();
    const user = auth.currentUser;
    const [donationListeners, setDonationListeners] = useState([]);
    const [donorName, setDonorName] = useState('');

  const fetchDonorName = async (donorEmail) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", donorEmail));
    const querySnapshot = await getDocs(q);
    const userData = querySnapshot.docs.map(doc => doc.data());
    return userData.length > 0 ? `${userData[0].firstName} ${userData[0].lastName}` : '';
  };

  useEffect(() => {
    if (user) {
      const wishlistRef = doc(db, 'wishlists', user.email);
      const unsubscribeWishlist = onSnapshot(wishlistRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const wishlistData = docSnapshot.data().wishItems || [];
          const donationsWithDonorNames = await Promise.all(wishlistData.map(async (wishItem) => {
            const donationRef = doc(db, 'donation', wishItem.donationId);
            const donationSnap = await getDoc(donationRef);
            if (donationSnap.exists()) {
              const donationData = donationSnap.data();
              const donorName = await fetchDonorName(donationData.donor_email);
              return { id: donationSnap.id, ...donationData, donorName }; 
            }
            return null;
          }));
  
          setWishItems(donationsWithDonorNames.filter(Boolean));
        } else {
          setWishItems([]);
        }
      });
  
      return () => {
        unsubscribeWishlist();
      };
    }
  }, [user]);

  useEffect(() => {
    console.log("Wish Items: ", wishItems);
}, [wishItems]);


const handleSelectItem = (donationId) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(donationId)) {
      newSelectedItems.delete(donationId);
    } else {
      newSelectedItems.add(donationId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === wishItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(wishItems.map((item) => item.donationId)));
    }
  };

const handleRequest = () => {
    const selectedDonations = wishItems
      .filter(item => selectedItems.has(item.donationId))
      .map(item => ({
        ...item,
        requestedQuantity: 1 
      }));

    const isUnavailable = selectedDonations.some(item => item.isDonated); 

    if (isUnavailable) {
      Alert.alert("Unavailable", "Cannot proceed because one or more selected donations are no longer available.");
      return;
    }

    if (selectedDonations.length > 0) {
      navigation.navigate('RequestCheckout', { selectedDonations: selectedDonations });
    } else {
      Alert.alert("No donation selected", "Please select at least one donation to request.");
    }
  };
  
  
  const renderEmptyCart = () => (
    <View style={styles.emptyCartContainer}>
      <Icon name="shopping-cart" size={50} color="#ccc" />
      <Text style={styles.emptyCartText}>No Cart Yet</Text>
    </View>
  );

  const groupedWishItems = useMemo(() => {
    const groups = {};
    wishItems.forEach(item => {
      const donorKey = item.donorName || '...'; 
      groups[donorKey] = groups[donorKey] || [];
      groups[donorKey].push(item);
    });
    return groups;
}, [wishItems]);

const renderItem = ({ item }) => (
    <TouchableOpacity
    onPress={async () => {
      const donationRef = doc(db, 'donation', item.donationId);
      const docSnap = await getDoc(donationRef);
      if (docSnap.exists()) {
        const donationData = docSnap.data();
        navigation.navigate('DonationDetail', { donation: { id: item.donationId, ...donationData } });
      } else {
        console.log('No such product!');
      }
    }}
    style={styles.cartItem}
  >
      <View style={styles.itemLeftSection}>
        <TouchableOpacity onPress={() => handleSelectItem(item.donationId)}>
          <Icon
            name={selectedItems.has(item.donationId) ? 'check-square' : 'square'}
            size={24}
            color="#05652D"
          />
        </TouchableOpacity>
        <Image source={{ uri: item.photo }} style={styles.cartImage} />
      </View>
      <View style={styles.cartDetails}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartCategory}>{item.category}</Text>
        <Text style={styles.cartDescription}>{item.purpose}</Text>
        <Text style={styles.cartDescription}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionList = () => {
    const sections = Object.keys(groupedWishItems).map((key) => ({
        title: key, 
        data: groupedWishItems[key]
    }));

    return (
        <SectionList
            sections={sections}
            keyExtractor={(item, index) => `${item.donationId}-${index}`}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
        />
    );
};

  const navigateToUserVisit = (donorEmail) => {
    navigation.navigate('UserVisit', { email: donorEmail });
  };

  const handleSelectDonorItems = (donorEmail) => {
    const newSelectedItems = new Set(selectedItems);
    wishItems.forEach((item) => {
        if (item.donor_email === donorEmail) {
            if (newSelectedItems.has(item.donationId)) {
                newSelectedItems.delete(item.donationId);
            } else {
                newSelectedItems.add(item.donationId);
            }
        }
    });
    setSelectedItems(newSelectedItems);
};
  
const renderSectionHeader = ({ section: { title, data } }) => (
    <View style={styles.sellerHeader}>
      <TouchableOpacity onPress={() => handleSelectDonorItems(data[0]?.donor_email)} style={styles.sectionSelectAllButton}>
        <Icon
          name={data.every(item => selectedItems.has(item.donationId)) ? 'check-square' : 'square'}
          size={24}
          color="#05652D"
        />
      </TouchableOpacity>
      <Icon name="heart" size={20} color="#808080" style={styles.shopIcon} />
      <Text style={styles.sellerName}>{title}</Text>
      <TouchableOpacity
        style={styles.visitButton}
        onPress={() => navigateToUserVisit(data[0]?.donor_email)}
      >
        <Text style={styles.visitButtonText}>Visit</Text>
      </TouchableOpacity>
    </View>
  );

  const handleRemoveSelected = () => {
    if (selectedItems.size === 0) {
      Alert.alert('No items selected', 'Please select items to remove.');
      return;
    }
  
    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove the selected donations from your wishlist?',
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
    // Assuming wishItems is the state containing all wishlist items
    const newWishItems = wishItems.filter(item => !selectedItems.has(item.donationId));
  
    const wishlistRef = doc(db, 'wishlists', user.email); // Reference to the user's wishlist
    updateDoc(wishlistRef, { wishItems: newWishItems }) // Update the document
      .then(() => {
        setWishItems(newWishItems); // Update local state
        setSelectedItems(new Set()); // Clear selection
        Alert.alert('Success', 'Selected donations have been removed from your wishlist.');
      })
      .catch(error => {
        console.error('Error removing items from wishlist:', error);
        Alert.alert('Error', 'Failed to remove items from the wishlist.');
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SearchDonationScreen')} style={styles.wishlistButton}>
          <Icon name="search" size={24} color="#FFFFFF" style={styles.icon} />
        </TouchableOpacity>
      </View>
      {wishItems.length === 0 ? renderEmptyCart() : renderSectionList()}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
          <Icon name={selectedItems.size === wishItems.length ? "check-square" : "square"} size={24} color="#05652D" />
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeButton} onPress={handleRemoveSelected}>
          <Icon name="trash" size={20} color="#D32F2F" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRequest} style={styles.checkoutButton}>
          <View>
            <Text style={styles.checkoutButtonText}>Request </Text>
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

export default DonationWishlist;