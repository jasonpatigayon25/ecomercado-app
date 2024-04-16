import React, { useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Dimensions,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { FlatList } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SellerTab from '../navbars/SellerTab';
import { useRoute } from '@react-navigation/native';
import DonationTab from '../navbars/DonationTab';

const window = Dimensions.get("window");

const DonationPosts = ({ navigation }) => {

  const animation = useRef(new Animated.Value(0)).current;
  const [userEmail, setUserEmail] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [donations, setDonations] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState({
    photo: '',
    subPhoto: [], 
    name: '',
    price: '',
    category: '',
    quantity: '',
    location: '',
    weight: '', 
    purpose: '',
    message: '', 
});
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user !== null) {
      setUserEmail(user.email);
      fetchDonationItems(user.email);
    }
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false 
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false 
        })
      ])
    ).start();
  }, []);

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['green', 'yellow'] 
  });

  const animatedStyle = {
    backgroundColor
  };

  const route = useRoute(); 
  const tabs = ['Approved Posts', 'Pending For Approval'];
  const initialTab = route.params?.selectedTab || 'Approved Posts';
  const [selectedTab, setSelectedTab] = useState(initialTab);

  useEffect(() => {
      if (route.params?.selectedTab) {
          setSelectedTab(route.params.selectedTab);
      }
  }, [route.params?.selectedTab]);

  const scrollRef = useRef();
  const windowWidth = Dimensions.get('window').width;

  useEffect(() => {
    const tabIndex = tabs.indexOf(selectedTab);
    scrollRef.current?.scrollTo({ x: tabIndex * windowWidth, animated: true });
  }, [selectedTab, windowWidth]);

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const tabIndex = Math.floor(scrollX / windowWidth);
    setSelectedTab(tabs[tabIndex]);
  };

  const fetchDonationItems = async (email) => {
    const donationItems = [];
    const q = query(collection(db, "donation"), where("donor_email", "==", email), orderBy("createdAt", "desc"));
  
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        donationItems.push({ id: doc.id, ...doc.data() });
      });
      setDonations(donationItems);
    } catch (error) {
      console.error("Error fetching products: ", error);
      Alert.alert('Error', 'Unable to fetch products.');
    }
  };
  

  const handleDelete = async (donationItem) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to permanently delete this product?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Delete Permanently",
          onPress: async () => {
            try {
              const donationRef = doc(db, 'donation', donationItem.id);
              await deleteDoc(donationRef);
              Alert.alert('Success', 'Donation deleted successfully.');
    
              setDonations(donations.filter(item => item.id !== donationItem.id));
              setIsModalVisible(false); 
            } catch (error) {
              console.error("Error deleting Donation: ", error);
              Alert.alert('Error', 'Unable to delete Donation.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const showOptions = (item, event) => {
    const { pageX, pageY } = event.nativeEvent;
    const dropdownY = pageY > window.height / 2 ? pageY - 150 : pageY;
    setDropdownPosition({ x: pageX, y: dropdownY });
    setSelectedProduct(item);
    setIsModalVisible(true);
  };

  const renderEmptyProducts = () => (
    <View style={styles.emptyProductsContainer}>
      <Icon name="shopping-bag" size={50} color="#ccc" />
      <Text style={styles.emptyProductsText}>No Donation Items Added Yet</Text>
    </View>
  );

  const DonationItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => {
        setSelectedProduct(item);
        setViewModalVisible(true);
      }}
      onLongPress={(event) => showOptions(item, event)}
    >
      <View style={styles.productItemContainer}>
        <Image source={{ uri: item.photo }} style={styles.productItemImage} />
        <View style={styles.productItemDetails}>
          <Text style={styles.productItemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.productItemPrice} numberOfLines={1} ellipsizeMode="tail">
            {item.itemNames?.join(' · ')}
          </Text>
          <Text style={styles.productItemCategory} numberOfLines={1} ellipsizeMode="tail">
            {item.category}
          </Text>
          <Text style={styles.productItemPrice} numberOfLines={1} ellipsizeMode="tail">{item.weight} kg</Text>
          <Text style={styles.productItemDescription} numberOfLines={1} ellipsizeMode="tail">{item.purpose}</Text>
        </View>
        {item.publicationStatus === 'approved' && (
          <View style={styles.statusIconContainer}>
            <Icon name="check" size={14} color="green" />
            <Text style={styles.statusText}>Approved</Text>
          </View>
        )}
        {item.publicationStatus === 'pending' && (
          <View style={styles.statusIconContainer}>
            <Icon name="clock-o" size={14} color="orange" />
            <Text style={styles.statusText}>Pending</Text>
          </View>
        )}
        <TouchableOpacity style={styles.productItemOptionsButton} onPress={(event) => showOptions(item, event)}>
          <Icon name="ellipsis-v" size={20} color="#05652D" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const [isViewDonationItemModalVisible, setIsViewDonationItemModalVisible] = useState(true);

  const ViewDonationItemModal = ({ isVisible, item, onClose }) => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.editModalContainer}>
            <Image source={{ uri: item?.photo }} style={{ width: 100, height: 100, marginBottom: 20, borderRadius: 15 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item?.subPhotos?.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={{ width: 60, height: 60, marginRight: 10, borderRadius: 15 }} />
              ))}
            </ScrollView>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.readOnlyInput}>{item?.name}</Text>
            <Text style={styles.label}>Items</Text>
            <Text style={styles.readOnlyInput}>{item?.itemNames?.join(', ')}</Text>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.readOnlyInput}>{item?.category}</Text>
            <Text style={styles.label}>Weight</Text>
            <Text style={styles.readOnlyInput}>{item?.weight}</Text>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.readOnlyInput}>{item?.location}</Text>
            <Text style={styles.label}>Purpose</Text>
            <Text style={styles.readOnlyInput}>{item?.purpose}</Text>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.readOnlyInput}>{item?.message}</Text>
            <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                    navigation.navigate('EditDonation', { donationInfo: item });
                    onClose();  // This will close the modal when the edit button is clicked
                }}
                >
                <Icon name="edit" size={24} color="#05652D" />
                </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };


  const getFilteredProducts = (tab) => {
    switch (tab) {
      case 'Approved Posts':
        return donations.filter(donations => donations.publicationStatus === 'approved');
      case 'Pending For Approval':
        return donations.filter(donations => donations.publicationStatus === 'pending');
      default:
        return donations; 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>My Donation Posts</Text>
        <Animated.View style={[styles.addProductButton, animatedStyle]}>
        <TouchableOpacity onPress={() => navigation.navigate('DonationAddDonation')}>
          <Icon name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
      </View>
      <DonationTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      ref={scrollRef}
    >
      {tabs.map((tab, index) => (
        <View key={index} style={{ width: windowWidth }}>
          <FlatList
            data={getFilteredProducts(tab)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <DonationItem item={item} />}
            ListEmptyComponent={renderEmptyProducts}
          />
        </View>
      ))}
    </ScrollView>
        <Modal
          animationType="none" 
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            onPress={() => setIsModalVisible(false)}
            activeOpacity={1}
          >
            <View 
              style={[
                styles.modalView, 
                { 
                  position: 'absolute',
                  left: dropdownPosition.x - 100, 
                  top: dropdownPosition.y
                }
              ]}
            >
            <TouchableOpacity style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleDelete(selectedProduct)}>
              <Text style={styles.modalButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
     
      <ViewDonationItemModal
        isVisible={viewModalVisible}
        item={selectedProduct}
        onClose={() => setViewModalVisible(false)}
  />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    backgroundColor: '#05652D',
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
  title: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  productContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    alignItems: 'center',
  },
  productQuantity: {
    fontSize: 14,
    color: 'gray',
    position: 'absolute',
    top: 10,
    right: 10,

  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 15,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 5,
  },
  productDescription: {
    fontStyle: 'italic',
    fontSize: 14,
    color: '#333',
    overflow: 'hidden', 
  },
  optionsButton: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: 150,
  },
  modalButton: {
    paddingVertical: 8,
    alignItems: 'flex-start', 
    width: '100%',
  },
  modalButtonText: {
    color: "#05652D",
    fontSize: 14, 
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalEditView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    color: '#333',
    marginBottom: 20,
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    color: '#333',
    marginBottom: 20,
  },
  savebutton: {
    backgroundColor: '#05652D',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  savebuttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelbutton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  cancelbuttonText: {
    color: '#05652D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editModalContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    width: '100%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyProductsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyProductsText: {
    fontSize: 18,
    color: '#ccc',
    marginTop: 10,
  },
  categoryItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    width: '100%',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlayPhoto: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainerPhoto: {
    width: '100%',
    backgroundColor: '#05652D',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalSubHeader: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  cancelButtonPhoto: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 5,
  },
  cancelTextPhoto: {
    color: '#fff',
    fontSize: 18,
  },   
  photoOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 10,
    marginTop: 20,
  },
  photoOption: {
    alignItems: 'center',
    padding: 10,
  },
  separateBorder: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
  },  
  productItemContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFF0',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    marginVertical: 8,
    padding: 10,
    position: 'relative', 
    alignItems: 'center',
  },
  
  productItemImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  
  productItemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  
  productItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  
  productItemPrice: {
    fontSize: 14,
    color: '#05652D',
    marginTop: 4,
  },
  
  productItemMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  
  productItemCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#ECECEC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start', 
    overflow: 'hidden', 
    marginVertical: 4, 
    marginHorizontal: 2, 
    textAlign: 'center',
  },
  
  productItemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  
  productItemLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  
  productItemLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  
  productItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  approvedIconContainer: {
  position: 'absolute',
  top: 10, 
  right: 10, 
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 5, 
  padding: 2, 
},

approvedText: {
  fontSize: 12,
  marginLeft: 4,
  color: 'green',
},
  
  productItemOptionsButton: {
    padding: 8,
    marginLeft: 10,
  },
  statusIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 5,
    padding: 2,
  },
  
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#808080',
  },
  label: {
    fontSize: 14,
    color: '#05652D', 
    marginBottom: 5, 
    fontWeight: 'bold', 
  },

  addProductButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    color: '#333',
    marginBottom: 20,
    backgroundColor: '#f7f7f7',
  },
});

export default DonationPosts;