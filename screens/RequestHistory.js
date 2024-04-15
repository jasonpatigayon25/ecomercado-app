import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const RequestHistory = () => {
  const [requests, setRequests] = useState([]);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchRequests = async () => {
      const q = query(collection(db, "requests"), where("requesterEmail", "==", currentUser.email));
      const querySnapshot = await getDocs(q);
      const requestData = [];
      querySnapshot.forEach((doc) => {
        requestData.push({ id: doc.id, ...doc.data() });
      });
      setRequests(requestData);
    };

    fetchRequests();
  }, []);

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <Text style={styles.requestTitle}>Request ID: {item.id}</Text>
      <Text>Delivery Address: {item.address}</Text>
      <Text>Delivery Fee: ₱{item.deliveryFee.toFixed(2)}</Text>
      <Text>Disposal Fee: ₱{item.disposalFee.toFixed(2)}</Text>
      <Text>Donation IDs:</Text>
      {item.donorDetails.map((donation, index) => (
        <Text key={index}>- {donation.donationId}</Text>
      ))}
    </View>
  );

  return (
    <FlatList
      data={requests}
      renderItem={renderRequestItem}
      keyExtractor={(item) => item.id}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default RequestHistory;
