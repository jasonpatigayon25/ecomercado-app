import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';

const Navbar = ({ navigation, activeRoute }) => {
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
      <TouchableOpacity onPress={() => navigation.navigate(routeName)}>
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
});

export default Navbar;
