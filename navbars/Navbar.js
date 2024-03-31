import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const Navbar = ({ navigation, activeRoute }) => {
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [isSeller, setIsSeller] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const auth = getAuth();
    const user = auth.currentUser;

    useEffect(() => {
        if (user) {
            const q = query(collection(db, 'registeredSeller'), where('email', '==', user.email));
            return onSnapshot(q, (querySnapshot) => {
                setIsSeller(!querySnapshot.empty);
            });
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const notificationsRef = collection(db, 'notifications');
            const q = query(notificationsRef, where('email', '==', user.email));
            return onSnapshot(q, (querySnapshot) => {
                const unreadNotifications = querySnapshot.docs.filter(
                    (doc) => !doc.data().isRead
                );
                setUnreadNotificationsCount(unreadNotifications.length);
            });
        }
    }, [user]);

    const handleNavigation = (routeName) => {
      if (routeName === 'Sell' && isSeller === false) {
          setShowModal(true);
          return;
      }
      navigation.navigate(routeName);
  };


    const scaleAnim = useRef(new Animated.Value(1)).current;
    const tiltAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: activeRoute ? 1.2 : 1,
            friction: 3,
            useNativeDriver: true,
        }).start();

        if (activeRoute) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(tiltAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(tiltAnim, {
                        toValue: -1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(tiltAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            tiltAnim.setValue(0);
        }
    }, [activeRoute, scaleAnim, tiltAnim]);

    const renderIcon = (routeName, iconName, IconComponent = Icon) => {
        const isActive = activeRoute === routeName;

        const rotation = tiltAnim.interpolate({
            inputRange: [-1, 1],
            outputRange: ['-20deg', '20deg'], 
        });

        return (
            <TouchableOpacity onPress={() => handleNavigation(routeName)}>
                <View style={styles.navbarIconContainer}>
                    <Animated.View
                        style={[
                            styles.navbarIconBackground,
                            isActive && styles.selectedNavbarIconBackground,
                            { 
                                transform: [
                                    { scale: scaleAnim }, 
                                    { rotate: isActive ? rotation : '0deg' }, 
                                ] 
                            },
                        ]}
                    >
                        <IconComponent
                            name={iconName}
                            size={24}
                            color={isActive ? '#05652D' : '#000'}
                            style={styles.navbarIcon}
                        />
                        {routeName === 'Notification' && unreadNotificationsCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>
                                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                    <Text style={[styles.navbarLabel, { color: isActive ? '#05652D' : '#888' }]}>
                        {routeName}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.navbar}>
            {renderIcon('Home', 'home')}
            {renderIcon('Sell', 'shopping-bag')}
            {renderIcon('Donate', 'hand-heart', Icon2)}
            {renderIcon('Notification', 'bell')}
            {renderIcon('Account', 'user')}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showModal}
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                      <Text style={styles.registerTitle}>Register As A Seller</Text>
                        <Text style={styles.modalText}>You need to register as a seller to add product to sell</Text>
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => {
                                setShowModal(false);
                                navigation.navigate('SellerRegistration');
                            }}
                        >
                            <Text style={styles.registerButtonText}>Register Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: '#D3D3D3',
        backgroundColor: '#FFF',
    },
    navbarIconContainer: {
        alignItems: 'center',
    },
    navbarIconBackground: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    selectedNavbarIconBackground: {
        backgroundColor: '#E3FCE9',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    navbarIcon: {
        marginTop: 5,
    },
    navbarLabel: {
        fontSize: 12,
        marginTop: 5,
    },
    notificationBadge: {
        position: 'absolute',
        right: -3,
        top: -1,
        backgroundColor: 'red',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 14,
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
      margin: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: {
          width: 0,
          height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
  },
  registerTitle: {
    fontSize: 24,
    marginBottom: 15,
    textAlign: "center",
    color: '#05652D',
    fontWeight: 'bold'
},
  modalText: {
      fontSize: 18,
      marginBottom: 15,
      textAlign: "center",
  },
  registerButton: {
      backgroundColor: '#05652D',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 50,
      marginBottom: 10,
  },
  registerButtonText: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
  },
  cancelButtonText: {
      color: '#05652D',
      fontSize: 18,
  },
});

export default Navbar;
