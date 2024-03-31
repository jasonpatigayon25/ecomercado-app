import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const SellerManagement = ({ navigation }) => {
  const animation = useRef(new Animated.Value(0)).current;

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
  }, [animation]);

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['green', 'yellow']
  });

  const animatedStyle = {
    backgroundColor
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Seller Management</Text>
        <Animated.View style={[styles.addProductButton, animatedStyle]}>
          <TouchableOpacity onPress={() => navigation.navigate('AddProduct')}>
            <Icon name="plus" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.transactionsRow}>
        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('ProductPosts')}>
          <Icon name="th-list" size={24} color="#05652D" style={styles.icon} />
          <Text style={styles.optionLabel}>My Product Posts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('AddProduct')}>
          <Icon name="plus-circle" size={24} color="#05652D" style={styles.icon} />
          <Text style={styles.optionLabel}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionsRow}>
        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('MyOrders')}>
          <Icon name="shopping-cart" size={24} color="#05652D" style={styles.icon} />
          <Text style={styles.optionLabel}>My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionItemCube, styles.halfWidth]} onPress={() => navigation.navigate('SuspendedProducts')}>
          <Icon name="ban" size={24} color="#05652D" style={styles.icon} />
          <Text style={styles.optionLabel}>Suspended Products</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  addProductButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  transactionsRow: {
    flexDirection: 'row',
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
  },
  icon: {
    marginBottom: 5,
  },
  optionLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: '#05652D',
  },
});

export default SellerManagement;
