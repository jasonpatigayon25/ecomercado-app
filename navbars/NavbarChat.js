import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const NavbarChat = ({ navigation, activeRoute }) => {
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

  const renderIcon = (routeName, iconName) => {
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
                  { scale: isActive ? scaleAnim : 1 },
                  { rotate: isActive ? rotation : '0deg' },
                ],
              },
            ]}
          >
            <Icon
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
      {renderIcon('Chatbox', 'comments')}
      {renderIcon('Contacts', 'address-book')}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 80,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderColor: '#D3D3D3',
    backgroundColor: '#FFF',
  },
  navbarIconContainer: {
    alignItems: 'center',
  },
  navbarIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginTop: 10,
  },
  navbarLabel: {
    fontSize: 12,
    marginTop: 5,
  },
});

export default NavbarChat;
