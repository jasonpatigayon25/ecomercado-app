import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import RequesterTab from '../navbars/RequesterTab';

const windowWidth = Dimensions.get('window').width;

const RequestApproval = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState({});
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [selectedTab, setSelectedTab] = useState('To Approve');

  const tabStatusMapping = {
    'To Approve': 'Pending',
    'To Deliver': 'Approved',
    'To Receive': 'Receiving',
    'Completed': 'Completed',
    'Taken/Declined': 'Declined'
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const q = query(collection(db, "requests"), where("requesterEmail", "==", currentUser.email), where("status", "==", tabStatusMapping[selectedTab]));
      const querySnapshot = await getDocs(q);
      const fetchedRequests = [];
      const donationIds = new Set();

      querySnapshot.forEach((doc) => {
        const requestData = { id: doc.id, ...doc.data() };
        requestData.donorDetails.forEach(detail => donationIds.add(detail.donationId));
        fetchedRequests.push(requestData);
      });

      setRequests(fetchedRequests);
      fetchDonations([...donationIds]); 
    };

    fetchRequests();
  }, [selectedTab]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData[userData.email] = userData;
      });
      setUsers(usersData);
    };

    fetchUsers();
  }, []);

  const fetchDonations = async (donationIds) => {
    const donationData = {};
    for (let id of donationIds) {
      const donationRef = doc(db, "donation", id);
      const docSnap = await getDoc(donationRef);
      if (docSnap.exists()) {
        donationData[id] = docSnap.data();
      }
    }
    setDonations(donationData);
    setLoading(false);
  };

  const GroupHeader = ({ donorEmail }) => {
    const user = users[donorEmail];
    const fullName = user ? `${user.firstName} ${user.lastName}` : donorEmail;
    return (
      <View style={styles.groupHeader}>
        <Icon name="heart" size={16} color="#FF0000" style={styles.heartIcon} />
        <Text style={styles.fullName}>{fullName}</Text>
      </View>
    );
  };

  const renderDonationItem = ({ item }) => {
    const donation = donations[item.donationId];
    if (!donation) return null;
  
    const donationItems = donation.itemNames.join(' · '); 
    return (
      <View>
        <GroupHeader donorEmail={donation.donor_email} />
        <TouchableOpacity style={styles.donationItem}>
          <Image source={{ uri: donation.photo }} style={styles.donationImage} />
          <View style={styles.donationDetails}>
            <Text style={styles.donationName}>{donation.name}</Text>
            <Text style={styles.donationItems}>{donationItems}</Text>
            <Text style={styles.donationCategory}>{donation.category} Bundles</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRequestItem = ({ item }) => {

    const totalFee = item.disposalFee + item.deliveryFee;
  
    return (
      <View style={styles.requestCard}>
        <Text style={styles.requestTitle}>#{item.id}</Text>
        <FlatList
          data={item.donorDetails}
          renderItem={renderDonationItem}
          keyExtractor={(donation, index) => `${donation.donationId}-${index}`}
        />
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Total Fee:</Text>
          <Text style={styles.feeValue}>₱{totalFee.toFixed(2)}</Text>
        </View>
      </View>
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
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      )}
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
  donationItem: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  donationDetails: {
    marginLeft: 10,
    justifyContent: 'center',
    flex: 1,
  },
  fullName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  heartIcon: {
    marginRight: 5,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  donationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  donationItems: {
    fontSize: 14,
    color: '#666',
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    marginTop: 10,
  },
  feeLabel: {
    fontSize: 16,
    color: '#444',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
  },
  list: {
    flex: 1,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 10,
    color:'#666',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  donationImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  donationCategory: {
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
});

export default RequestApproval;
