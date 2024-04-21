import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions, ScrollView } from 'react-native';
import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const windowWidth = Dimensions.get('window').width;
const visibleTabCount = 5; 
const tabWidth = windowWidth / visibleTabCount * 1.2;

const RequesterTab = ({ selectedTab, setSelectedTab }) => {
    const [orderCounts, setOrderCounts] = useState({ Pending: 0, Approved: 0, Receiving: 0, Completed: 0, Declined: 0 });
    const indicatorAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const tabNames = ['To Approve', 'To Deliver', 'To Receive', 'Acquired', 'Taken/Declined'];
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const statusMap = {
        'To Approve': 'Pending',
        'To Deliver': 'Approved',
        'To Acquired': 'Receiving',
        'Acquired': 'Completed',
        'Taken/Declined': 'Declined'
    };

    useEffect(() => {
        const unsubscribe = Object.entries(statusMap).map(([tabName, status]) => {
            const q = query(collection(db, "requests"), where("requesterEmail", "==", currentUser.email), where("status", "==", status));

            return onSnapshot(q, (snapshot) => {
                setOrderCounts(prevCounts => ({ ...prevCounts, [status]: snapshot.size }));
            });
        });

        return () => unsubscribe.forEach(unsub => unsub());
    }, [currentUser.email]);

    useEffect(() => {
        const tabIndex = tabNames.indexOf(selectedTab);
        Animated.spring(indicatorAnim, {
            toValue: tabIndex * tabWidth,
            useNativeDriver: true,
        }).start();

        if (scrollViewRef.current) {
            const scrollPosition = tabIndex * tabWidth;
            scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
        }
    }, [selectedTab, indicatorAnim]);

    const renderTab = (tabName) => {
        const isActive = selectedTab === tabName;
        const status = statusMap[tabName];
        const count = orderCounts[status];
    
        return (
            <TouchableOpacity 
                onPress={() => setSelectedTab(tabName)} 
                style={styles.tab} 
                key={tabName}
            >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {tabName}
                </Text>
                {count > 0 && ( 
                    <View style={styles.counterContainer}>
                        <Text style={styles.countText}>
                            {count}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                ref={scrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBar}
            >
                {tabNames.map(tabName => renderTab(tabName))}
                <Animated.View
                    style={[
                        styles.indicator,
                        {
                            width: tabWidth,
                            transform: [{ translateX: indicatorAnim }],
                        },
                    ]}
                />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF',
        borderBottomWidth: 2,
        borderColor: '#D3D3D3',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#FFF',
        borderBottomWidth: 2,
        borderColor: '#D3D3D3',
    },
    tab: {
        width: tabWidth,
        alignItems: 'center',
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'relative',
    },
    activeTab: {
        backgroundColor: '#f0f0f0', 
    },
    tabText: {
        fontSize: 14,
        color: '#888',
        fontWeight: '600',
    },
    counterContainer: {
        backgroundColor: '#E3FCE9', 
        borderRadius: 10,
        width: 20,
        height: 20,
        position: 'absolute',
        top: 5, 
        right: 5,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#05652D', 
    },
    countText: {
        fontSize: 12,
        color: '#05652D',
        fontWeight: 'bold',
    },
    activeTabText: {
        color: '#05652D',
        fontWeight: 'bold',
    },
    indicator: {
        position: 'absolute',
        bottom: -2,
        height: 2,
        backgroundColor: '#05652D',
    },
});

export default RequesterTab;