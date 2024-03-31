import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const SellerManagement = ({ navigation }) => {
    const animation = useRef(new Animated.Value(0)).current;
    const animation2 = useRef(new Animated.Value(0)).current;
    const [isSeller, setIsSeller] = useState(false); 

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

        setIsSeller(false);
    }, []);

    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1]
    });

    const animatedStyle = {
        transform: [{ scale }]
    };

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation2, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false 
          }),
          Animated.timing(animation2, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false 
          })
        ])
      ).start();
    }, []);
  
    const backgroundColor = animation2.interpolate({
      inputRange: [0, 1],
      outputRange: ['green', 'yellow'] 
    });
  
    const animatedStyle2 = {
      backgroundColor
    };

    return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Seller Management</Text>
            <Animated.View style={[styles.addProductButton, animatedStyle2]}>
            <TouchableOpacity onPress={() => navigation.navigate('Sell')}>
              <Icon name="plus" size={24} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
          </View>
            <ScrollView style={styles.scrollView}>
                {isSeller ? (
                    <View style={styles.transactionsRow}>
                        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('ProductPosts')}>
                            <Icon name="th-list" size={24} color="#05652D" />
                            <Text style={styles.optionLabel}>My Product Posts</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('AddProduct')}>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#05652D',
        paddingVertical: 15,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    transactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
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
    icon: {
        marginBottom: 5,
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
    noteText: {
        fontSize: 18,
        color: '#05652D',
        marginBottom: 20,
        textAlign: 'center',
    },
    registerButton: {
        backgroundColor: 'green',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    addProductButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 25,
    },
});

export default SellerManagement;
