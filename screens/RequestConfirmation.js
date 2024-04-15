import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { collection, addDoc, doc, updateDoc, getDoc, runTransaction, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';

const RequestConfirmation = ({ navigation, route }) => {
  const { address, donationDetails, deliveryFeeSubtotal, disposalFeeSubtotal, totalFee, message } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handleProceed = async () => {
    Alert.alert(
      "Confirm Request",
      "Do you want to proceed with this request?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              // Extracting sections and other details from the route params
              const {
                address,
                sections,
                deliveryFeeSubtotal,
                disposalFeeSubtotal,
                totalFee,
                message,
              } = route.params;
  
              // Map through the sections to construct an array of donationDetails
              // where each donation is associated with the donor's email.
              const donationDetailsWithDonorEmails = sections.map((section) => ({
                donorEmail: section.donorEmail, // Email per group
                donations: section.data.map((donation) => ({
                  donationId: donation.id, // Make sure to use the correct property for the donation ID
                  // Include any other relevant details from the donation object
                })),
                deliveryFee: section.deliveryFee,
                disposalFee: section.disposalFee,
                // You can include other details from the section if needed
              }));
  
              // Building the request document to add to Firestore
              const requestDoc = {
                donorDetails: donationDetailsWithDonorEmails,
                requesterEmail: currentUser?.email,
                address,
                message,
                status: 'pending',
                deliveryFeeSubtotal,
                disposalFeeSubtotal,
                totalFee,
                dateRequested: serverTimestamp(),
              };
  
              // Adding the request document to Firestore
              const docRef = await addDoc(collection(db, "requests"), requestDoc);
  
              // Handle the success, such as navigating back or to a success page
              navigation.goBack();
              Alert.alert("Success", "Your request has been submitted successfully.");
            } catch (error) {
              // Handle any errors that occur during the process
              console.error("Error processing the request:", error);
              Alert.alert("Error", "An error occurred while processing your request. Please try again.");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const renderItem = ({ item, sectionIndex, itemIndex }) => (
    <View style={styles.cartItem} key={`item-${sectionIndex}-${itemIndex}`}>
      <Image source={{ uri: item.photo }} style={styles.cartImage} />
      <View style={styles.cartDetails}>
        <Text style={styles.cartName}>{item.name}</Text>
        <Text style={styles.cartitemnames}>{item.itemNames && item.itemNames.length > 0 ? `${item.itemNames.join(' · ')}` : ''}</Text>
        <Text style={styles.cartCategory}>{item.category}</Text>
      </View>
    </View>
  );

  const fetchDonorEmails = async (donationDetails) => {
    try {
      const donorInfo = await Promise.all(donationDetails.map(async (detail) => {
        const donationRef = doc(db, "donation", detail.donationId);
        const docSnap = await getDoc(donationRef);
        if (docSnap.exists()) {
          // Include both the donor's email and the donationId
          return { email: docSnap.data().donor_email, donationId: detail.donationId };
        } else {
          console.log("No document found for donation ID:", detail.donationId);
          return null;
        }
      }));
      // Remove any null values from the array of donor information
      return donorInfo.filter(info => info !== null);
    } catch (error) {
      console.error("Error fetching donor emails:", error);
      throw error;
    }
  };

  const renderSection = (item, sectionIndex) => (
    <View style={styles.sectionContainer} key={`section-${sectionIndex}`}>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      {item.data.map((subItem, itemIndex) => renderItem({ item: subItem, sectionIndex, itemIndex }))}
      <View style={styles.sectionFooter}>
        <Text style={styles.footerText}>Total Bundles:</Text>
        <Text style={styles.footerValue}>{item.itemCount}</Text>
      </View>
      <View style={styles.sectionFooter}>
        <Text style={styles.footerText}>Delivery Fee:</Text>
        <Text style={styles.footerValue}>₱{item.deliveryFee.toFixed(2)}</Text>
      </View>
      <View style={styles.sectionFooter}>
        <Text style={styles.footerText}>Disposal Fee ({item.totalWeight.toFixed(1)}kg):</Text>
        <Text style={styles.footerValue}>₱{item.disposalFee.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Confirmation</Text>
      </View>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Delivery Address:</Text>
          <Text style={styles.infoContent}>{address}</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Message for Request:</Text>
          <Text style={styles.infoContent}>{message}</Text>
        </View>
        {donationDetails.map(renderSection)}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Delivery Fee Subtotal:</Text>
          <Text style={styles.totalAmount}>₱{deliveryFeeSubtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Disposal Fee Subtotal:</Text>
          <Text style={styles.totalAmount}>₱{disposalFeeSubtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Fee:</Text>
          <Text style={styles.totalAmount}>₱{totalFee.toFixed(2)}</Text>
        </View>
      </ScrollView>
      <View style={styles.navbar}>
        <View style={styles.totalPaymentButton}>
          <Text style={styles.totalPaymentLabel}>Total Fee</Text>
          <Text style={styles.totalPaymentAmount}>₱{totalFee.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
        <Text style={styles.proceedButtonText}>Proceed</Text>
      </TouchableOpacity>
      
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  infoContent: {
    fontSize: 16,
    color: '#475569',
    marginTop: 5,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cartImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  cartDetails: {
    flex: 1,
  },
  cartName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
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
    color: '#475569',
    marginTop: 5,
  },
  sectionContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  sectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1, 
  },
  footerValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1, 
    textAlign: 'right', 
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  proceedButton: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#D3D3D3',
    backgroundColor: '#FFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  totalPaymentButton: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 80,
  },
  totalPaymentLabel: {
    fontSize: 14,
    color: '#000',
  },
  totalPaymentAmount: {
    fontSize: 24,
    color: '#05652D',
  },
});

export default RequestConfirmation;