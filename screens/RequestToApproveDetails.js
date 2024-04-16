import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { getDocs, query, collection, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import moment from 'moment';

const RequestToApproveDetails = ({ route, navigation }) => {
  const { request, donations, users } = route.params;

  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnimation, {
          toValue: -1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnimation]);

  const rotate = rotateAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  const GroupHeader = ({ donorEmail }) => {
    if (!users || !users[donorEmail]) {
      return <View style={styles.groupHeader}><Text>Loading donor details...</Text></View>;
    }
    const user = users[donorEmail];
    const fullName = user ? `${user.firstName} ${user.lastName}` : donorEmail;
    return (
      <View style={styles.groupHeader}>
        <Icon name="heart" size={16} color="#FF0000" style={styles.heartIcon} />
        <Text style={styles.fullName}>From: {fullName}</Text>
      </View>
    );
  };

  const contactSeller = () => {
    // 
  };

  const cancelRequest = async () => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        {
          text: "No",
          style: "cancel",
        },
        { 
          text: "Yes", 
          onPress: async () => {
            try {
              const requestRef = doc(db, 'requests', request.id);
              await updateDoc(requestRef, {
                status: 'Declined',
              });
  
              Alert.alert(
                "Request Cancelled",
                "Your request has been cancelled.",
                [
                  { text: "OK", onPress: () => navigation.navigate('RequestHistory') }
                ]
              );
            } catch (error) {
              console.error("Error updating req status: ", error);
              Alert.alert("Error", "Could not cancel the req at this time.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Request Details</Text>
        </View>
        <ScrollView style={styles.container}>
        <View key={request.id} style={styles.requestCard}>
            {/* <Text style={styles.requestTitle}>#{request.id}</Text> */}
            {request.donorDetails.map((detail, idx) => {
                const donation = donations[detail.donationId];
                if (!donation) return null;
                return (
                    <View key={idx}>
                        <GroupHeader donorEmail={donation.donor_email} />
                        <View style={styles.donationItem}>
                            <Image source={{ uri: donation.photo }} style={styles.donationImage} />
                            <View style={styles.donationDetails}>
                                <Text style={styles.donationName}>{donation.name}</Text>
                                <Text style={styles.donationItems}>{donation.itemNames.join(' · ')}</Text>
                                <Text style={styles.donationCategory}>{donation.category} Bundle</Text>
                            </View>
                        </View>
                    </View>
                );
            })}
            {/* <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>Total Fee:</Text>
                <Text style={styles.feeValue}>₱{(request.disposalFee + request.deliveryFee).toFixed(2)}</Text>
            </View> */}
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                <Text style={styles.paymentMethodValue}>{request.paymentMethod}</Text>
            </View>
            <View style={styles.orderTotalSection}>
                <Text style={styles.orderTotalLabel}>FEES</Text>
                <View style={styles.orderTotalDetails}>
                <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalText}>
                    Delivery Fee Subtotal:
                </Text>
                    <Text style={styles.orderTotalValue}>₱{request.disposalFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalText}>Disposal Fee Subtotal:</Text>
                    <Text style={styles.orderTotalValue}>₱{request.deliveryFee.toFixed(2)}</Text>
                </View>
                <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalTextFinal}>Total Fee:</Text>
                    <Text style={styles.orderTotalValueFinal}>₱{(request.disposalFee + request.deliveryFee).toFixed(2)}</Text>
                </View>
                </View>
            </View>
            <View style={styles.orderInfo}>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{request.id.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Time:</Text>
                <Text style={styles.detailValue}>
                {moment(request.dateRequested.toDate()).format('DD-MM-YYYY HH:mm')}
                </Text>
            </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.contactButton} onPress={contactSeller}>
                    <Text style={styles.contactbuttonText}>Contact Seller</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelRequest}>
                    <Text style={styles.cancelbuttonText}>Cancel Request</Text>
                </TouchableOpacity>
            </View>
        </View>
    </ScrollView>
    <View style={styles.footer}>
        <TouchableOpacity style={styles.pendingButton} disabled>
            <Text style={styles.pendingButtonText}>Pending Order </Text>
            <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon5 name="hourglass-half" size={24} color="#fff" />
            </Animated.View>
        </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
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
  donationImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  donationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  donationItems: {
    fontSize: 14,
    color: '#666',
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
  button: {
    backgroundColor: '#05652D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  requestTitle: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 10,
    color:'#666',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fullName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  heartIcon: {
    marginRight: 5,
  },
  actionButtons: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingTop: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',

  },
  contactButton: {
    backgroundColor: '#0096FF',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    elevation: 2,
  },
  cancelButton: {
    borderColor: 'red',
    borderWidth: 2,
    padding: 15,
    borderRadius: 5,
    flex: 1,
  },
  contactbuttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  cancelbuttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff0000',
    textAlign: 'center',
  },
  orderTotalSection: {
    marginTop: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1, 
    borderBottomWidth: 1,  
    borderColor: '#ccc',
  },
  orderTotalDetails: {
    marginTop: 10,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  orderTotalText: {
    fontSize: 14,
    color: '#666',
  },
  orderTotalTextFinal: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  orderTotalValue: {
    fontSize: 14,
    color: '#666',
  },
  orderTotalValueFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
orderTotalLabel: {
  fontSize: 16,
  color: '#000', 
  marginBottom: 10,
},
orderTotalPrice: {
  fontWeight: 'bold',
  fontSize: 18,
  color: '#05652D', 
  marginBottom: 10,
},
paymentMethodContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 20,
  paddingHorizontal: 10,
  paddingTop: 10,
},
paymentMethodLabel: {
  fontSize: 14,
  color: '#666',
},
paymentMethodValue: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#333',
},
orderInfo: {
  marginTop: 10,
  paddingVertical: 10,
  paddingHorizontal: 15,
},
orderLabel: {
  fontSize: 14,
  color: '#666',
},
orderValue: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
},
detailRow: { 
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 5,
},
detailLabel: { 
  fontSize: 14,
  color: '#666',
},
detailValue: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#333',
},
footer: {
  padding: 10,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#ccc',
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: -2 },
},
pendingButton: {
  backgroundColor: '#666',
  padding: 15,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  width: '70%',
  borderRadius: 10,
},
pendingButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
});

export default RequestToApproveDetails;