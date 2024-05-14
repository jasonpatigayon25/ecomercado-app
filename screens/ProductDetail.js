import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc, onSnapshot, runTransaction, Timestamp } from 'firebase/firestore';
import { Rating } from 'react-native-ratings';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const ProductDetail = ({ navigation, route }) => {

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  const [sellerDetails, setSellerDetails] = useState({
    sellerName: '',
    sellerEmail: '',
    sellerAddress: '',
  });

  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  const [sellerName, setSellerName] = useState('');
  const [product, setProduct] = useState(route.params.product);
  const [displayPhoto, setDisplayPhoto] = useState(product?.photo || 'default_image_url_here');
  const auth = getAuth();
  const user = auth.currentUser;

  const calculateTotalPrice = (quantity) => {
    setTotalPrice(quantity * parseFloat(product.price));
  };

  useEffect(() => {
    if (product && product.id) {

      const productRef = doc(db, 'products', product.id);
      const unsubscribeProduct = onSnapshot(productRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedProduct = { ...docSnapshot.data(), id: docSnapshot.id };
          setProduct(updatedProduct);
          setDisplayPhoto(updatedProduct.photo);
        }
      });

      return () => unsubscribeProduct();
    }
  }, [product?.id]);

  if (!product) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  useEffect(() => {
    let timer;
    if (displayPhoto !== product.photo) {
      timer = setTimeout(() => {
        setDisplayPhoto(product.photo);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [displayPhoto, product.photo]);

  const handleSelectSubPhoto = (photo) => {
    setDisplayPhoto(photo);
  };

  const fetchSellerName = async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        setSellerName(`${userData.firstName} ${userData.lastName}`);
      });
    } catch (error) {
      console.log('Error fetching seller name:', error);
    }
  };

  useEffect(() => {
    if (product && product.seller_email) {
      fetchSellerName(product.seller_email); 

      const fetchSellerDetails = async (email) => {
        const sellersRef = collection(db, 'registeredSeller');
        const q = query(sellersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const sellerData = doc.data();
          setSellerDetails({
            sellerName: sellerData.sellerName,
            sellerEmail: sellerData.email,
            sellerAddress: sellerData.sellerAddress,
          });
        });
      };

      fetchSellerDetails(product.seller_email);
    }
  }, [product]);

  useEffect(() => {
    if (product && product.seller_email) {
      fetchSellerName(product.seller_email);
    }
  }, [product]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const fetchRatings = async () => {
      if (product && product.id) {
        const ratingsRef = collection(db, 'productRatings');
        const q = query(ratingsRef, where('prodId', '==', product.id));
    
        const querySnapshot = await getDocs(q);
        let totalRating = 0;
        querySnapshot.forEach((doc) => {
          const ratingValue = doc.data().rating;
          totalRating += ratingValue;
        });
    
        const avgRating = querySnapshot.size > 0 ? (totalRating / querySnapshot.size) : 0;
        setAverageRating(avgRating);
        setTotalRatings(querySnapshot.size);
      }
    };
  
    fetchRatings();
  }, [product.id]);

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

  const handleAddToCart = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    if (product.quantity === 0) {
      Alert.alert("Out of Stock", "This product is currently out of stock.");
      return;
    }
  
    //cannot cart your own product
    if (product.seller_email === user.email) {
      Alert.alert("You cannot cart your own product.");
      return;
    }

    await incrementUserRecommendHit(product.id);
    await incrementProductHit(product.id);
  
    const cartRef = doc(db, 'carts', user.email);
    
    try {
      const docSnap = await getDoc(cartRef);
  
      if (docSnap.exists()) {
        const existingCartItems = docSnap.data().cartItems || [];
        const isItemInCart = existingCartItems.some(cartItem => cartItem.productId === product.id);
  
        if (!isItemInCart) {
          await updateDoc(cartRef, {
            cartItems: arrayUnion({
              productId: product.id,
              name: product.name,
              price: parseFloat(product.price),
              photo: product.photo,
              category: product.category,
              description: product.description,
              quantity: parseInt(product.quantity, 10),
              seller_email: product.seller_email,
              location: product.location,
              dateCarted: new Date()
            })
          });
          console.log('Product added to cart');
        } else {
          console.log('Product is already in the cart');
          Alert.alert('Product is already in your cart.');
        }
      } else {
        await setDoc(cartRef, {
          userEmail: user.email,
          cartItems: [{
            productId: product.id,
            name: product.name,
            price: parseFloat(product.price),
            photo: product.photo,
            category: product.category,
            description: product.description,
            quantity: parseInt(product.quantity, 10),
            seller_email: product.seller_email,
            location: product.location,
            dateCarted: new Date()
          }]
        });
        console.log('Product added to cart');
      }
      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  useEffect(() => {
    if (user) {
      registerIndieID(user.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
        .then(() => console.log("Device registered for notifications"))
        .catch(err => console.error("Error registering device:", err));

      return () => {
        unregisterIndieDevice(user.email, 18345, 'TdOuHYdDSqcy4ULJFVCN7l')
          .then(() => console.log("Device unregistered for notifications"))
          .catch(err => console.error("Error unregistering device:", err));
      };
    }
  }, [user]);

  const shouldSendNotification = async (email, notificationType) => {
    try {
      const notificationSetting = await AsyncStorage.getItem(`${email}_${notificationType}`);
      return notificationSetting === null || JSON.parse(notificationSetting);
    } catch (error) {
      console.error('Error reading notification settings:', error);
      return true;
    }
  };

  const sendPushNotification = async (subID, title, message) => {
    if (!(await shouldSendNotification(subID))) {
      console.log('Notifications are muted for:', subID);
      return;
    }

    const notificationData = {
      subID: subID,
      appId: 18345,
      appToken: 'TdOuHYdDSqcy4ULJFVCN7l',
      title: 'ECOMercado',
      message: message
    };
  
    for (let attempt = 1; attempt <= 3; attempt++) { 
      try {
        await axios.post('https://app.nativenotify.com/api/indie/notification', notificationData);
        console.log('Push notification sent to:', subID);
        break; 
      } catch (error) {
        console.error(`Attempt ${attempt} - Error sending push notification:`, error);
        if (attempt === 3) {
          console.error('Unable to send push notification at this time.'); 
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const handleChatWithSeller = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    if (product.seller_email === user.email) {
      Alert.alert("Error", "You are trying to chat about your product.");
      return;
    }
  
    const sellerEmail = product.seller_email;
    const buyerEmail = user.email;
  
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('users', 'array-contains', buyerEmail));
      const querySnapshot = await getDocs(q);
  
      let existingChatId = null;
  
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.users.includes(sellerEmail)) {
          existingChatId = doc.id;
        }
      });
  
      const chatMessage = `${user.email} is interested in your product ${product.name}`;
  
      if (existingChatId) {
        navigation.navigate('Chat', {
          chatId: existingChatId,
          receiverEmail: sellerEmail,
          productDetails: { name: product.name, productId: product.id, initialMessage: chatMessage }
        });
      } else {
        const newChatRef = collection(db, 'chats');
        const newChat = {
          users: [buyerEmail, sellerEmail],
          messages: [],
        };
        const docRef = await addDoc(newChatRef, newChat);
        navigation.navigate('Chat', {
          chatId: docRef.id,
          receiverEmail: sellerEmail,
          productDetails: { name: product.name, productId: product.id, initialMessage: chatMessage }
        });
      }
    } catch (error) {
      console.error('Error handling chat with seller:', error);
    }
  };
  
  const proceedToCheckout = () => {
    const productForCheckout = [{
      productId: product.id,
      name: product.name,
      photo: product.photo,
      price: parseFloat(product.price),
      orderedQuantity: selectedQuantity,
      seller_email: product.seller_email,
      sellerName: sellerDetails.sellerName || 'Unknown Seller',
      category: product.category,
      location: product.location,
    }];
  
    navigation.navigate('CheckoutProducts', {
      selectedProducts: productForCheckout,
      buyerAddress: user.address || 'Unknown Address',
      totalPrice: totalPrice,
      shippingFee: 0,
    });
  };

  const handleBuyNow = () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to make a purchase.");
      return;
    }

    if (product.seller_email === user.email) {
      Alert.alert("You cannot buy your own product.");
      return;
    }
  
    if (product.quantity < 1) {
      Alert.alert("Out of Stock", "This item is currently out of stock.");
      return;
    }
  
    setIsBuyModalVisible(true);
    setSelectedQuantity(1);
    calculateTotalPrice(1); // Initialize with quantity 1
  };
  

  const SellerDetailsCard = () => (
    <View style={styles.sellerCard}>
      <Text style={styles.sellerCardHeader}>{sellerDetails.sellerName}</Text>
      <Text style={styles.sellerCardSubtext}>{sellerDetails.sellerEmail}</Text>
      <View style={styles.sellerCardRow}>
        <Icon name="map-marker" size={16} color="#05652D" />
        <Text style={styles.sellerCardAddress}>{sellerDetails.sellerAddress}</Text>
      </View>
      <TouchableOpacity style={styles.visitButton} onPress={handleVisitSeller}>
        <Text style={styles.visitButtonText}>Visit</Text>
      </TouchableOpacity>
    </View>
  );

  const handleVisitSeller = () => {
    navigation.navigate('UserVisit', { email: product.seller_email });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backIcon} />
        </TouchableOpacity>
        <View style={styles.iconsContainer}>
          <TouchableOpacity onPress={handleChatWithSeller}>
            <Icon name="comment" size={24} color="#05652D" style={styles.icon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddToCart}>
            <Icon name="cart-plus" size={24} color="#05652D" style={styles.icon} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.imageContainer}>
       <TouchableOpacity onPress={() => navigation.navigate('DonationImage', { imageUrl: displayPhoto })}>
            <Image source={{ uri: displayPhoto }} style={styles.productImage} />
          </TouchableOpacity>
        </View>
        {product.subPhotos && product.subPhotos.length > 0 && (
          <View style={styles.subPhotosContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {product.subPhotos.map((photo, index) => (
                <TouchableOpacity key={index} onPress={() => handleSelectSubPhoto(photo)}>
                  <Image source={{ uri: photo }} style={styles.subPhoto} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text           
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.infoName}>{product.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoPrice}>₱ {parseFloat(product.price).toFixed(2)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoCategory}>{product.category}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoText}>Quantity Remaining: </Text>
            {product.quantity > 0 ? (
              <Text style={styles.infoText}>{product.quantity}</Text>
            ) : (
              <Text style={styles.soldOutText}>OUT OF STOCK</Text>
            )}
          </View>
          {/* <View style={styles.infoItem}>
            <Icon name="user" size={20} color="#05652D" style={styles.infoIcon} />
            <TouchableOpacity onPress={handleVisitSeller}>
              <Text style={styles.infoTextSeller} numberOfLines={1} ellipsizeMode="tail">{sellerName}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoItem}>
            <Icon name="map-marker" size={20} color="#05652D" style={styles.infoIcon} />
            <Text style={styles.infoText}>{product.location}</Text>
          </View> */}
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Icon name="info-circle" size={20} color="#05652D" style={styles.infoIcon} />
            <Text style={[styles.infoLabel, styles.boldText]}>Description:</Text>
          </View>
          <Text style={styles.descriptionText}>
            {product.description}
          </Text>
        </View>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>Rating</Text>
          <View style={styles.ratingContainer}>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={30}
              readonly
              startingValue={averageRating}
              style={styles.rating}
            />
            <Text
              onPress={() => navigation.navigate('RatingReview', { prodId: product.id })}
              style={styles.viewReviewText}>
              View Reviews 
            </Text>
          </View>
          <Text style={styles.ratingNumber}>{averageRating.toFixed(2)} ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</Text>
        </View>
        <SellerDetailsCard />
      </ScrollView>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={handleChatWithSeller}>
          <View style={styles.navbarIconContainer}>
            <Icon name="comment" size={24} color="#05652D" style={styles.navbarIcon} />
            <Text style={styles.navbarLabel}>Chat with Seller</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddToCart}>
          <View style={styles.navbarIconContainer}>
            <Icon name="cart-plus" size={24} color="#05652D" style={styles.navbarIcon} />
            <Text style={styles.navbarLabel}>Add to Cart</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBuyNow}>
          <View style={[styles.navbarIconContainer, styles.buyNowButton]}>
            <Text style={styles.buyNowLabel}>Buy Now</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isBuyModalVisible}
        onRequestClose={() => setIsBuyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBottomView}>
            <View style={styles.priceSection}>
              <Text style={styles.modalLabel}>Unit Price:</Text>
              <Text style={styles.modalValue}> ₱{parseFloat(product.price).toFixed(2)}</Text>
            </View>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                disabled={selectedQuantity <= 1}
                onPress={() => {
                  const newQuantity = selectedQuantity - 1;
                  setSelectedQuantity(newQuantity);
                  calculateTotalPrice(newQuantity);
                }}
                style={[styles.controlButton, selectedQuantity <= 1 && styles.disabledButton]}>
                <Text style={styles.buttonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityDisplay}>{selectedQuantity}</Text>
              <TouchableOpacity
                disabled={selectedQuantity >= product.quantity}
                onPress={() => {
                  const newQuantity = selectedQuantity + 1;
                  setSelectedQuantity(newQuantity);
                  calculateTotalPrice(newQuantity);
                }}
                style={[styles.controlButton, selectedQuantity >= product.quantity && styles.disabledButton]}>
                <Text style={styles.buttonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.totalSection}>
              <Text style={styles.modalLabel2}>Total:</Text>
              <Text style={styles.modalValue2}>₱{totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setIsBuyModalVisible(false);
                proceedToCheckout();
              }}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
    backgroundColor: '#05652D',
  },
  backIcon: {
    color: '#FFF', 
  },
  iconsContainer: {
    flexDirection: 'row',
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  productImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
    color: '#05652D', 
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333', 
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  infoTextSeller: {
    fontSize: 14,
    color: '#05652D',
    fontWeight: 'bold',
  },
  infoPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D', 
  },
  infoCategory: {
    fontSize: 18,
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
  infoName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#e1e1e1',
  },
  navbarIconContainer: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  navbarIcon: {
    color: '#05652D',
  },
  navbarLabel: {
    color: '#05652D',
    fontSize: 12,
    marginTop: 4,
  },
  buyNowButton: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  buyNowLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    color: '#FFF', 
    marginLeft: 15,
  },
  fullImage: {
    width: 340,
    height: 340,
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    color: '#05652D',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '100%', 
    height: '60%',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  ratingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  ratingModalView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    paddingTop: 20, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  ratingInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    width: '100%',
    padding: 10,
    marginBottom: 20,
  },
  ratingMessageInput: {
    width: '100%',
    height: 100,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f2f2f2',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  ratingSubmitButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: "#05652D",
  },
  ratingCancelButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: "#cccccc",
    marginTop: 10,
  },
  buttonTextStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  ratingCenteredView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  rateSellerButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFD700',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  rateSellerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  rateIcon: {
    color: '#fff',
  },
    productNameWithRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  soldOutText: {
    fontSize: 14,
    color: 'red',
    fontWeight: 'bold',
  },
  ratingCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginVertical: 16,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rating: {
    alignSelf: 'flex-start',
  },
  ratingNumber: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  viewReviewButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  viewReviewText: {
    color: '#05652D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sellerCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sellerCardHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sellerCardSubtext: {
    fontSize: 16,
    color: '#666',
  },
  sellerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sellerCardAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  visitButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#05652D',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  visitButtonText: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subPhotosContainer: {
    flexDirection: 'row', 
    marginTop: 10,
    paddingBottom: 20, 
  },
  subPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10, 
    resizeMode: 'cover', 
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalBottomView: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalValue: {
    fontSize: 18,
    color: '#05652D',
    fontWeight: 'bold',
  },
  modalLabel2: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  modalValue2: {
    fontSize: 22,
    color: '#05652D',
    fontWeight: 'bold',
    backgroundColor: '#ECF8EC',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 15,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlButton: {
    padding: 10,
    marginHorizontal: 20,
    backgroundColor: '#05652D',
    borderRadius: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontSize: 20,
    color: 'white',
  },
  quantityDisplay: {
    fontSize: 18,
    width: 40,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#05652D',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


export default ProductDetail;