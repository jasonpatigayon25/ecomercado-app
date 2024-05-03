  import React from 'react';
  import { View, Modal, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

  const TermsModal = ({ isVisible, onClose }) => {
    const handleAcceptAll = () => {
      onClose(true);
    };

    return (
      <Modal visible={isVisible} animationType="slide" transparent={true}>
        <View style={styles.container}>
          <ScrollView>
            <Text style={styles.header}>EcoMercado Terms and Conditions</Text>
            <Text style={styles.paragraph}>Welcome to EcoMercado! By utilizing our services, you agree to the following terms and conditions. Please read them carefully.</Text>

            <Text style={styles.subheader}>Condition of Donated Items:</Text>
            <Text style={styles.paragraph}>●	Donated items must be in a condition that is usable.</Text>
            <Text style={styles.paragraph}>●	Items that are damaged, broken, or deemed as junk will not be accepted.</Text>
            <Text style={styles.paragraph}>●	EcoMercado reserves the right to refuse items that do not meet our quality standards.</Text>

            <Text style={styles.subheader}>Weight Limitations:</Text>
            <Text style={styles.paragraph}>●	The maximum weight for a single transaction of general items is capped at 50 kilos.</Text>
            <Text style={styles.paragraph}>●	Users are advised to communicate with EcoMercado's support team if they are unsure about the weight of their items before scheduling a pickup.</Text>

            <Text style={styles.subheader}>Heavy Items and Furniture:</Text>
            <Text style={styles.paragraph}>●	For heavy items, especially furniture, the maximum acceptable weight is 50 kilos.</Text>
            <Text style={styles.paragraph}>●	It is the user’s responsibility to inform EcoMercado in advance about any items that might exceed this weight limit.</Text>

            {/* <Text style={styles.header}>Donation Weight-Based Fee:</Text>
            <Text style={styles.paragraph}>● 2-5 kg: 20 pesos</Text>
            <Text style={styles.paragraph}>● 5-10 kg: 100 pesos</Text>
            <Text style={styles.paragraph}>● 10-15 kg: 150 pesos</Text>
            <Text style={styles.paragraph}>● 10-20 kg: 250 pesos</Text>
            <Text style={styles.paragraph}>● 20-30 kg: 350 pesos</Text>
            <Text style={styles.paragraph}>● 30-40 kg: 450 pesos</Text>
            <Text style={styles.paragraph}>● 40-60: 500 pesos</Text> */}

            <Text style={styles.note}>Note: EcoMercado reserves the right to modify these terms and conditions at any time without prior notice. It is the responsibility of the user to stay updated with any changes.</Text>
            <Text style={styles.paragraph}>By proceeding with your transaction, you hereby acknowledge and accept the terms and conditions set forth above.</Text>

            <Text style={styles.subheader}>EcoMercado Selling Terms and Conditions</Text>
            <Text style={styles.paragraph}>Thank you for choosing EcoMercado as your platform to sell items. Before proceeding with listing or selling your items on EcoMercado, please review the following terms and conditions carefully.</Text>

            <Text style={styles.subheader}>Item Condition:</Text>
            <Text style={styles.paragraph}>●	All items listed for sale on EcoMercado must be in good condition, slightly used, or as good as new.</Text>
            <Text style={styles.paragraph}>●	Items should be free from major defects and should still be usable.</Text>
            <Text style={styles.paragraph}>●	Sellers are required to provide accurate descriptions and photographs of the item. Any discrepancy between the listed item and its actual condition can result in the removal of the listing and potential action against the seller's account.</Text>
            <Text style={styles.paragraph}>●	EcoMercado reserves the right to review and verify the condition of items before they are listed for sale.</Text>

            <Text style={styles.subheader}>Listing and Pricing:</Text>
            <Text style={styles.paragraph}>●	Sellers are responsible for setting the price of their items.</Text>
            <Text style={styles.paragraph}>●	All prices should be fair and reasonable. Price gouging or misleading pricing practices will result in the removal of the listing and potential action against the seller's account.</Text>
            <Text style={styles.paragraph}>●	Listings should not contain any false information or misrepresented details.</Text>

            <Text style={styles.subheader}>Returns and Disputes:</Text>
            <Text style={styles.paragraph}>●	Sellers must clearly state their return policy in the listing. If no return policy is stated, it will be assumed that the item is non-returnable.</Text>
            <Text style={styles.paragraph}>●	In case of disputes, both sellers and buyers are encouraged to communicate and resolve the issue amicably. If necessary, EcoMercado can mediate, but the platform is not liable for any disputes or issues between buyers and sellers.</Text>

            <Text style={styles.note}>Note: EcoMercado reserves the right to modify these terms and conditions at any time without prior notice. Sellers are encouraged to review these terms periodically.</Text>
            <Text style={styles.paragraph}>By listing your item for sale on EcoMercado, you hereby acknowledge and accept the terms and conditions set forth above.</Text>

          </ScrollView>

          <TouchableOpacity onPress={handleAcceptAll} style={styles.acceptButton}>
            <Text style={styles.acceptButtonText}>Accept All</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      margin: 10,
      marginTop: 60,
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 20,
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#05620d'
    },
    subheader: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    paragraph: {
      fontSize: 14,
      marginVertical: 5,
      textAlign: 'justify',
    },
    note: {
      fontSize: 14,
      fontStyle: 'italic',
      marginVertical: 5,
      textAlign: 'justify',
    },
    acceptButton: {
      backgroundColor: '#05652D',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    acceptButtonText: {
      color: 'white',
      fontSize: 16,
    },
  });

  export default TermsModal;
