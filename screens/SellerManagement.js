import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const SellerManagement = ({ navigation }) => {
  const animation = useRef(new Animated.Value(0)).current;
  const [isSeller, setIsSeller] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

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
                Animated.timing(animation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(animation, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1]
    });

    const animatedStyle = {
        transform: [{ scale }]
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
                  <Text style={styles.miniSubText}>{sellerInfo.pickupAddress}</Text>
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
                        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('ProductPosts')}>
                            <Icon name="th-list" size={24} color="#05652D" />
                            <Text style={styles.optionLabel}>My Product Posts</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('Sell')}>
                            <Icon name="plus-circle" size={24} color="#05652D" />
                            <Text style={styles.optionLabel}>Add Product</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('MyOrders')}>
                            <Icon name="shopping-cart" size={24} color="#05652D" />
                            <Text style={styles.optionLabel}>My Orders</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('SuspendedProducts')}>
                            <Icon name="ban" size={24} color="#05652D" />
                            <Text style={styles.optionLabel}>Suspended Products</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.nonSellerView}>
                        <Text style={styles.noteText}>
                            Register as a seller to access these features.
                        </Text>
                        <Animated.View style={[styles.registerButton, animatedStyle]}>
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
        backgroundColor: '#E3FCE9',
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
    noteText: {
      fontSize: 18,
      textAlign: 'center',
      paddingVertical: 15,
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
        backgroundColor: '#FFFFFF',
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
        color: '#05652D',
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
        transform: [{ scale: 1 }] 
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    sellerInfoContainer: {
      backgroundColor: '#FFFFFF',
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
      color: '#05652D',
      marginBottom: 4,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },
    subText: {
      fontSize: 16,
      color: '#05652D',
      marginLeft: 8,
    },
    miniSubText: {
      fontSize: 14,
      color: '#05652D',
      marginLeft: 8,
    },
});

export default SellerManagement;
