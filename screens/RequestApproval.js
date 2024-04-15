import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, Dimensions, Modal, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, updateDoc, doc, where, writeBatch, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import axios from 'axios';
import RequesterTab from '../navbars/RequesterTab';

const windowWidth = Dimensions.get('window').width;

const RequestApproval = ({ navigation }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scrollRef = useRef(); 

  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState({});
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;
  const [selectedTab, setSelectedTab] = useState('To Approve');

  const tabStatusMapping = {
    'To Approve': 'Pending',
    'To Deliver': 'Approved',
    'To Receive': 'Receiving',
    'Completed': 'Completed',
    'Taken/Declined': 'Declined'
  };

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const tabIndex = Math.floor(scrollX / windowWidth);
    const tabNames = ['To Approve', 'To Deliver', 'To Receive', 'Completed', 'Taken/Declined'];
    setSelectedTab(tabNames[tabIndex]);
  };

  const fetchRequests = useCallback(async (tab) => {
    if (!user) return;
  
    setLoading(true);
    try {
      const status = tabStatusMapping[tab];
      const requestsQuery = query(
        collection(db, 'requests'),
        where('requesterEmail', '==', user.email),
        where('status', '==', status),
        orderBy('dateRequested', 'desc')
      );
  
      const querySnapshot = await getDocs(requestsQuery);
      const fetchedRequests = [];
      querySnapshot.forEach((doc) => {
        fetchedRequests.push({ id: doc.id, ...doc.data() });
      });
  
      setRequests(fetchedRequests);
      await fetchDonationDetails(fetchedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDonationDetails = async (requests) => {
    const donationIds = new Set();
    requests.forEach(request => {
      if (Array.isArray(request.donorDetails)) {
        request.donorDetails.forEach(donorDetail => {
          donationIds.add(donorDetail.donationId);
        });
      }
    });
    
    const fetchedDonations = {};
  
    for (let donationId of donationIds) {
      const donationRef = doc(db, 'donations', donationId);
      const donationSnap = await getDoc(donationRef);
      if (donationSnap.exists()) {
        const donationData = donationSnap.data();
        fetchedDonations[donationId] = {
          ...donationData,
          // Assuming donationData contains 'name' and other donation info
        };
      }
    }
  
    setDonations(fetchedDonations);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests(selectedTab);
  }, [selectedTab, fetchRequests]);

  const renderDonationItem = ({ item: request }) => {
    const handlePress = () => {
      navigation.navigate('RequestDetails', { request, donations });
    };
  
    // Access the correct 'donorDetails' array from the request object.
    const donationDetails = (request.donorDetails || []).map((donorDetail, index) => {
      const donation = donations[donorDetail.donationId];
      return donation ? {
        key: `donation-${index}`,
        photo: donation.photo, // Ensure 'photo' is a field in your donation documents
        name: donation.name,   // Ensure 'name' is a field in your donation documents
      } : null;
    }).filter(Boolean); // Filter out any null values if donation data was not found
  
    return (
      <TouchableOpacity onPress={handlePress} style={styles.requestItemContainer}>
        {donationDetails.map((detail) => (
          <View key={detail.key} style={styles.donationContainer}>
            <Image source={{ uri: detail.photo }} style={styles.donationImage} />
            <Text style={styles.donationName}>{detail.name}</Text>
            {/* Render other donation details here if necessary */}
          </View>
        ))}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Transactions</Text>
      </View>
      <RequesterTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <ScrollView
        horizontal
        pagingEnabled
        onMomentumScrollEnd={handleScroll}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {Object.keys(tabStatusMapping).map((tab, index) => (
          <View key={index} style={{ width: windowWidth }}>
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
            ) : (
              <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderDonationItem}
                ListEmptyComponent={() => (
                  <View style={styles.emptyRequestsContainer}>
                    <Text style={styles.emptyRequestsText}>No {tab} Requests yet.</Text>
                  </View>
                )}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  requestItemContainer: {
    backgroundColor: '#FFFFF0',
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  donationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 5,
    paddingHorizontal: 5,
    borderBottomWidth: 1,  
    borderBottomColor: '#ccc',
  },
  donationHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#E8F5E9',
    padding: 8,
    marginTop: 10,
  },
  donationImage: {
    width: 50, 
    height: 50, 
    marginRight: 10,
  },
  donationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  donationCategory: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#ECECEC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginVertical: 4,
    textAlign: 'center',
  },
  donationWeight: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginVertical: 4,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  emptyRequestsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyRequestsText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
});

export default RequestApproval;