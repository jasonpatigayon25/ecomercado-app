import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

const DonorManagement = ({ navigation }) => {

    const [toApproveCount, setToApproveCount] = useState(0);
    const [toShipCount, setToShipCount] = useState(0);
    const [shippedCount, setShippedCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [cancelledCount, setCancelledCount] = useState(0);
    const [approvedPostsCount, setApprovedPostsCount] = useState(0);
    const [pendingPostsCount, setPendingPostsCount] = useState(0);    

    const toApproveIcon = require('../assets/check-mark.png');
    const toShipIcon = require('../assets/order.png');
    const shippedIcon = require('../assets/delivered.png');
    const completedIcon = require('../assets/box.png');
    const cancelledIcon = require('../assets/cancel.png');
    const approvedIcon = require('../assets/validation.png');
    const pendingIcon = require('../assets/preorder.png');

    const [isSeller, setIsSeller] = useState(false);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;

    const scaleAnimation = useRef(new Animated.Value(0)).current;


    const ScrollableItem = ({ imageSource, label, onPress, tabName, count }) => {
        return (
            <TouchableOpacity style={styles.scrollableItem} onPress={() => onPress(tabName)}>
                <Image source={imageSource} style={styles.scrollableItemImage} />
                {count > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{count}</Text>
                    </View>
                )}
                <Text style={styles.scrollableItemText}>{label}</Text>
            </TouchableOpacity>
        );
    };

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnimation, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true
                }),
                Animated.timing(scaleAnimation, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true
                }),
            ])
        ).start();
    }, []);

    const scale = scaleAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1]
    });
    
    const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

    const OptionItemCube = ({ onPress, icon, label }) => {
        const scale = useRef(new Animated.Value(1)).current;

        const handlePressIn = () => {
            Animated.spring(scale, {
                toValue: 1.1,
                friction: 4,
                useNativeDriver: true,
            }).start();
        };

        const handlePressOut = () => {
            Animated.spring(scale, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }).start();
        };

        return (
            <AnimatedTouchable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.optionItemCube,
                    { transform: [{ scale }] },
                ]}
            >
                <Icon name={icon} size={24} color="#FFFFFF" />
                <Text style={styles.optionLabel}>{label}</Text>
            </AnimatedTouchable>
        );
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Donation Management</Text>
            </View>
            <ScrollView style={styles.scrollView}>
                    <View style={styles.transactionsRow}>
                        <OptionItemCube onPress={() => navigation.navigate('DonationPosts')} icon="th-list" label="My Donation Posts" />
                        <OptionItemCube onPress={() => navigation.navigate('DonateAddDonation')} icon="plus-circle" label="Add Donation" />
                        <OptionItemCube onPress={() => navigation.navigate('SellerOrderManagement')} icon="heart" label="Donor Management" />
                        <OptionItemCube onPress={() => navigation.navigate('SuspendedProducts')} icon="ban" label="Suspended Products" />
                    </View>
            </ScrollView>
            <View style={styles.scrollableContainer}>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E3FCE9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#05652D',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        paddingLeft: 20,
    },
    scrollView: {
        flex: 1,
    },
    transactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        padding: 20,
    },
    optionItemCube: {
        backgroundColor: '#05652D',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
        width: '48%',
        marginBottom: 10,
    },
    optionLabel: {
        fontSize: 14,
        textAlign: 'center',
        color: '#FFFFFF',
    },
    nonSellerView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    registerButton: {
        backgroundColor: 'green',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    sellerInfoContainer: {
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderRadius: 10,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
    },
    sellerName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#05652D',
        marginBottom: 4,
    },
    fullName: {
        fontSize: 18,
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    subText: {
        fontSize: 16,
        marginLeft: 8,
    },
    miniSubText: {
        fontSize: 14,
        marginLeft: 8,
    },
    scrollableContainer: {
        paddingVertical: 15,
        paddingHorizontal: 15,
    },
    scrollableItem: {
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
        paddingVertical: 10, 
        width: 100, 
        height: 100, 
        borderRadius: 10,
        backgroundColor: '#E3FCE9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
        marginBottom: 15,
    },
    scrollableItemText: {
        marginTop: 5,
        fontSize: 12,
        color: '#05652D',
        textAlign: 'center',
    },
    countBadge: {
        position: 'absolute',
        right: 10,
        top: 10,
        backgroundColor: '#00FF7F',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        color: '#05652D',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DonorManagement;