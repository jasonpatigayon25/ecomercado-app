import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const windowWidth = Dimensions.get('window').width;
const tabWidth = windowWidth / 3;

const ProfileTab = ({ selectedTab, setSelectedTab }) => {
    const indicatorAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const tabIndex = ['Products', 'Donations', 'Categories'].indexOf(selectedTab);
      Animated.spring(indicatorAnim, {
        toValue: tabIndex * tabWidth, 
        useNativeDriver: true, 
      }).start();
    }, [selectedTab, indicatorAnim]);

    const renderTab = (tabName) => {
      const isActive = selectedTab === tabName;
      return (
        <TouchableOpacity 
          onPress={() => setSelectedTab(tabName)} 
          style={styles.tab} 
          key={tabName}
        >
          <Text style={[styles.tabText, isActive && styles.activeTabText]}>
            {tabName}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.tabBar}>
        {['Products', 'Donations', 'Categories'].map(tabName => renderTab(tabName))}
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
    },
    tabText: {
      fontSize: 16,
      color: '#888',
      fontWeight: '600',
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
  
export default ProfileTab;
