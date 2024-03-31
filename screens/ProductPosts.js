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

const window = Dimensions.get("window");

const ProductPosts = ({ navigation }) => {

  const animation = useRef(new Animated.Value(0)).current;
  const [userEmail, setUserEmail] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState({
    photo: '',
    name: '',
    price: '',
    category: '',
    description: '',
    quantity: '',
    location: ''
  });
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editableProduct, setEditableProduct] = useState({
    id: null,
    photo: '',
    name: '',
    price: '',
    category: '',
    description: '',
    quantity: '',
  });

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user !== null) {
      setUserEmail(user.email);
      fetchUserProducts(user.email);
      fetchCategories();
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

  const tabs = ['Approved Posts', 'Pending For Approval'];

  const [selectedTab, setSelectedTab] = useState('Approved Posts');
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

  const fetchUserProducts = async (email) => {
    const userProducts = [];
    const q = query(collection(db, "products"), where("seller_email", "==", email), orderBy("createdAt", "desc"));
  
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        userProducts.push({ id: doc.id, ...doc.data() });
      });
      setProducts(userProducts);
    } catch (error) {
      console.error("Error fetching products: ", error);
      Alert.alert('Error', 'Unable to fetch products.');
    }
  };

  const fetchCategories = async () => {
    const categoryList = [];
    const q = query(collection(db, "categories"));

    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        categoryList.push({ label: doc.data().title, value: doc.data().title });
      });
      setCategories(categoryList);
    } catch (error) {
      console.error("Error fetching categories: ", error);
      Alert.alert('Error', 'Unable to fetch categories.');
    }
  };

  const handleEdit = (product) => {
    setEditableProduct(product);
    setEditModalVisible(true);
    setIsModalVisible(false);
  };
  
  const CategorySelectionModal = ({ isVisible, categories, onSelect, onCancel }) => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onCancel}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalEditView}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={styles.categoryItem}
                onPress={() => onSelect(category.value)}
              >
                <Text style={styles.categoryItemText}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    );
  }; 

  const uploadImageAsync = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
  
    const storage = getStorage();
    const storageRef = ref(storage, `images/${Date.now()}`);
    await uploadBytes(storageRef, blob);
  
    blob.close();
  
    return await getDownloadURL(storageRef);
  };
  
  const takePhoto = async () => {
    let cameraPermissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermissionResult.granted === false) {
      alert("Permission to access the camera is required!");
      return;
    }
  
    let cameraResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!cameraResult.canceled && cameraResult.assets) {
      const selectedImage = cameraResult.assets[0];
      if (selectedImage.uri) {
        const uploadUrl = await uploadImageAsync(selectedImage.uri);
        setEditableProduct({ ...editableProduct, photo: uploadUrl });
      }
    }
  };
  
  const chooseFromGallery = async () => {
    let galleryPermissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (galleryPermissionResult.granted === false) {
      alert("Permission to access the gallery is required!");
      return;
    }
  
    let galleryResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!galleryResult.canceled && galleryResult.assets) {
      const selectedImage = galleryResult.assets[0];
      if (selectedImage.uri) {
        const uploadUrl = await uploadImageAsync(selectedImage.uri);
        setEditableProduct({ ...editableProduct, photo: uploadUrl });
      }
    }
  };

  const handleSaveEdit = async (updatedProduct) => {
    if (updatedProduct && updatedProduct.id) {
      try {
        const productRef = doc(db, 'products', updatedProduct.id);
        await updateDoc(productRef, {
          name: updatedProduct.name,
          price: updatedProduct.price,
          category: updatedProduct.category,
          description: updatedProduct.description,
          photo: updatedProduct.photo,
          location: updatedProduct.location,
          quantity: parseInt(updatedProduct.quantity, 10) || 0,
        });
  
        Alert.alert('Success', 'Product updated successfully.');
        setEditModalVisible(false);
        fetchUserProducts(userEmail); 
      } catch (error) {
        console.error("Error updating product: ", error);
        Alert.alert('Error', 'Unable to update product.');
      }
    }
  };
  

  const handleDelete = async (product) => {
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
              const productRef = doc(db, 'products', product.id);
              await deleteDoc(productRef);
              Alert.alert('Success', 'Product deleted successfully.');
    
              setProducts(products.filter(p => p.id !== product.id));
              setIsModalVisible(false); 
            } catch (error) {
              console.error("Error deleting product: ", error);
              Alert.alert('Error', 'Unable to delete product.');
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
      <Text style={styles.emptyProductsText}>No Product Added Yet</Text>
    </View>
  );

  const ProductItem = ({ item }) => (
    <TouchableOpacity 
    onPress={() => {
      setSelectedProduct(item);
      if (item) {
        setViewModalVisible(true);
      }
    }}
    onLongPress={(event) => showOptions(item, event)}
  >
    <View style={styles.productItemContainer}>
      <Image source={{ uri: item.photo }} style={styles.productItemImage} />
      <View style={styles.productItemDetails}>
        <Text style={styles.productItemName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        <Text style={styles.productItemPrice} numberOfLines={1} ellipsizeMode="tail">₱{item.price}</Text>
        <View style={styles.productItemMetaContainer}>
          <Text style={styles.productItemCategory} numberOfLines={1} ellipsizeMode="tail">{item.category}</Text>
          <Text style={styles.productItemQuantity} numberOfLines={1} ellipsizeMode="tail">Qty: {item.quantity}</Text>
        </View>
        <View style={styles.productItemLocationContainer}>
          <Icon name="map-marker" size={14} color="#666" />
          <Text style={styles.productItemLocation} numberOfLines={1} ellipsizeMode="tail">{item.location}</Text>
        </View>
        <Text style={styles.productItemDescription} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>
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

  const ViewProductModal = ({ isVisible, product, onClose }) => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.editModalContainer}>
             <Text style={styles.editModalTitle}></Text>
            <Image source={{ uri: product?.photo }} style={{ width: 100, height: 100, marginBottom: 20, borderRadius: 15 }} />
            <Text style={styles.label}>Product Name</Text>
            <Text style={styles.readOnlyInput}>{product?.name}</Text>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.readOnlyInput}>₱{product?.price}</Text>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.readOnlyInput}>{product?.category}</Text>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.readOnlyInput}>{product?.quantity}</Text>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.readOnlyInput}>{product?.location}</Text>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.readOnlyInput}>{product?.description}</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                setEditableProduct(product);
                setViewModalVisible(false);
                setEditModalVisible(true);
              }}
            >
              <Icon name="edit" size={30} color="#05652D" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const EditProductModal = ({ isVisible, product, onSave, onCancel }) => {
    const [tempProduct, setTempProduct] = useState(product);
  
    useEffect(() => {
      setTempProduct(product);
    }, [product]);
  
    const handleSave = () => {
      onSave(tempProduct);
    };
  
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onCancel}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>Edit Product</Text>
            <TouchableOpacity onPress={pickImage}>
              {tempProduct?.photo ? (
                <Image source={{ uri: tempProduct.photo }} style={{ width: 100, height: 100, marginBottom: 20, borderRadius: 15 }} />
              ) : (
                <Icon name="camera" size={24} color="#05652D" />
              )}
            </TouchableOpacity>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name"
              value={tempProduct.name}
              onChangeText={(text) => setTempProduct({ ...tempProduct, name: text })}
            />
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price"
              value={tempProduct.price}
              onChangeText={(text) => setTempProduct({ ...tempProduct, price: text })}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={styles.categorySelectorText}>
                {tempProduct.category || 'Select a Category'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              value={tempProduct.quantity.toString()}
              onChangeText={(text) => setTempProduct({ ...tempProduct, quantity: parseInt(text, 10) || 0 })}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Address:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location"
              value={tempProduct.location}
              onChangeText={(text) => setTempProduct({ ...tempProduct, description: text })}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter description"
              value={tempProduct.description}
              onChangeText={(text) => setTempProduct({ ...tempProduct, description: text })}
            />
            <TouchableOpacity style={styles.savebutton} onPress={handleSave}>
              <Text style={styles.savebuttonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelbutton} onPress={onCancel}>
              <Text style={styles.cancelbuttonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };
  
  const [isPhotoPickerModalVisible, setIsPhotoPickerModalVisible] = useState(false);

  const PhotoPickerModal = ({ isVisible, onCancel }) => (
    <Modal
      visible={isVisible}
      onRequestClose={onCancel}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlayPhoto}>
        <View style={styles.modalContainerPhoto}>
          <TouchableOpacity style={styles.cancelButtonTopRight} onPress={onCancel}>
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Select Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await chooseFromGallery();
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await takePhoto();
                onCancel();
              }}
            >
              <Icon name="camera" size={80} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const pickImage = () => {
    setIsPhotoPickerModalVisible(true);
  };

  const getFilteredProducts = (tab) => {
    switch (tab) {
      case 'Approved Posts':
        return products.filter(product => product.publicationStatus === 'approved');
      case 'Pending For Approval':
        return products.filter(product => product.publicationStatus === 'pending');
      default:
        return products; 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>My Product Posts</Text>
        <Animated.View style={[styles.addProductButton, animatedStyle]}>
        <TouchableOpacity onPress={() => navigation.navigate('Sell')}>
          <Icon name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>
      </View>
      <SellerTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
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
            renderItem={({ item }) => <ProductItem item={item} />}
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
            <TouchableOpacity style={styles.modalButton} onPress={() => handleEdit(selectedProduct)}>
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
      <EditProductModal
        isVisible={editModalVisible}
        product={editableProduct}
        onSave={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
      />
      <CategorySelectionModal
        isVisible={categoryModalVisible}
        categories={categories}
        onSelect={(value) => {
          setEditableProduct({ ...editableProduct, category: value });
          setCategoryModalVisible(false);
        }}
        onCancel={() => setCategoryModalVisible(false)}
      />
      <PhotoPickerModal
        isVisible={isPhotoPickerModalVisible}
        onCancel={() => setIsPhotoPickerModalVisible(false)}
      />
      <ViewProductModal
    isVisible={viewModalVisible}
    product={selectedProduct}
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
    backgroundColor: '#FFFFFF',
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

export default ProductPosts;