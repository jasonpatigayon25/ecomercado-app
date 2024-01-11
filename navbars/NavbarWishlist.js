import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const NavbarChat = ({ navigation }) => {
  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={styles.navbarIconContainer} onPress={() => navigation.navigate('Chatbox')}>
        <Icon name="comments" size={24} color="#05652D" style={styles.navbarIcon} />
        <Text style={styles.navbarLabel}>Go to Chatbox</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navbarIconContainer} onPress={() => navigation.navigate('Cart')}>
        <Icon name="shopping-cart" size={24} color="#05652D" style={styles.navbarIcon} />
        <Text style={styles.navbarLabel}>Go to Cart</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderColor: '#D3D3D3',
    backgroundColor: '#FFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navbarIconContainer: {
    alignItems: 'center',
  },
  navbarIcon: {
    marginTop: 10,
  },
  navbarLabel: {
    color: '#05652D',
    fontSize: 12,
    marginTop: 5,
  },
});

export default NavbarChat;
