import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const HC31 = ({ visible, onClose }) => {
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
            <Text style={styles.title}>How to Buy</Text>
            <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={28} color="#05652D" style={styles.closeIcon} />
            </TouchableOpacity>
            </View>
            <ScrollView style={styles.listContainer}>
            {[
                "Start on the main screen where you can browse items.",
                "Use the search function or navigate through categories and recommendations to find products.",
                "Select an item to view details, including options to 'Add to Cart' or 'Buy Now'.",
                "If you choose 'Add to Cart', the item will be saved in your cart for later purchase.",
                "Choosing 'Buy Now' will prompt you to review and modify payment methods, quantity, and other details.",
                "After finalizing your selection, proceed to 'Place Order'.",
                "You will receive an order confirmation once the purchase process is complete."
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
  
export default HC31;
  
