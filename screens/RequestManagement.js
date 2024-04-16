import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import DonorTab from '../navbars/DonorTab';

const windowWidth = Dimensions.get('window').width;

const RequestManagement = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState({});
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [selectedTab, setSelectedTab] = useState('To Approve');

  const [requesters, setRequesters] = useState({});

  const tabStatusMapping = {
    'To Approve': 'Pending',
    'To Deliver': 'Approved',
    'Receiving': 'Receiving',
    'Completed': 'Completed',
    'Taken/Declined': 'Declined'
  };

  const renderEmptyListComponent = (tab) => {
    let icon = 'inbox';  
    let message = `No ${tab} Orders yet.`; 

    switch (tab) {
        case 'To Approve':
            icon = 'truck';
            break;
          case 'To Deliver':
            icon = 'truck';
            break;
        case 'Receiving':
            icon = 'truck';
            break;
        case 'Completed':
            icon = 'flag-checkered';
            break;
        case 'Taken/Declined':
            icon = 'times-circle';
            break;
    }

    return (
        <View style={styles.emptyOrdersContainer}>
            <Icon name={icon} size={50} color="#cccccc" />
            <Text style={styles.emptyOrdersText}>{message}</Text>
        </View>
    );
};

useEffect(() => {
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const statusToFetch = tabStatusMapping[selectedTab];
      const q = query(
        collection(db, "requests"),
        where("status", "==", statusToFetch),
        orderBy("dateRequested", "desc")
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let fetchedRequests = [];
        querySnapshot.forEach((doc) => {
          const requestData = { id: doc.id, ...doc.data() };
          const isUserDonor = requestData.donorDetails.some(
            detail => detail.donorEmail === currentUser.email
          );
          if (isUserDonor) {
            fetchedRequests.push(requestData);
          }
        });
  
        const requesterEmails = new Set();
        const donationIds = new Set();
        fetchedRequests.forEach(request => {
          requesterEmails.add(request.requesterEmail);
          request.donorDetails.forEach(detail => {
            donationIds.add(detail.donationId);
          });
        });

        fetchRequesters([...requesterEmails]);
        fetchDonations([...donationIds]);

        setRequests(fetchedRequests);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching requests: ", error);
    }
  };

  if (currentUser && currentUser.email) {
    fetchRequests();
  }
}, [selectedTab, currentUser]);

  const fetchRequesters = async (emails) => {
    const requesterData = {};
    for (let email of emails) {
      const userRef = doc(db, "users", email);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          requesterData[email] = doc.data();
          setRequesters({ ...requesterData });
        }
      });
    }
  };

  const fetchDonations = async (donationIds) => {
    const donationData = {};
    for (let id of donationIds) {
      const donationRef = doc(db, "donation", id);
      const unsubscribe = onSnapshot(donationRef, (doc) => {
        if (doc.exists()) {
          donationData[id] = doc.data();
          setDonations({ ...donationData });
        }
      });
    }
  };

  const GroupHeader = ({ requesterEmail }) => {
    const [requester, setRequester] = useState(null);
  
    useEffect(() => {
      const fetchRequesterData = async () => {
        try {
          const userRef = doc(db, "users", requesterEmail);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            setRequester(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching requester data: ", error);
        }
      };
  
      fetchRequesterData();
    }, [requesterEmail]);
  
    const fullName = requester ? `${requester.firstName} ${requester.lastName}` : requesterEmail;
  
    return (
      <View style={styles.groupHeader}>
        {/* <Icon name="heart" size={16} color="#FF0000" style={styles.heartIcon} /> */}
        <Text style={styles.fullName}>Request from: {fullName}</Text>
      </View>
    );
  };

  // const renderDonationItem = ({ item }) => {
  //   const donation = donations[item.donationId];
  //   if (!donation) return null;
  
  //   const donationItems = donation.itemNames.join(' · '); 
  //   return (
  //     <View>
  //       <GroupHeader donorEmail={donation.donor_email} />
  //       <TouchableOpacity style={styles.donationItem}>
  //         <Image source={{ uri: donation.photo }} style={styles.donationImage} />
  //         <View style={styles.donationDetails}>
  //           <Text style={styles.donationName}>{donation.name}</Text>
  //           <Text style={styles.donationItems}>{donationItems}</Text>
  //           <Text style={styles.donationCategory}>{donation.category} Bundles</Text>
  //         </View>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // };

  const renderRequestItem = ({ item }) => {
    const requesterEmail = item.requesterEmail;
    const requester = requesters[item.requesterEmail];
    const fullName = requester ? `${requester.firstName} ${requester.lastName}` : item.requesterEmail;
    const totalFee = item.disposalFee + item.deliveryFee;
    const uniqueDonorNames = {};

    const handlePress = (request) => {
        if (selectedTab === 'To Approve') {
          navigation.navigate('RequestToApproveByDonorDetails', { request: request, donations: donations, users: users });
        } else if (selectedTab === 'To Deliver') {
          navigation.navigate('RequestToDeliverByDonorDetails', { request: request, donations: donations, users: users });
        } else if (selectedTab === 'Receiving') {
          navigation.navigate('RequestReceivingDetails', { request: request, donations: donations, users: users });
        } else if (selectedTab === 'Completed') {
          navigation.navigate('RequestCompletedByDonorDetails', { request: request, donations: donations, users: users });
        } else if (selectedTab === 'Taken/Declined') {
          navigation.navigate('RequestDeclinedByDonorDetails', { request: request, donations: donations, users: users });
        }
      };
  
    const renderButton = (status) => {
      switch (status) {
        case 'To Approve':
          return (
            <View style={styles.noteButtonContainer}>
              <TouchableOpacity style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          );
        case 'To Deliver':
          return (
            <View style={styles.noteButtonContainer}>
              <TouchableOpacity style={styles.shipButton}>
                <Text style={styles.confirmButtonText}>Contact Donor</Text>
              </TouchableOpacity>
            </View>
          );
        case 'To Receive':
          return (
            <View style={styles.noteButtonContainer}>
              <TouchableOpacity style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
              </TouchableOpacity>
            </View>
          );
        case 'Completed':
          return <Text style={styles.completedText}>Donations Acquired</Text>;
        case 'Taken/Declined':
          return <Text style={styles.declinedText}>Donation Already Taken</Text>;
        default:
          return null;
      }
    };
  
    return (
      <TouchableOpacity onPress={() => handlePress(item)} style={styles.requestCard}>
        <Text style={styles.requestTitle}>#{item.id.toUpperCase()}</Text> 
        <FlatList
          data={item.donorDetails}
          renderItem={({ item: detail }) => {
            const donation = donations[detail.donationId];
            if (!donation) return null;

            if (!uniqueDonorNames[donation.donor_email]) {
              uniqueDonorNames[donation.donor_email] = true;
              return (
                <View>
                  <GroupHeader requesterEmail={requesterEmail} /> 
                  <TouchableOpacity style={styles.donationItem}>
                    <Image source={{ uri: donation.photo }} style={styles.donationImage} />
                    <View style={styles.donationDetails}>
                      <Text style={styles.donationName}>{donation.name}</Text>
                      <Text style={styles.donationItems}>{donation.itemNames.join(' · ')}</Text>
                      <Text style={styles.donationCategory}>{donation.category} Bundle</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            } else {
              return (
                <TouchableOpacity style={styles.donationItem}>
                  <Image source={{ uri: donation.photo }} style={styles.donationImage} />
                  <View style={styles.donationDetails}>
                    <Text style={styles.donationName}>{donation.name}</Text>
                    <Text style={styles.donationItems}>{donation.itemNames.join(' · ')}</Text>
                    <Text style={styles.donationCategory}>{donation.category} Bundle</Text>
                  </View>
                </TouchableOpacity>
              );
            }
          }}
          keyExtractor={(detail) => detail.donationId}
        />
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Total Fee:</Text>
          <Text style={styles.feeValue}>₱{totalFee.toFixed(2)}</Text>
        </View>
        <View style={styles.buttonContainer}>
          {renderButton(selectedTab)}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Donation Requests Management</Text>
      </View>
      <DonorTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => renderEmptyListComponent(selectedTab)}
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
    backgroundColor: '#FFF7F7',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#ECECEC',
  },
  button: {
    backgroundColor: '#05652D',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completedText: {
    color: '#05652D',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  declinedText: {
    color: '#FF0000',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  pendingButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  pendingButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50', 
    padding: 10,
    borderRadius: 5,
  },
  shipButton: {
    backgroundColor: '#0096FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  noteButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginTop: 10,
  },
  noteText: {
    textAlign: 'left',
    color: '#666', 
    marginRight: 30,
  },
  emptyOrdersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50
},
emptyOrdersText: {
    fontSize: 18,
    color: '#cccccc',
    marginTop: 20
},
});

export default RequestManagement;