import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, SafeAreaView, Alert, Dimensions,
    SectionList, Modal, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDoc, onSnapshot, updateDoc, getDocs, where, query } from 'firebase/firestore';
import axios from 'axios';

const RequestConfirmation = ({ navigation, route }) => {
  const {
    address,
    donationDetails,
    deliveryFeeSubtotal,
    disposalFeeSubtotal,
    totalFee,
    message,
  } = route.params;

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
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
    </View>
  );

  const renderDonationDetails = () => {
    return donationDetails.map((section, index) => (
      <View key={index} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <FlatList
          data={section.data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
        />
        <View style={styles.sectionFooter}>
          <Text style={styles.footerText}>Total Bundles: {section.itemCount}</Text>
          <Text style={styles.footerText}>Delivery Fee: ₱{section.deliveryFee.toFixed(2)}</Text>
          <Text style={styles.footerText}>
            Disposal Fee ({section.totalWeight.toFixed(1)}kg): ₱{section.disposalFee.toFixed(2)}
          </Text>
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#05652D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Confirmation</Text>
      </View>

      <ScrollView>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Delivery Address:</Text>
          <Text style={styles.infoContent}>{address}</Text>
        </View>

        {renderDonationDetails()}

        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Message for Request:</Text>
          <Text style={styles.infoContent}>{message}</Text>
        </View>

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

      <TouchableOpacity style={styles.proceedButton}>
        <Text style={styles.proceedButtonText}>Proceed</Text>
      </TouchableOpacity>
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
      backgroundColor: '#FFF',
      paddingVertical: 15,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
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
    infoContainer: {
      padding: 15,
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
    },
    infoLabel: {
      fontSize: 16,
      color: '#333',
      marginBottom: 5,
    },
    infoContent: {
      fontSize: 16,
      color: '#666',
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
    sectionContainer: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    sectionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    footerText: {
      fontSize: 14,
      color: '#666',
    },
    totalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
    },
    totalAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#05652D',
    },
    proceedButton: {
      backgroundColor: '#05652D',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 20,
      margin: 20,
      alignSelf: 'center',
    },
    proceedButtonText: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });

export default RequestConfirmation;
