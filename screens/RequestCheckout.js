import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, SafeAreaView, Alert, 
    SectionList, Modal, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDoc, onSnapshot, updateDoc, getDocs, where, query } from 'firebase/firestore';

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


  useEffect(() => {
    const fetchDonationsWithDonorNames = async () => {
      const donationsWithDonorInfo = [];

      for (const donation of selectedDonations) {
        const donorEmail = donation.donor_email;
  
        const usersQuery = query(collection(db, 'users'), where('email', '==', donorEmail));
        const userSnapshot = await getDocs(usersQuery);
  

        if (!userSnapshot.empty) {
          const donorData = userSnapshot.docs[0].data();

          donationsWithDonorInfo.push({
            ...donation,
            donorFirstName: donorData.firstName,
            donorLastName: donorData.lastName,
          });
        }
      }

      const groupedDonations = donationsWithDonorInfo.reduce((grouped, donation) => {
        const donorName = `${donation.donorFirstName} ${donation.donorLastName}`;
        if (!grouped[donorName]) {
          grouped[donorName] = [];
        }
        grouped[donorName].push(donation);
        return grouped;
      }, {});

      const sectionListData = Object.keys(groupedDonations).map(donorName => ({
        title: donorName,
        data: groupedDonations[donorName],
      }));

      setSections(sectionListData);
    };
  
    fetchDonationsWithDonorNames();
  }, [selectedDonations]); // 

  useEffect(() => {
    console.log("Wish Items detected");
}, [wishItems]);

const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>From: {title}</Text>
    </View>
  );

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
        ListFooterComponent={<View style={{ height: 70 }} />} 
        contentContainerStyle={{ paddingBottom: 70 }} 
      />
    <View style={styles.navbar}>
    <View style={styles.totalPaymentContainer}>
          <Text style={styles.totalPaymentLabel}>Delivery Fee:</Text>
          <Text style={styles.totalPaymentAmount}>0</Text>
        </View>
      <TouchableOpacity style={styles.placeRequestButton} onPress={() => {/* ... function to handle request */}}>
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
    backgroundColor: '#f4f4f4',
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
});

export default RequestCheckout;
