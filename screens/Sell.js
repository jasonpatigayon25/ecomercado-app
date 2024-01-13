import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, getDocs, collection, where, query } from 'firebase/firestore';
import { productsCollection, db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import axios from 'axios';
import { Dimensions } from 'react-native';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenHeight = Dimensions.get('window').height;

const Sell = ({ navigation }) => {

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  const [userEmail, setUserEmail] = useState(null);
  const [productInfo, setProductInfo] = useState({
    photo: null,
    name: '',
    price: '',
    category: '',
    location: '',
    description: '',
    quantity: 1,
  });
  const [showModal, setShowModal] = useState(false);
  const [missingFields, setMissingFields] = useState({
    photo: false,
    name: false,
    price: false,
    category: false,
    description: false,
    quantity: false,
  });

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      registerIndieID(user.email, 17255, 'bWgMDIdkXldaUhQrV5Z0Zh')
        .then(() => console.log("Device registered for notifications"))
        .catch(err => console.error("Error registering device:", err));

      return () => {
        unregisterIndieDevice(user.email, 17255, 'bWgMDIdkXldaUhQrV5Z0Zh')
          .then(() => console.log("Device unregistered for notifications"))
          .catch(err => console.error("Error unregistering device:", err));
      };
    }
  }, []);

  const shouldSendNotification = async (email) => {
    try {
      const sellingNotifications = await AsyncStorage.getItem(`${email}_sellingNotifications`);
      return sellingNotifications === null || JSON.parse(sellingNotifications);
    } catch (error) {
      console.error('Error reading notification settings:', error);
      return true;
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", user.email));
  
      const fetchUserProfile = async () => {
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();

            setUserEmail(userData.email);

            setProductInfo(prevState => ({
              ...prevState,
              location: userData.address || '',
            }));
          } else {
            console.log('No user profile found.');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
  
      fetchUserProfile();
    }
  }, []);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const uploadImageAsync = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
  
      const storage = getStorage();
      const storageRef = ref(storage, 'images/' + Date.now());
      await uploadBytes(storageRef, blob);
  
      blob.close();
  
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Detailed error: ", error.message);
      throw error;
    }
  };  

  const handleChoosePhoto = () => {
    setIsPhotoPickerModalVisible(true);
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
            <Icon name="times" size={24} color="#05652D" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Select Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage('library');
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#05652D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage('camera');
                onCancel();
              }}
            >
              <Icon name="camera" size={80} color="#05652D" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );  
  
  const pickImage = async (type) => {
    let result;
    if (type === "camera") {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    }
  
    if (!result.canceled && result.assets) {
      const uploadUrl = await uploadImageAsync(result.assets[0].uri);
      setProductInfo({ ...productInfo, photo: uploadUrl });
    }
};

const sendPushNotification = async (subID, title, message) => {
  if (!(await shouldSendNotification(subID))) {
    console.log('Notifications are muted for:', subID);
    return;
  }

  const notificationData = {
    subID: subID,
    appId: 17255,
    appToken: 'bWgMDIdkXldaUhQrV5Z0Zh',
    title: 'ECOMercado',
    message: message
  };

  try {
    await axios.post('https://app.nativenotify.com/api/indie/notification', notificationData);
    console.log('Push notification sent to:', subID);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

const notifySubscribers = async (sellerEmail, updatedProductInfo) => {
  const title = 'New Product Added';
  const message = `Check out the new product "${updatedProductInfo.name}" added by ${sellerEmail}`;

  const subscribersQuery = query(collection(db, 'subscriptions'), where('subscribedTo_email', '==', sellerEmail));
  const subscribersSnapshot = await getDocs(subscribersQuery);

  subscribersSnapshot.forEach(async (doc) => {
    const subscriberEmail = doc.data().subscriber_email;

    if (await shouldSendNotification(subscriberEmail)) {
      const notificationDoc = {
        email: subscriberEmail,
        title: title,
        type: 'subscribed_sell',
        text: message,
        timestamp: new Date(),
        productInfo: {
          id: updatedProductInfo.id,
          name: updatedProductInfo.name,
          photo: updatedProductInfo.photo,
          price: updatedProductInfo.price,
          sellerEmail: sellerEmail
        }
      };

      await addDoc(collection(db, 'notifications'), notificationDoc);
      sendPushNotification(subscriberEmail, title, message);
    }
  });
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    const createdAt = Timestamp.fromDate(new Date());

    const productDocRef = await addDoc(productsCollection, {
      photo: productInfo.photo,
      name: productInfo.name,
      price: productInfo.price,
      category: productInfo.category,
      description: productInfo.description,
      location: productInfo.location,
      seller_email: userEmail,
      quantity: productInfo.quantity,
      createdAt,
    });

    const updatedProductInfo = {
      ...productInfo,
      id: productDocRef.id
    };

    await notifySubscribers(userEmail, updatedProductInfo);

    Alert.alert(`${productInfo.name} successfully Added!`);
    resetProductInfo();
    setShowModal(false);
  } catch (error) {
    console.error("Error adding document: ", error);
  }
};

  const resetProductInfo = () => {
    setProductInfo({
      photo: null,
      name: '',
      price: '',
      category: '',
      description: '',
      quantity: 1,
      location: '',
    });
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const validateForm = () => {
    const missing = {
      photo: !productInfo.photo,
      name: !productInfo.name,
      price: !productInfo.price,
      category: productInfo.category === '',
      description: !productInfo.description,
      location: !productInfo.location,
      quantity: quantity < 1,
    };

    setMissingFields(missing);
    
    let valid = true;
    Object.values(missing).forEach((value) => {
      if (value) valid = false;
    });

    if (!valid) {
      Alert.alert(
        'Missing Information',
        'Please make sure all fields are filled correctly.',
        [{ text: 'OK' }]
      );
    }

    return valid;
  };

  const handlePriceChange = (text) => {
    const newText = text.replace(/[^0-9.]/g, '');
    setProductInfo({ ...productInfo, price: newText });
  };
  
  const handlePriceBlur = () => {
    let price = parseFloat(productInfo.price);
    if (!isNaN(price)) {
      setProductInfo({ ...productInfo, price: price.toFixed(2) });
    }
  };

  const handleAddProductToSell = () => {
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "categories"));
      const fetchedCategories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(fetchedCategories);
    };

    fetchCategories();
  }, []);

  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

const handleCategorySelect = (category) => {
  setProductInfo({ ...productInfo, category: category.title });
  setIsCategoryModalVisible(false);
};

const CategoryPickerModal = ({ isVisible, categories, onCategorySelect, onCancel }) => (
  <Modal
    visible={isVisible}
    onRequestClose={onCancel}
    animationType="slide"
    transparent={true}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <ScrollView>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryOption}
              onPress={() => onCategorySelect(category)}
            >
              <Image
                source={{ uri: category.image }}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <Text style={styles.categoryOptionText}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.cancelButtonCategories} onPress={onCancel}>
          <Text style={styles.cancelTextCategories}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const ProductModal = ({ productInfo, isVisible, onCancel, onSubmit }) => {
  return (
    <Modal
      visible={isVisible}
      onRequestClose={onCancel}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Product Confirmation</Text>
            {productInfo.photo && (
              <Image source={{ uri: productInfo.photo }} style={styles.productImage} />
            )}
            <View style={styles.productDetails}>
              <Text style={styles.productDetailText}>
                <Text style={styles.productDetailLabel}>Name: </Text>
                {productInfo.name}
              </Text>

              <Text style={styles.productDetailText}>
                <Text style={styles.productDetailLabel}>Price: </Text>
                {productInfo.price}
              </Text>

              <Text style={styles.productDetailText}>
                <Text style={styles.productDetailLabel}>Category: </Text>
                {productInfo.category}
              </Text>

              <Text style={styles.productDetailText}>
                <Text style={styles.productDetailLabel}>Location: </Text>
                {productInfo.location}
              </Text>

              <Text style={styles.productDetailText}>
                <Text style={styles.productDetailLabel}>Quantity: </Text>
                {productInfo.quantity}
              </Text>

              <Text style={styles.productDetailText}>
                <Text style={styles.productDetailLabel}>Description: </Text>
                {productInfo.description}
              </Text>
            </View>
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

  const [quantity, setQuantity] = useState(1);

  const incrementQuantity = () => {
    setProductInfo(prevProductInfo => ({
      ...prevProductInfo,
      quantity: Number(prevProductInfo.quantity) + 1,
    }));
  };
  
  const decrementQuantity = () => {
    setProductInfo(prevProductInfo => ({
      ...prevProductInfo,
      quantity: prevProductInfo.quantity > 1 ? Number(prevProductInfo.quantity) - 1 : 1,
    }));
  };

  const handleQuantityChange = (text) => {
    const newText = text.replace(/[^0-9]/g, ''); 
    if (newText !== '') {
      setProductInfo({ ...productInfo, quantity: parseInt(newText, 10) });
    } else {
      setProductInfo({ ...productInfo, quantity: '' });
    }
  };

  const handleLocationSearch = async (query) => {
    setLocationSearchQuery(query);
  
    if (query.length > 0) {
      try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
          params: {
            input: query,
            key: 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g', 
            components: 'country:PH' 
          }
        });
  
        if (response.data && response.data.predictions) {
          const locations = response.data.predictions.map(prediction => ({
            name: prediction.description,
            placeId: prediction.place_id 
          }));
          setLocationSearchResults(locations);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
      }
    } else {
      setLocationSearchResults([]);
    }
  };

  const handleLocationSelect = (locationName) => {
    setProductInfo({ ...productInfo, location: locationName });
    setLocationSearchModalVisible(false); 
  };
  
  const openLocationSearchModal = () => {
    setLocationSearchModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <PhotoPickerModal
        isVisible={isPhotoPickerModalVisible}
        onCancel={() => setIsPhotoPickerModalVisible(false)}
      />
      <ProductModal 
        productInfo={productInfo}
        isVisible={showModal}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Sell Eco-Friendly Product</Text>
      </View>
      <ScrollView style={styles.content}>
      <Text style={styles.label}>
        Product Photo:
        {missingFields.photo && <Text style={{ color: 'red' }}> *</Text>}
      </Text>
        <TouchableOpacity style={styles.addPhotoContainer} onPress={handleChoosePhoto}>
          {productInfo.photo ? (
            <Image source={{ uri: productInfo.photo }} style={styles.productImage} />
          ) : (
            <Icon name="camera" size={24} color="#D3D3D3" style={styles.addPhotoIcon} />
          )}
        </TouchableOpacity>
        <Text style={styles.label}>
          Product Name:
          {missingFields.photo && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
        <TextInput
          style={[styles.input, missingFields.name && styles.missingField]}
          placeholder="Enter Product Name"
          value={productInfo.name}
          onChangeText={(text) => setProductInfo({ ...productInfo, name: text })}
        />
        <Text style={styles.label}>
          Price (PHP):
            {missingFields.price && <Text style={{ color: 'red' }}> *</Text>}
          </Text>
          <TextInput
              style={[styles.input, missingFields.price && styles.missingField]}
              placeholder="Enter Price"
              keyboardType="numeric"
              value={productInfo.price}
              onChangeText={handlePriceChange}
              onBlur={handlePriceBlur}
          />

            <Text style={styles.label}>
                Category:
                {missingFields.category && <Text style={{ color: 'red' }}> *</Text>}
              </Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerInput, missingFields.category && styles.missingField]}
                onPress={() => setIsCategoryModalVisible(true)}
              >
                <Text style={styles.inputText}>
                  {productInfo.category || "Select Category"}
                </Text>
              </TouchableOpacity>

          <CategoryPickerModal
            isVisible={isCategoryModalVisible}
            categories={categories}
            onCategorySelect={handleCategorySelect}
            onCancel={() => setIsCategoryModalVisible(false)}
          />
        <Text style={styles.label}>
            Location
            {missingFields.location && <Text style={{ color: 'red' }}> *</Text>}
          </Text>
          <TouchableOpacity style={styles.input}  onPress={() => setLocationSearchModalVisible(true)}>
            <Text>{productInfo.location || 'Enter Location'}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>
          Quantity:
          {missingFields.photo && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={decrementQuantity} style={styles.quantityButton}>
            <Icon name="minus" size={16} color="#05652D" />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.quantityInput, missingFields.quantity && styles.missingField]}
            keyboardType="numeric"
            value={String(productInfo.quantity)}
            onChangeText={handleQuantityChange}
          />
          <TouchableOpacity onPress={incrementQuantity} style={styles.quantityButton}>
            <Icon name="plus" size={16} color="#05652D" />
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>
          Product Description:
          {missingFields.photo && <Text style={{ color: 'red' }}> *</Text>}
        </Text>
        <TextInput
          style={[styles.input, styles.descriptionInput, missingFields.description && styles.missingField]}
          placeholder="Enter Product Description"
          value={productInfo.description}
          onChangeText={(text) => setProductInfo({ ...productInfo, description: text })}
          multiline={true}
          numberOfLines={3}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddProductToSell}>
          <Text style={styles.addButtonLabel}>Add Product to Sell</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationSearchModalVisible}
        onRequestClose={() => setLocationSearchModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Search for a location"
              value={locationSearchQuery}
              onChangeText={handleLocationSearch}
              autoFocus={true}
            />
            <ScrollView style={styles.searchResultsContainer}>
              {locationSearchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchResultItem}
                  onPress={() => handleLocationSelect(result.name)}
                >
                  <Text style={styles.searchResultText}>{result.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButtonIcon: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 20,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  addPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  addPhotoIcon: {
    color: '#B0B0B0',
  },
  addPhotoText: {
    color: '#808080',
    marginTop: 10,
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
  missingField: {
    borderColor: 'red',
  },
  addButton: {
    backgroundColor: '#05652D',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    marginTop: 10,
  },
  addButtonLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    textAlign: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  productDetails: {
    padding: 10,
  },
  productDetailText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  productDetailLabel: {
    fontWeight: 'bold',
    color: '#05652D',
  },
  productDetailValue: {
    color: '#666',
    marginBottom: 5,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E3E3',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#05652D',
    padding: 10,
    borderRadius: 5,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerInput: {
    justifyContent: 'center',
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    marginHorizontal: 10,
    fontSize: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  modalOverlayPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainerPhoto: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelButtonTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalSubHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  photoOption: {
    alignItems: 'center',
    padding: 10,
  },
  separateBorder: {
    borderWidth: 1,
    borderColor: '#05652D',
    borderRadius: 10,
    padding: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    height: screenHeight / 2, 
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTextInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  searchResultsContainer: {
    maxHeight: screenHeight / 2 - 80,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  }, 
  categoryOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  }, 
  categoryOptionText: {
    fontSize: 18,
    color: '#05652D',
  },
  cancelButtonCategories: {
    marginTop: 20,
    backgroundColor: '#E3E3E3',
    padding: 10,
    borderRadius: 5,
  },
  cancelTextCategories: {
    fontSize: 16,
    color: '#333',
  }, 
  categoryImage: {
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    marginBottom: 10, 
  },                                                             
});

export default Sell;