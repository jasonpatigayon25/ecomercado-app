import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const HC11 = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>How to create an account</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={28} color="#05652D" style={styles.closeIcon} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.listContainer}>
            {[
              "Go to the Sign Up screen.",
              "Input credentials.",
              "Set up a secure password.",
              "Complete the process and log in."
            ].map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listNumber}>{index + 1}.</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
      flex: 1,
      justifyContent: 'flex-end', 
      backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
      width: '100%',
      height: Dimensions.get('window').height * 0.6,
      backgroundColor: '#E3FCE9',
      borderTopRightRadius: 20, 
      borderTopLeftRadius: 20,
      padding: 25,
      shadowColor: "#000",
      shadowOffset: {
      width: 0,
      height: -2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      },
  closeIcon: {
      marginLeft: 10,
  },
  title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: '#05652D',
      marginHorizontal: 10,
  },
  content: {
      fontSize: 18,
      color: '#05652D',
      lineHeight: 28,
      },
  listContainer: {
      flexDirection: 'column',
  },
  listItem: {
      flexDirection: 'row',
      marginBottom: 10,
      marginHorizontal: 10,
      alignItems: 'center', 
      },
  listNumber: {
      fontSize: 24,
      color: '#05652D',
      width: 30, 
      marginRight: 5,
      },
  listText: {
      fontSize: 18,
      color: '#05652D',
      lineHeight: 28,
      flex: 1,
  },
});

export default HC11;
