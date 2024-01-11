import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const AboutUs = ({ navigation }) => {
  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>About Us</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require('../assets/AppLogo.png')} style={styles.logo} />
        <View style={styles.divider} />
        <Text style={styles.paragraph}>
          Welcome to ECOMercado, an eco-friendly e-commerce and donation platform for waste reduction solutions. This platform is designed to facilitate the buying, selling, and donating of various items while promoting sustainability and environmental consciousness.
        </Text>
        <Text style={styles.paragraph}>
          Our mission is to provide a platform that encourages individuals and communities to embrace a sustainable lifestyle and contribute to the reduction of waste. We believe that small actions can create significant impacts, and together, we can make a difference in building a greener future.
        </Text>
        <Text style={styles.paragraph}>
          At ECOMercado, we value the power of collective action and community engagement. By connecting like-minded individuals and organizations, we foster a sense of collaboration and create opportunities for knowledge-sharing and environmental advocacy.
        </Text>
        <Text style={styles.paragraph}>
          Join us on this journey towards a greener and more sustainable future. Together, we can make a positive impact on the environment and inspire others to take action. Thank you for being a part of ECOMercado and contributing to our mission of waste reduction and sustainability.
        </Text>
        <Text style={styles.paragraph}>
          For any inquiries or suggestions, please feel free to contact us. We appreciate your support and feedback as we continue to improve our platform and make a lasting difference in our communities.
        </Text>
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
    paddingTop: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FCE9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  backButtonIcon: {
    marginRight: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#05652D', 
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25,
    marginTop: -20, 
  },
  logo: {
    width: 270,
    height: 60,
    marginBottom: 20,
    alignSelf: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: '#B2DFDB', 
    marginVertical: 20,
  },
  paragraph: {
    fontSize: 16,
    color: '#004D40', // Darker green for better readability
    marginBottom: 15,
    lineHeight: 24, // Increased line height for better readability
  },
});

export default AboutUs;
