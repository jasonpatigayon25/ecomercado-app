import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';

const screenHeight = Dimensions.get('window').height;

const RequestCheckout = ({ navigation, route }) => {
    const { selectedDonations } = route.params;
    const [totalDonationValue, setTotalDonationValue] = useState(0);
    const [donorAddresses, setDonorAddresses] = useState({});

    useEffect(() => {
        const totalValue = selectedDonations.reduce((sum, donation) => sum + donation.value, 0);
        setTotalDonationValue(totalValue);
    }, [selectedDonations]);

    const getDonorAddresses = async () => {
        const donorsRef = collection(db, 'users');
        const donorDocsSnapshot = await getDocs(donorsRef);
        const addresses = {};
        donorDocsSnapshot.docs.forEach(doc => {
            const donorData = doc.data();
            addresses[donorData.email] = donorData.address;
        });
        setDonorAddresses(addresses);
    };

    useEffect(() => {
        getDonorAddresses();
    }, []);

    const handlePlaceRequest = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const requestsRef = doc(db, 'requests', user.email);

        const requestData = {
            user: user.email,
            donations: selectedDonations.map(donation => ({ id: donation.id, name: donation.name, value: donation.value })),
            totalValue: totalDonationValue
        };

        await updateDoc(requestsRef, requestData)
            .then(() => {
                Alert.alert('Success', 'Your request has been placed.');
                navigation.navigate('DonationList');
            })
            .catch(error => {
                console.error('Error placing request:', error);
                Alert.alert('Error', 'Failed to place the request.');
            });
    };

    const renderDonationItem = ({ item }) => (
        <View style={styles.donationItemContainer}>
            <Image source={{ uri: item.photo }} style={styles.donationImage} />
            <View style={styles.donationDetails}>
                <Text style={styles.donationName}>{item.name}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#05652D" style={styles.backIcon} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request Checkout</Text>
            </View>

            <ScrollView style={styles.content}>
                {selectedDonations.map((donation, index) => (
                    <View key={index}>
                        {renderDonationItem({ item: donation })}
                    </View>
                ))}

                <View style={styles.totalContainer}>
                    <Text style={styles.totalText}>Total Donation Value: ${totalDonationValue.toFixed(2)}</Text>
                </View>

                <TouchableOpacity onPress={handlePlaceRequest} style={styles.placeOrderButton}>
                    <Text style={styles.placeOrderLabel}>Place Request</Text>
                </TouchableOpacity>
            </ScrollView>
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
        justifyContent: 'flex-start',
        paddingHorizontal: 10,
        backgroundColor: '#f7f7f7',
    },
    backIcon: {
        padding: 10,
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#05652D',
    },
    content: {
        padding: 20,
    },
    donationItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderBottomWidth: 1, 
        borderBottomColor: '#ccc', 
        justifyContent: 'space-between',
    },
    donationImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginRight: 10,
    },
    donationDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    donationName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    donationValue: {
        fontSize: 16,
        color: '#666',
    },
    totalContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    totalText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeOrderButton: {
        backgroundColor: '#05652D',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    placeOrderLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    }
});

export default RequestCheckout;
