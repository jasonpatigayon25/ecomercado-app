import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import axios from 'axios';
import { Dimensions } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { getAuth } from 'firebase/auth';

const screenHeight = Dimensions.get('window').height;

// const centralShippingLocation = 'Cabangcalan, Mandaue City, Cebu';

const getDistanceAndCalculateFee = async (origin, destination) => {
  const API_KEY = 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g';
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    if (response.data.rows[0] && response.data.rows[0].elements[0].distance) {
      const distanceMeters = response.data.rows[0].elements[0].distance.value;
      const distanceKm = distanceMeters / 1000; 

      const baseFee = 15;
      const additionalFeePerHalfKm = 5;
      const additionalFee = Math.floor(distanceKm / 0.5) * additionalFeePerHalfKm;
      const totalFee = baseFee + additionalFee;
      return totalFee;
    } else {
      console.error('No distance data available');
      return 0;
    }
  } catch (error) {
    console.error('Error fetching distance:', error);
    return 0;
  }
};

const calculateTotalShippingFee = async (sellerAddresses, buyerAddress) => {
  let totalFee = 0;

  for (const sellerAddress of sellerAddresses) {
    const feeToSeller = await getDistanceAndCalculateFee(sellerAddress, buyerAddress);
    totalFee += feeToSeller;
  }

  return totalFee;
};

const calculateShippingFeePerSeller = async (sellerAddress, buyerAddress) => {
  const fee = await getDistanceAndCalculateFee(sellerAddress, buyerAddress);
  return fee;
};

///////////////////////////////////////////////////////////
const CheckoutProducts = ({ navigation, route }) => {
  const { selectedProducts } = route.params || [];
  const [totalPrice, setTotalPrice] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFees, setShippingFees] = useState({});
  const [shippingSubtotal, setShippingSubtotal] = useState(0);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [totalPerSeller, setTotalPerSeller] = useState({});

  const [address, setAddress] = useState('Search Location');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [quantity, setQuantity] = useState(1);
  const [availableQuantity, setAvailableQuantity] = useState(selectedProducts.quantity);
  const orderedPrice = parseFloat(selectedProducts.price) * quantity;

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  useEffect(() => {
    const total = selectedProducts.reduce((sum, product) => sum + product.orderedPrice, 0);
    setTotalPrice(total);
  }, [selectedProducts]);

  const groupedProducts = selectedProducts.reduce((acc, product) => {
    const key = product.sellerName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {});

  const getSellerAddresses = async () => {
    const sellersRef = collection(db, 'registeredSeller');
    const sellerDocsSnapshot = await getDocs(sellersRef);
    const sellerAddresses = {};
    sellerDocsSnapshot.docs.forEach(doc => {
        const sellerData = doc.data();
        sellerAddresses[sellerData.sellerName] = sellerData.sellerAddress;
    });
    return sellerAddresses;
};

useEffect(() => {
  const calculateShippingAndTotals = async () => {
      let overallTotal = 0;
      const fees = {};
      const totals = {};

      const auth = getAuth();
      const user = auth.currentUser;
      const userEmail = user ? user.email : null;
      if (!userEmail) {
          console.error('User email is not available');
          return;
      }

      const buyerAddress = await getBuyerAddressByEmail(userEmail);
      if (!buyerAddress) {
          console.error('Buyer address is not available');
          return;
      }

      const sellerAddresses = await getSellerAddresses();

      let shippingTotal = 0;
      for (const [seller, products] of Object.entries(groupedProducts)) {
          const sellerAddress = sellerAddresses[seller];
          const shippingFee = await calculateShippingFeePerSeller(sellerAddress, buyerAddress);
          fees[seller] = shippingFee;

          shippingTotal += shippingFee;

          const totalForSeller = products.reduce((sum, product) => sum + (product.price * product.orderedQuantity), 0);
          totals[seller] = totalForSeller + shippingFee;
          overallTotal += totalForSeller + shippingFee;
      }

      setShippingFees(fees);
      setShippingSubtotal(shippingTotal);
      setTotalPerSeller(totals);
      setTotalPrice(overallTotal);
    };

    calculateShippingAndTotals();
  }, [selectedProducts]);

  const getBuyerAddressByEmail = async (email) => {
    if (!email) {
      console.error('No email provided');
      return null; 
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return userData.address;
    } else {
      console.error(`No address found for email: ${email}`);
      return null;
    }
  };

  useEffect(() => {
    const calculateShipping = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        const userEmail = user ? user.email : null;
  
        if (!userEmail) {
          console.error('User email is not available');
          return;
        }
  
        const sellerAddresses = await getSellerAddresses();
        const buyerAddress = await getBuyerAddressByEmail(userEmail);
  
        if (!buyerAddress) {
          console.error('Buyer address is not available');
          return;
        }
  
        const shippingFee = Math.round(await calculateTotalShippingFee(sellerAddresses, buyerAddress));
        setShippingFee(shippingFee);
  
        const total = subtotalPrice + shippingFee; 
        setTotalPrice(total);
      } catch (error) {
       // console.error('Failed to calculate shipping:', error);
      }
    };
  
    calculateShipping();
  }, [selectedProducts]);

  useEffect(() => {
    const calculateTotals = () => {
      let total = 0;
      let itemCount = 0;

      selectedProducts.forEach(product => {
        total += product.price * product.orderedQuantity;
        itemCount += product.orderedQuantity;
      });

      setTotalPrice(total);
      setTotalItemCount(itemCount);
    };

    calculateTotals();
  }, [selectedProducts]);

  const renderProductItem = ({ item }) => {
    const totalItemPrice = item.price * item.orderedQuantity;
  
    return (
      <View style={styles.productInfoContainer}>
        <Image source={{ uri: item.photo }} style={styles.productImage} />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₱{totalItemPrice.toFixed(2)}</Text>
          <Text style={styles.productQuantity}>x{item.orderedQuantity}</Text>
        </View>

      </View>
    );
  };

  const calculateSubtotal = (products) => {
    let totalCount = 0;
    let subtotalPrice = 0;
    products.forEach(product => {
      totalCount += 1; 
      subtotalPrice += product.price * product.orderedQuantity;
    });
    return { totalCount, subtotalPrice };
  };
  
  const { totalCount, subtotalPrice } = calculateSubtotal(selectedProducts);

  useEffect(() => {
    const fetchUserAddress = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (user) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setAddress(userData.address || 'Search Location'); 
          }
        } catch (error) {
          console.error('Error fetching user address:', error);
        }
      }
    };
  
    fetchUserAddress();
  }, []);

  useEffect(() => {
    const total = selectedProducts.reduce((sum, product) => sum + (product.price * product.orderedQuantity), 0);
    setTotalPrice(total);
  }, [selectedProducts]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handlePlaceOrder = () => {
    if (address === 'Search Location') {
        Alert.alert("Missing Information", "Please input your address.");
        return;
    }

    const merchandiseSubtotal = selectedProducts.reduce((sum, product) => sum + (product.price * product.orderedQuantity), 0);
    const totalOrderCount = selectedProducts.reduce((sum, product) => sum + product.orderedQuantity, 0);

    const orderInfo = {
        address,
        paymentMethod,
        productDetails: selectedProducts,
        shippingFees,
        totalPerSeller,
        totalPrice: merchandiseSubtotal + shippingSubtotal,
        merchandiseSubtotal,
        totalOrderCount,
        groupedProducts,
        shippingSubtotal,
        shippingFees,
    };

    navigation.navigate('OrdersConfirmation', orderInfo);
};

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

      <ScrollView style={styles.content}>
      {Object.keys(groupedProducts).map((seller, index) => {
          const sellerProducts = groupedProducts[seller];
          const sellerSubtotal = sellerProducts.reduce((sum, product) => sum + (product.price * product.orderedQuantity), 0);
          const sellerShippingFee = shippingFees[seller] || 0;
          const sellerTotal = sellerSubtotal + sellerShippingFee;

          return (
            <View style={styles.itemDisplay} key={seller + index}>
              <View style={styles.sellerHeader}>
                <Icon5 name="store" size={20} color="#05652D" style={styles.storeIcon} />
                <Text style={styles.sellerName}>{seller}</Text>
              </View>
              {sellerProducts.map((item, itemIndex) => (
                <View key={`product-${seller}-${itemIndex}`}>
                  {renderProductItem({ item })}
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.sellerInfo}>
                <Text style={styles.labelText}>Delivery Fee:</Text>
                <Text style={styles.productsubText}>₱{sellerShippingFee.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.sellerInfo}>
                <Text style={styles.labelText}>Order Total ({sellerProducts.length} item/s):</Text>
                <Text style={styles.productsubText}>₱{sellerTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
            </View>
          );
        })}
        {/* <View style={styles.divider} /> */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.addresslabel}>Delivery Address:</Text>
            <TouchableOpacity onPress={() => setLocationSearchModalVisible(true)} style={styles.addressContainer}>
              <Icon name="map-marker" size={30} color="#808080" style={styles.labelIcon} />
              <Text style={styles.addressText}>{address}</Text>
              <Icon name="pencil" size={16} color="#05652D" style={styles.editIcon} />
            </TouchableOpacity>
          </View>
        </View>
        {/* <View style={styles.divider} />
        <View style={styles.infoItem}>
        <Text style={styles.labelText}>Delivery Fee:</Text>
        <Text style={styles.productsubText}>{`₱${shippingFee.toFixed(2)}`}</Text>
      </View>
        <View style={styles.divider} />
        <View style={styles.infoItem}>
         <Text style={styles.labelText}>Order Total ({totalItemCount} item/s):</Text>
          <Text style={styles.productsubText}>{` ₱${subtotalPrice.toFixed(2)}`}</Text>
        </View> */}
        <View style={styles.divider} />
          <View style={styles.infoItem}>
          <Text style={styles.labelText}>Payment Option:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentMethodContainer}>
            <TouchableOpacity onPress={() => setPaymentMethod('Cash on Delivery')} style={styles.paymentOption}>
              <Text style={styles.radioLabel}>Cash on Delivery</Text>
              <Icon
                name={paymentMethod === 'Cash on Delivery' ? 'dot-circle-o' : 'circle-o'}
                size={24}
                color="#05652D"
                style={styles.radioIcon}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>
          <View style={styles.divider} />
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            
            <View style={styles.cardItem}>
              <Text style={styles.productDetail}>Merchandise Subtotal</Text>
              <Text style={styles.priceTextGreen}>₱{subtotalPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.cardItem}>
              <Text style={styles.productDetail}>Delivery Fee Subtotal</Text>
              <Text style={styles.priceTextGreen}>₱{shippingSubtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardItem}>
              <Text style={styles.productDetail2}>Total Payment</Text>
              <Text style={styles.priceTextGreen2}>₱{totalPrice.toFixed(2)}</Text>
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
  productInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc', 
    justifyContent: 'space-between',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    color: '#666',
  },
  productQuantity: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  infoContainer: {
    marginBottom: 20,
  },
  labelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addressText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  totalContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeOrderButton: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#05652D',
    marginLeft: 20,
  },
  content: {
    padding: 20,
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
  },
  totalPaymentContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  totalPaymentLabel: {
    fontSize: 16,
    color: '#333',
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
  },
  placeOrderLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  productPrice: {
    color: '#05652D',
    fontSize: 12, 
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
  productLocation: {
    fontSize: 12,
    color: '#888',
    flexShrink: 1, 
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 5,
  },
  infoContainer: {
      //
  },
  infoItem: {
    //
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',

  },
  infoText: {
    fontSize: 16,
    color: '#666',
  },
  productsubText: {
    fontSize: 16,
    color: '#05652D',
    fontWeight: 'bold',
    textAlign: 'right',
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
  cardContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
  },
  priceTextGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'right',
  },
  priceTextGreen2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'right',
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
    borderRadius: 10,
  },
  addresslabel: {
    fontSize: 16,
    color: '#000',
    flex: 1,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  addressText: {
    fontSize: 16,
    marginLeft: 8,
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
    paddingHorizontal: 15,
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
  productNameGray: {
    fontSize: 16,
    color: '#888', 
    fontWeight: 'bold',
  },
  productQuantityGreen: {
    fontSize: 14,
    color: '#05652D', 
  },
  productPriceGreen: {
    fontSize: 16,
    color: '#05652D', 
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productDetail: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'left',
  },
  productDetail2: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'left',
  },
  totalPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sellerHeader: {
    backgroundColor: '#E8F5E9', 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5, 

  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10, 
  },
  storeIcon: {
    color: '#05652D', 
  },
  itemDisplay: {
    marginBottom: 10,
  },
});

export default CheckoutProducts;
