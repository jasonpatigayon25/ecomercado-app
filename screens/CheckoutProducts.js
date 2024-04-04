  import React, { useState, useEffect } from 'react';
  import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, Alert } from 'react-native';
  import Icon from 'react-native-vector-icons/FontAwesome';
  import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
  import axios from 'axios';
  import { Dimensions } from 'react-native';
  import { TextInput } from 'react-native-gesture-handler';
  import { collection, query, where, getDocs } from 'firebase/firestore';
  import { db } from '../config/firebase'; 
  import { getAuth } from 'firebase/auth';

  const screenHeight = Dimensions.get('window').height;

  const CheckoutProducts = ({ navigation, route }) => {
    const { selectedProducts } = route.params || [];
    const [totalPrice, setTotalPrice] = useState(0);

    const [address, setAddress] = useState('Search Location');
    const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
    const [quantity, setQuantity] = useState(1);
    const [availableQuantity, setAvailableQuantity] = useState(selectedProducts.quantity);
    const orderedPrice = parseFloat(selectedProducts.price) * quantity;

    const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [locationSearchResults, setLocationSearchResults] = useState([]);

    useEffect(() => {
      const total = selectedProducts.reduce((sum, product) => sum + (product.orderedPrice || 0), 0);
      setTotalPrice(total);
    }, [selectedProducts]);

    const renderProductItem = ({ item }) => (
      <View style={styles.productInfoContainer}>
        <Image source={{ uri: item.photo }} style={styles.productImage} />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
          <Text style={styles.productQuantity}>x{item.orderedQuantity}</Text>
        </View>
      </View>
    );

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

      const orderInfo = {
        address,
        paymentMethod,
        quantity,
        totalPrice,
        productDetails: selectedProducts,
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
        {selectedProducts.map((product, index) => (
            <View key={index}>
              <Text style={styles.sellerName}>{product.sellerName}</Text>
              {renderProductItem({ item: product })}
            </View>
          ))}
          
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
            <Text style={styles.cardTitle}>Quantity:</Text>
            {selectedProducts.map((product, index) => (
              <View key={index} style={styles.cardItem}>
                <Text style={styles.productDetail} numberOfLines={1} ellipsizeMode="tail">{product.name}</Text>
                <Text style={styles.priceTextGreen}>{product.orderedQuantity}</Text>
              </View>
            ))}

            <Text style={styles.cardTitle}>Ordered Price:</Text>
            {selectedProducts.map((product, index) => (
              <View key={index} style={styles.cardItem}>
                <Text style={styles.productDetail} numberOfLines={1} ellipsizeMode="tail">{product.name}</Text>
                <Text style={styles.priceTextGreen}>₱{(product.price * product.orderedQuantity).toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            <View style={styles.totalPaymentItem}>
              <Text style={styles.labelText}>Total Payment:</Text>
              <Text style={styles.totalPaymentAmount}>₱{totalPrice.toFixed(2)}</Text>
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
    },
    productLocation: {
      fontSize: 12,
      color: '#888',
      flexShrink: 1, 
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
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 5,
    },
    productDetail: {
      fontSize: 16,
      color: 'gray',
      paddingLeft: 50,
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
    sellerName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginVertical: 10,
    },
  });

  export default CheckoutProducts;
