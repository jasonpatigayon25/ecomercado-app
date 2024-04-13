import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, SafeAreaView, Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import {
  collection, doc, getDoc, onSnapshot,
  updateDoc, arrayRemove
} from 'firebase/firestore';

const DonationWishlist = ({ navigation }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const wishlistRef = doc(db, 'wishlists', user.email);
      const unsubscribeWishlist = onSnapshot(wishlistRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const wishlistData = docSnapshot.data().wishItems || [];
          setWishlistItems(wishlistData);
        } else {
          setWishlistItems([]);
        }
      });

      return () => unsubscribeWishlist();
    }
  }, [user]);

  const handleRemoveFromWishlist = async (donationId) => {
    const wishlistRef = doc(db, 'wishlists', user.email);
    await updateDoc(wishlistRef, {
      wishItems: arrayRemove({ donationId })
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.wishlistItem}>
      <Image source={{ uri: item.photo }} style={styles.wishlistImage} />
      <View style={styles.wishlistDetails}>
        <Text style={styles.wishlistName}>{item.name}</Text>
        <Text style={styles.wishlistCategory}>{item.category}</Text>
        <Text style={styles.wishlistPurpose}>{item.purpose}</Text>
        <TouchableOpacity
          onPress={() => handleRemoveFromWishlist(item.donationId)}
          style={styles.removeButton}
        >
          <Icon name="times" size={20} color="#D32F2F" />
          <Text>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist</Text>
      </View>
      <FlatList
        data={wishlistItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => `wishlist-${index}`}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f9f9f9',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#05652D',
      paddingVertical: 15,
      paddingHorizontal: 10,
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      color: '#FFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
    wishlistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      padding: 10,
    },
    wishlistImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginRight: 15,
    },
    wishlistDetails: {
      flex: 1,
      justifyContent: 'center',
    },
    wishlistName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
    },
    wishlistCategory: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    wishlistPurpose: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    removeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      marginTop: 10,
    },
  });

export default DonationWishlist;
