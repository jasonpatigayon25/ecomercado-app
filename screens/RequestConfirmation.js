import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { collection, addDoc, doc, updateDoc, getDoc, runTransaction, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';

const RequestConfirmation = ({ navigation, route }) => {
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [requestPlaced, setRequestPlaced] = useState(false);
  const { address, donationDetails, deliveryFeeSubtotal, disposalFeeSubtotal, totalFee, message, paymentMethod } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handleProceed = async () => {
    setConfirmModalVisible(false); 
    try {
      const { sections, address, message } = route.params;
      const batch = writeBatch(db);
  
      sections.forEach((section) => {
        const requestDoc = {
          donorDetails: section.data.map((donation) => ({
            donorEmail: section.donorEmail,
            donationId: donation.id,
          })),
          requesterEmail: currentUser?.email,
          address,
          message,
          deliveryFee: section.deliveryFee,
          disposalFee: section.disposalFee,
          status: 'Pending',
          dateRequested: serverTimestamp(),
          paymentMethod,
        };
        const requestDocRef = doc(collection(db, "requests"));
        batch.set(requestDocRef, requestDoc);
  
        // Notification for the requester
        const requesterNotificationData = {
          email: currentUser?.email,
          text: "Your request has been submitted successfully.",
          timestamp: serverTimestamp(),
          type: 'request_submitted',
          requestId: requestDocRef.id
        };
        const requesterNotificationRef = doc(collection(db, "notifications"));
        batch.set(requesterNotificationRef, requesterNotificationData);
  
        // Notification for each donor
        section.data.forEach((donation) => {
          const donorNotificationMessage = `Your donation is requested by ${currentUser?.email}.`;
          const donorNotificationData = {
            email: donation.donorEmail,
            text: donorNotificationMessage,
            timestamp: serverTimestamp(),
            type: 'donation_requested',
            requestId: requestDocRef.id,
            donationId: donation.id
          };
          const donorNotificationRef = doc(collection(db, "notifications"));
          batch.set(donorNotificationRef, donorNotificationData);
        });
      });

      await batch.commit();
      setSuccessModalVisible(true);
      setRequestPlaced(true);
    } catch (error) {
      console.error("Error processing the request:", error);
      Alert.alert("Error", "An error occurred while processing your request. Please try again.");
      setConfirmModalVisible(true); 
    }
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
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Payment Method:</Text>
          <Text style={styles.infoPayment}>{paymentMethod}</Text>
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
        <TouchableOpacity style={[styles.proceedButton, requestPlaced ? styles.disabledButton : {}]} 
        onPress={() => setConfirmModalVisible(true)} disabled={requestPlaced}>
          <Text style={styles.proceedButtonText}>{requestPlaced ? 'Pending' : 'Proceed'}</Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Confirm your request?</Text>
            <TouchableOpacity
              style={{ ...styles.openButton2, backgroundColor: "#fff" }}
              onPress={() => {
                setConfirmModalVisible(!confirmModalVisible);
                handleProceed();
              }}
            >
              <Text style={styles.textStyle1}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.openButton2, backgroundColor: "#05652D", borderWidth: 1,borderColor: "white" }}
              onPress={() => setConfirmModalVisible(!confirmModalVisible)}
            >
              <Text style={styles.textStyle}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Request Has Been Placed!</Text>
            <Icon name="check-circle" size={60} color="white" />
            <Text style={styles.pendingText}>Pending for Donor Approval</Text>
            <Text style={styles.subtext}>Go to Request Transaction for more info.</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonHome]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.homeButton}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOrder]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('RequestApproval');
                }}
              >
                <Text style={styles.textButton}>My Request Transactions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  infoPayment: {
    fontSize: 16,
    color: '#475569',
    marginTop: 5,
    textAlign: 'right',
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
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    // backgroundColor: 'rgba(0, 0, 0, 0.6)',

  },
  modalView: {
    margin: 20,
    backgroundColor: '#05652D',

    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.25,
    elevation: 5,
  },
  modalText: {
    marginBottom: 18,
    textAlign: "center",
    color: "white",
    fontWeight:'bold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  openButton2: {
    backgroundColor: "#F194FF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20, 
    elevation: 2,
    marginTop: 15,
    minWidth: 100, 
    justifyContent: 'center' 
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  textStyle1: {
    color: "#05652D",
    fontWeight: "bold",
    textAlign: "center"
  },
  scrollContainer: {
    marginBottom: 70,
  },
  pendingText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 14,
    marginBottom: 20,
    color: "#ffffff",
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 10,
    width: '50%',
  },
  modalButtonHome: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  modalButtonOrder: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  textButton: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  homeButton: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RequestConfirmation;