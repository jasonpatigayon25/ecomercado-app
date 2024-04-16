import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const windowWidth = Dimensions.get('window').width;
const tabWidth = windowWidth / 5;

const DonorTab = ({ selectedTab, setSelectedTab }) => {
    const [requestCounts, setRequestCounts] = useState({ 'To Approve': 0, 'To Deliver': 0, 'Receiving': 0, 'Completed': 0, 'Taken/Declined': 0 });
    const indicatorAnim = useRef(new Animated.Value(0)).current;
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const tabNames = ['To Approve', 'To Deliver', 'Receiving', 'Completed', 'Taken/Declined'];

    const statusMap = {
        'To Approve': 'Pending',
        'To Deliver': 'Approved',
        'Receiving': 'Receiving',
        'Completed': 'Completed',
        'Taken/Declined': 'Declined',
    };

    useEffect(() => {
      const unsubscribe = Object.entries(statusMap).map(([tabName, status]) => {
          const q = query(collection(db, "requests"), where("status", "==", status));
          return onSnapshot(q, (snapshot) => {
              const uniqueDonorEmails = new Set();
              snapshot.forEach((doc) => {
                  const donorDetails = doc.data().donorDetails || {};
                  Object.values(donorDetails).forEach(donor => uniqueDonorEmails.add(donor.email)); 
              });
              setRequestCounts(prevCounts => ({ ...prevCounts, [tabName]: uniqueDonorEmails.size }));
          });
      });

      return () => unsubscribe.forEach(unsub => unsub());
  }, []);

    useEffect(() => {
        const tabIndex = tabNames.indexOf(selectedTab);
        Animated.spring(indicatorAnim, {
            toValue: tabIndex * tabWidth,
            useNativeDriver: true,
        }).start();
    }, [selectedTab, indicatorAnim]);

    const renderTab = (tabName) => {
        const isActive = selectedTab === tabName;
        const count = requestCounts[tabName];

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
        <View style={styles.tabBar}>
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
        </View>
    );
};

const styles = StyleSheet.create({
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
        position: 'relative',
    },
    tabText: {
        fontSize: 12,
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

export default DonorTab;
