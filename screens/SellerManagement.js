import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const SellerManagement = ({ navigation }) => {
    const [isSeller, setIsSeller] = useState(false);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const auth = getAuth();
    const user = auth.currentUser;

    const scaleAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const unsubscribeSellerInfo = onSnapshot(
                query(collection(db, 'registeredSeller'), where('email', '==', user.email)),
                (querySnapshot) => {
                    const sellerData = querySnapshot.docs.map(doc => doc.data())[0];
                    if (sellerData) {
                        setSellerInfo(sellerData);
                        setIsSeller(true);
                    } else {
                        setIsSeller(false);
                    }
                    setIsLoading(false);
                }
            );
            return () => unsubscribeSellerInfo();
        }
    }, [user]);

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

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#05652D" />
            </View>
        );
    }
    
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

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#05652D" />
            </View>
        );
    }

    const SellerInfoView = () => (
        sellerInfo && (
            <View style={styles.sellerInfoContainer}>
                <Text style={styles.sellerName}>{sellerInfo.sellerName}</Text>
                <Text style={styles.fullName}>{sellerInfo.registeredName}</Text>
                <View style={styles.infoRow}>
                    <MaterialIcons name="email" size={20} color="#05652D" />
                    <Text style={styles.subText}>{sellerInfo.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <MaterialIcons name="place" size={20} color="#05652D" />
                    <Text style={styles.miniSubText}>{sellerInfo.sellerAddress}</Text>
                </View>
            </View>
        )
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Seller Management</Text>
            </View>
            <SellerInfoView />
            <ScrollView style={styles.scrollView}>
                {isSeller ? (
                    <View style={styles.transactionsRow}>
                        <OptionItemCube onPress={() => navigation.navigate('ProductPosts')} icon="th-list" label="My Product Posts" />
                        <OptionItemCube onPress={() => navigation.navigate('SellAddProduct')} icon="plus-circle" label="Add Product" />
                        <OptionItemCube onPress={() => navigation.navigate('MyOrders')} icon="shopping-cart" label="My Orders" />
                        <OptionItemCube onPress={() => navigation.navigate('SuspendedProducts')} icon="ban" label="Suspended Products" />
                    </View>
                ) : (
                    <View style={styles.nonSellerView}>
                        <Text style={styles.noteText}>Register as a seller to access these features.</Text>
                        <Animated.View style={[styles.registerButton, { transform: [{ scale }] }]}>
                            <TouchableOpacity onPress={() => navigation.navigate('SellerRegistration')}>
                                <Text style={styles.registerButtonText}>Register as a Seller</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </ScrollView>
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
});

export default SellerManagement;