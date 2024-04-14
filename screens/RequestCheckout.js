import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, SafeAreaView, Alert, Dimensions,
    SectionList, Modal, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDoc, onSnapshot, updateDoc, getDocs, where, query } from 'firebase/firestore';
import axios from 'axios';

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
      return 0;
    }
  } catch (error) {
    console.error('Error fetching distance:', error);
    return 0;
  }
};

const screenHeight = Dimensions.get('window').height;



const RequestCheckout = ({ navigation, route }) => {
 const [wishItems, setWishItems] = useState([]);
 const [currentItem, setCurrentItem] = useState(null);
 const auth = getAuth();
 const user = auth.currentUser;
  const { selectedDonations } = route.params;
  const [sections, setSections] = useState([]);
  const [address, setAddress] = useState('Search Location');

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

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

  const FeeSummary = ({ sections }) => {

    const deliveryFeeSubtotal = sections.reduce((sum, section) => sum + (section.deliveryFee || 0), 0);
    const disposalFeeSubtotal = sections.reduce((sum, section) => sum + (section.disposalFee || 0), 0);
    const totalFee = deliveryFeeSubtotal + disposalFeeSubtotal;
  
    return (
      <View style={styles.cardContainer}>
        <Text style={styles.cardTitle}>Fee Details</Text>
  
        <View style={styles.cardItem}>
          <Text style={styles.productDetail}>Delivery Fee SubTotal</Text>
          <Text style={styles.priceTextGreen}>₱{deliveryFeeSubtotal.toFixed(2)}</Text>
        </View>
  
        <View style={styles.cardItem}>
          <Text style={styles.productDetail}>Disposal Fee SubTotal</Text>
          <Text style={styles.priceTextGreen}>₱{disposalFeeSubtotal.toFixed(2)}</Text>
        </View>
  
        <View style={styles.divider} />
  
        <View style={styles.cardItem}>
          <Text style={styles.productDetail2}>Total Fee</Text>
          <Text style={styles.priceTextGreen2}>₱{totalFee.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const fetchDonationsWithDonorNames = async () => {
    const donationsWithDonorInfo = [];
    const deliveryFeesCache = {};
    const weightCache = {};
  
    for (const donation of selectedDonations) {
      const donorEmail = donation.donor_email;
      const usersQuery = query(collection(db, 'users'), where('email', '==', donorEmail));
      const userSnapshot = await getDocs(usersQuery);
  
      if (!userSnapshot.empty) {
        const donorData = userSnapshot.docs[0].data();
        const donorAddress = donorData.address;
  
        let deliveryFee = deliveryFeesCache[donorEmail];
        if (!deliveryFee && donorAddress && address) { 
          deliveryFee = await getDistanceAndCalculateFee(donorAddress, address);
          deliveryFeesCache[donorEmail] = deliveryFee;
        }
  
        const itemWeight = parseFloat(donation.weight) || 0;
        if (weightCache[donorEmail]) {
          weightCache[donorEmail] += itemWeight;
        } else {
          weightCache[donorEmail] = itemWeight;
        }
  
        donationsWithDonorInfo.push({
          ...donation,
          donorFirstName: donorData.firstName,
          donorLastName: donorData.lastName,
          deliveryFee,
          weight: itemWeight
        });
      }
    }
  
    const groupedDonations = donationsWithDonorInfo.reduce((grouped, donation) => {
      const donorName = `${donation.donorFirstName} ${donation.donorLastName}`;
      if (!grouped[donorName]) {
        grouped[donorName] = { donations: [], count: 0, deliveryFee: donation.deliveryFee, totalWeight: 0 };
      }
      grouped[donorName].donations.push(donation);
      grouped[donorName].count += 1;
      grouped[donorName].totalWeight += donation.weight;
      return grouped;
    }, {});
  
    Object.values(groupedDonations).forEach(group => {
      const weight = group.totalWeight;
      group.disposalFee = 0;
      if (weight > 5) {
        group.disposalFee = Math.ceil((weight - 5) / 5) * 20;
      }
    });
  
    const sectionListData = Object.keys(groupedDonations).map(donorName => ({
      title: donorName,
      data: groupedDonations[donorName].donations,
      itemCount: groupedDonations[donorName].count,
      deliveryFee: groupedDonations[donorName].deliveryFee,
      disposalFee: groupedDonations[donorName].disposalFee,
      totalWeight: groupedDonations[donorName].totalWeight 
    }));
  
    setSections(sectionListData);
  };
  
  useEffect(() => {
    fetchDonationsWithDonorNames();
  }, [selectedDonations, address]);

const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>From: {title}</Text>
    </View>
  );

  const renderSectionFooter = ({ section }) => {

    const { itemCount, deliveryFee, disposalFee, totalWeight } = section;

    const weightText = totalWeight ? `${totalWeight.toFixed(1)}kg` : '0kg';

    const formattedDeliveryFee = deliveryFee ? `₱${Number(deliveryFee).toFixed(2)}` : '₱0.00';
    const formattedDisposalFee = disposalFee ? `₱${Number(disposalFee).toFixed(2)}` : '₱0.00';
  
    return (
      <View style={styles.footer}>
        <View style={styles.sectionFooter}>
          <Text style={styles.labelText}>Total Bundles:</Text>
          <Text style={styles.productsubText}>{itemCount}</Text>
        </View>
        <View style={styles.sectionFooter}>
          <Text style={styles.labelText}>Delivery Fee:</Text>
          <Text style={styles.productsubText}>{formattedDeliveryFee}</Text>
        </View>
        <View style={styles.sectionFooter}>
          <Text style={styles.labelText}>Disposal Fee: ({weightText})</Text>
          <Text style={styles.productsubText}>{formattedDisposalFee}</Text>
        </View>
      </View>
    );
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.cartItem}>
      <View style={styles.itemLeftSection}>
        <Image source={{ uri: item.photo }} style={styles.cartImage} />
      </View>
      <View style={styles.cartDetails}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartitemnames}>
          {item.itemNames && item.itemNames.length > 0 ? `${item.itemNames.join(' · ')}` : ''}
        </Text>
        <Text style={styles.cartCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  const FeeSummarySection = useMemo(() => <FeeSummary sections={sections} />, [sections]);

  const feeSummary = useMemo(() => {
    return sections.length > 0 ? <FeeSummary sections={sections} /> : null;
  }, [sections]);


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#05652D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Checkout</Text>
      </View>
  
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter} 
        ListHeaderComponent={
          <View style={styles.infoContainer}>
            <Text style={styles.addresslabel}>Delivery Address:</Text>
            <TouchableOpacity onPress={() => setLocationSearchModalVisible(true)} style={styles.addressContainer}>
              <Icon1 name="map-marker" size={30} color="#808080" style={styles.labelIcon} />
              <Text style={styles.addressText}>{address}</Text>
              <Icon1 name="pencil" size={16} color="#05652D" style={styles.editIcon} />
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<>
          {feeSummary}
          <View style={{ height: 10 }} />
        </>
      } 
        contentContainerStyle={{ paddingBottom: 10 }} 
      />
    <View style={styles.navbar}>
    <View style={styles.totalPaymentContainer}>
          <Text style={styles.totalPaymentLabel}>Delivery Fee:</Text>
          <Text style={styles.totalPaymentAmount}>0</Text>
        </View>
      <TouchableOpacity style={styles.placeRequestButton} onPress={() => {/* ...  */}}>
        <Text style={styles.placeRequestButtonText}>Place Request</Text>
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
    position: 'absolute',
    top: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    zIndex: 1,
  },
  scrollContainer: {
    marginTop: 70, 
    marginBottom: 70, 
  },
  placeRequestButton: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
  },
  placeRequestButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#05652D',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  selectedDonationsContainer: {
    flex: 1,
    marginTop: 10,
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
  cartitemnames: {
    fontSize: 12,
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
  sectionHeader: {
    backgroundColor: '#50C878',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 15,
    marginTop: 50,
    backgroundColor: '#FFF',
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  infoContent: {
    fontSize: 14,
    color: '#666',
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
  sectionFooter: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  sectionFooterText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center', 
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
  productDetail: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'left',
  },
  priceTextGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 5,
  },
  productDetail2: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'left',
  },
  priceTextGreen2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'right',
  },
});

export default RequestCheckout;