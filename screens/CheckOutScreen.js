import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import axios from 'axios';
import { Dimensions } from 'react-native';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';

const screenHeight = Dimensions.get('window').height;

const CheckoutScreen = ({ navigation, route }) => {
  const { selectedProduct } = route.params || { 
    quantity: 1, 
    price: 0, 
    photo: '', 
    name: '', 
    category: '', 
    description: '' ,
    seller_email: ''
  };

  const [address, setAddress] = useState('Search Location');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [quantity, setQuantity] = useState(1);
  const [availableQuantity, setAvailableQuantity] = useState(selectedProduct.quantity);
  const orderedPrice = parseFloat(selectedProduct.price) * quantity;
  const [totalPrice, setTotalPrice] = useState(selectedProduct.price * quantity);

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", user.email));
  
      const fetchUserProfile = async () => {
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            setAddress(userData.address || 'Search Location');
          } else {
            console.log('No user profile found.');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
  
      fetchUserProfile();
    }
  }, []);
  

  useEffect(() => {
    setTotalPrice(selectedProduct.price * quantity);
  }, [quantity, selectedProduct.price]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handlePlaceOrder = () => {

    if (address === 'Search Location') {
      Alert.alert("Missing Information", "Please input your address.");
      return;
    }

    const orderInfo = {
      address,
      paymentMethod,
      quantity,
      totalPrice,
      productDetails: selectedProduct,
    };
    navigation.navigate('OrderConfirmation', orderInfo);
  };

  const [isDetailsModalVisible, setDetailsModalVisible] = useState(false);

  const toggleDetailsModal = () => {
    setDetailsModalVisible(!isDetailsModalVisible);
  };

  useEffect(() => {
    console.log(`Product loaded with available quantity: ${availableQuantity}`);
  }, [availableQuantity]);

  const handleQuantityChange = (newQuantity) => {
    const num = parseInt(newQuantity, 10);
    if (isNaN(num)) {
      Alert.alert("Error", "Please enter a valid number for quantity.");
      return;
    }

    if (num > 0 && num <= availableQuantity) {
      setQuantity(num);
    } else {
      Alert.alert(
        `The quantity must be between 1 and ${availableQuantity} (available stock).`
      );
    }
  };

  const incrementQuantity = () => {
    if (quantity < availableQuantity) {
      setQuantity(quantity + 1);
    } else {
      Alert.alert("Error", "You've reached the maximum available quantity.");
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    } else {
      Alert.alert("Error", "The quantity cannot be less than 1.");
    }
  };

  const [isAddressModalVisible, setAddressModalVisible] = useState(false);

  const handleLocationSearch = async (query) => {
    setLocationSearchQuery(query);
  
    if (query.length > 0) {
      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
          params: {
            input: query,
            key: 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g', 
            components: 'country:PH' 
          }
        });
  
        if (response.data && response.data.predictions) {
          const locations = response.data.predictions.map(prediction => ({
            name: prediction.description,
            placeId: prediction.place_id 
          }));
          setLocationSearchResults(locations);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      }
    } else {
      setLocationSearchResults([]);
    }
  };

  const handleLocationSelect = (location) => {
    setAddress(location);
    setLocationSearchModalVisible(false);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.productInfoContainer}>
          <Image source={{ uri: selectedProduct.photo }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{selectedProduct.name}</Text>
            <Text style={styles.productPrice}>₱{selectedProduct.price.toFixed(2)}</Text>
            <Text style={styles.productCategory}>{selectedProduct.category}</Text>
            <Text style={styles.productLocation} numberOfLines={1} ellipsizeMode="tail">
              {selectedProduct.location}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.addresslabel}>Buyer Address:</Text>
            <TouchableOpacity onPress={() => setLocationSearchModalVisible(true)} style={styles.addressContainer}>
              <Icon name="map-marker" size={16} color="#05652D" style={styles.labelIcon} />
              <Text style={styles.addressText}>{address}</Text>
              <Icon name="pencil" size={16} color="#05652D" style={styles.editIcon} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
          <Text style={styles.labelText}>Payment Method:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentMethodContainer}>
            <TouchableOpacity onPress={() => setPaymentMethod('Cash on Delivery')} style={styles.paymentOption}>
              <Text style={styles.radioLabel}>Cash on Delivery</Text>
              <Icon
                name={paymentMethod === 'Cash on Delivery' ? 'dot-circle-o' : 'circle-o'}
                size={24}
                color="#888"
                style={styles.radioIcon}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>

          <View style={styles.divider} />

          <View style={styles.cardContainer}>
            <View style={styles.cardItem}>
              <Text style={styles.labelText}>Quantity:</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity onPress={decrementQuantity}>
                  <Text style={styles.quantityButton}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType='numeric'
                  value={quantity.toString()}
                  onChangeText={handleQuantityChange}
                />
                <TouchableOpacity onPress={incrementQuantity}>
                  <Text style={styles.quantityButton}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardItem}>
              <Text style={styles.labelText}>Ordered Price:</Text>
              <Text style={styles.priceText}>₱{orderedPrice.toFixed(2)}</Text>
            </View>
                
            <View style={styles.divider} />
              <View style={styles.cardItem}>
                <Text style={styles.labelText}>Total Payment:</Text>
                <Text style={styles.priceTextGreen}>₱{totalPrice.toFixed(2)}</Text>
              </View>
          </View>
          </View>
        </ScrollView>

        <View style={styles.navbar}>
          <View style={styles.totalPaymentContainer}>
            <Text style={styles.totalPaymentLabel}>Total Payment</Text>
            <Text style={styles.totalPaymentAmount}>₱{totalPrice.toFixed(2)}</Text>
          </View>
          <TouchableOpacity onPress={handlePlaceOrder}>
            <View style={styles.placeOrderButton}>
              <Text style={styles.placeOrderLabel}>Place Order</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isDetailsModalVisible}
          onRequestClose={toggleDetailsModal}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <TouchableOpacity style={styles.closeButton} onPress={toggleDetailsModal}>
                <Icon name="close" size={24} color="#05652D" />
              </TouchableOpacity>
              <Image source={{ uri: selectedProduct.image }} style={styles.modalProductImage} />
              <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
              <Text style={styles.modalProductPrice}>₱{selectedProduct.price.toFixed(2)}</Text>
              <Text style={styles.modalProductCategory}>{selectedProduct.category}</Text>
              <Text style={styles.modalProductCategory}>{selectedProduct.location}</Text>
              <ScrollView style={styles.modalDescriptionScrollView}>
                <Text style={styles.modalProductDescription}>{selectedProduct.description}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
          animationType="slide"
          transparent={true}
          visible={locationSearchModalVisible}
          onRequestClose={() => setLocationSearchModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Search for a location"
                value={locationSearchQuery}
                onChangeText={handleLocationSearch}
                autoFocus={true}
              />
              <ScrollView style={styles.searchResultsContainer}>
                {locationSearchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => handleLocationSelect(result.name)}
                  >
                    <Text style={styles.searchResultText}>{result.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
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
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    backgroundColor: '#f7f7f7',
  },
  backIcon: {
    padding: 10,
    marginRight: 20,
  },
  content: {
    padding: 20,
  },
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 20,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    color: '#666',
  },
  productCategory: {
    fontSize: 14,
    color: '#888',
  },
  viewDetailsButton: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewDetails: {
    color: '#05652D',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 10,
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoItem: {
    marginBottom: 10,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
  },
  infoAddress: {
    fontSize: 16,
    color: '#666',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 10,
    color: '#05652D',
  },
  radioIcon: {
    color: '#05652D',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  quantityButton: {
    fontSize: 30, 
    fontWeight: 'bold', 
    color: '#05652D',
  },
  quantityInput: {
    minWidth: 50,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  cardContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
  },
  priceTextGreen: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 20,
  },
  totalPaymentContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  totalPaymentLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  totalPaymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
  },
  placeOrderButton: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
  },
  placeOrderLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    paddingTop: 50, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  modalDescriptionScrollView: {
    marginTop: 10,
    width: '100%',
  },
  modalProductImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
  },
  modalProductPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
  },
  modalProductCategory: {
    fontSize: 16,
    color: '#888',
    marginBottom: 10,
  },
  modalProductDescription: {
    fontSize: 14,
    color: '#000',
    fontStyle: 'italic',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  addresslabel: {
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
    flex: 1,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  addressText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#05652D',
    flex: 1
  },
  editIcon: {
    marginLeft: 8,
    color: '#05652D',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    paddingVertical: 5,
    flex: 1,
  },
  radioIcon: {
    marginLeft: 10,
  },
  gcashIcon: {
    width: 60, 
    height: 50,  
    resizeMode: 'contain', 
  },
  productLocation: {
    fontSize: 12,
    color: '#888',
    flexShrink: 1, 
  },
  modalView: {
    height: screenHeight / 2, 
    marginTop: screenHeight / 2, 
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTextInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
  searchResultsContainer: {
    maxHeight: screenHeight / 2 - 80, 
  },
});

export default CheckoutScreen;