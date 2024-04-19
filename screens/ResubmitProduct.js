import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  ScrollView, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, getDocs, collection, where, query, updateDoc, doc } from 'firebase/firestore';
import { productsCollection, db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import axios from 'axios';
import { Dimensions } from 'react-native';
import { registerIndieID, unregisterIndieDevice } from 'native-notify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const screenHeight = Dimensions.get('window').height;

const SuccessModal = ({ productName, isVisible, onCancel, navigateToSell, navigateToProductPosts }) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.centeredView1}>
        <View style={styles.modalView1}>
          <Text style={styles.modalText}>Pending Product</Text>
          <Icon name="check-circle" size={60} color="white" />
          <Text style={styles.pendingText}>{productName} successfully Added! </Text>
          <Text style={styles.subtext}>
            The product is pending for approval.  You can view your pending products in your My Product Posts.
            Pending Product
          </Text>
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonHome]}
              onPress={navigateToSell}
            >
              <Text style={styles.homeButton}>Add Product Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonOrder]}
              onPress={navigateToProductPosts}
            >
              <Text style={styles.homeButton}>My Product Posts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ResubmitProduct = ({ route, navigation }) => {
    
    useEffect(() => {
        if (route.params?.productInfo) {
          const {
            id, photo, subPhotos, name, price, category, location, description, quantity, shipping
          } = route.params.productInfo;
          
          setProductInfo({
            id,
            photo,
            subPhotos,
            name,
            price,
            category,
            location,
            description,
            quantity,
            width: shipping?.width || '',
            height: shipping?.height || '',
            length: shipping?.length || '',
            weight: shipping?.weight || ''
          });
        }
      }, [route.params?.productInfo]);

  const [subPhotos, setSubPhotos] = useState([]);
  const MAX_SUB_PHOTOS = 15;
  const [isSubPhotoPickerModalVisible, setIsSubPhotoPickerModalVisible] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [productName, setProductName] = useState('');

  const [locationSearchModalVisible, setLocationSearchModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);

  const [userEmail, setUserEmail] = useState(null);
  const [productInfo, setProductInfo] = useState({
    photo: null,
    subPhotos: [], 
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

  const handleChooseSubPhoto = () => {
    setIsSubPhotoPickerModalVisible(true);
  };

  const handleChoosePhoto = () => {
    setIsPhotoPickerModalVisible(true);
  };  

  const removeSubPhoto = (indexToRemove) => {
    if (Array.isArray(productInfo.subPhotos)) {
      const updatedSubPhotos = productInfo.subPhotos.filter((_, index) => index !== indexToRemove);
      setProductInfo({ ...productInfo, subPhotos: updatedSubPhotos });
    }
  };

  const handleSubPhotoPickImage = async (type) => {
    let result;
    if (type === 'camera') {
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
  
    if (result && !result.cancelled && result.assets && result.assets.length > 0) {
      const uploadUrl = await uploadImageAsync(result.assets[0].uri);
      if (uploadUrl) {  
        setProductInfo(prevState => ({
          ...prevState,
          subPhotos: [...prevState.subPhotos, uploadUrl]
        }));
      }
    }
  
    setIsSubPhotoPickerModalVisible(false);
  };

  const handleWeightChange = (text) => {
    const newText = text.replace(/[^0-9.]/g, '');
    if (newText === '') {
        setProductInfo({ ...productInfo, weight: '' });
        setMissingFields({ ...missingFields, weightError: false });
    } else if (parseFloat(newText) > 0 && parseFloat(newText) <= 30) {
        setProductInfo({ ...productInfo, weight: newText });
        setMissingFields({ ...missingFields, weightError: false });
    } else {
        setProductInfo({ ...productInfo, weight: '' });
        setMissingFields({ ...missingFields, weightError: true });
        Alert.alert('Invalid Entry', 'Please enter a weight between 1-30 kg.');
    }
};
  
  const incrementWeight = () => {
    let weight = parseFloat(productInfo.weight) || 0;
    if (weight < 30) {
      weight = (weight + 1).toFixed(2);
      setProductInfo({ ...productInfo, weight });
      setMissingFields({ ...missingFields, weightError: false });
    }
  };
  
  const decrementWeight = () => {
    let weight = parseFloat(productInfo.weight) || 0;
    if (weight > 1) {
      weight = (weight - 1).toFixed(2);
      setProductInfo({ ...productInfo, weight });
    } else {
      setMissingFields({ ...missingFields, weightError: true });
    }
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
  
  const SubPhotoPickerModal = ({ isVisible, onCancel }) => (
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
          <Text style={styles.modalHeader}>Select Sub-Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await handleSubPhotoPickImage('library');
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#05652D" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await handleSubPhotoPickImage('camera');
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

const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Please fill all the required fields.");
      return;
    }
  
    if (!productInfo.id) {
      Alert.alert("Error", "No product ID provided.");
      return;
    }
  
    try {
        const createdAt = Timestamp.fromDate(new Date());
        
      const productRef = doc(db, 'products', productInfo.id);
      const updateData = {
        photo: productInfo.photo,
        subPhotos: productInfo.subPhotos,
        name: productInfo.name,
        price: productInfo.price,
        category: productInfo.category,
        description: productInfo.description,
        location: productInfo.location,
        quantity: productInfo.quantity,
        publicationStatus: 'pending',
        createdAt,
        shipping: {
          width: productInfo.width || null, 
          length: productInfo.length || null,
          height: productInfo.height || null,
          weight: productInfo.weight || null,
        }
      };
  
      await updateDoc(productRef, updateData);
      Alert.alert("Success", "Product resubmitted successfully.");
      navigation.navigate('ProductPosts');
    } catch (error) {
      console.error("Error updating product:", error);
      Alert.alert("Error updating product", error.message);
    }
  };

const resetProductInfo = () => {
  setProductInfo(prevState => ({
      photo: null,
      subPhotos: [],
      name: '',
      price: '',
      category: '',
      description: '',
      quantity: 1,
      location: prevState.location, 
  }));
};

  const handleCancel = () => {
    setShowModal(false);
  };

  const handleShippingInfoPress = () => {
    Alert.alert(
      "Note:",
      "Volume and weight also determine the cost of the delivery fee."
    );
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
      width: !productInfo.width,
      length: !productInfo.length,
      height: !productInfo.height,
      weight: !productInfo.weight,
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
                  <View style={styles.subPhotosContainer}>
                    {productInfo.subPhotos?.map((photo, index) => (
                        <Image key={index} source={{ uri: photo }} style={styles.modalSubPhotoImage} />
                    ))}
                  </View>
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
                <Text style={styles.productDetailLabel}>Shipping: </Text>
                {productInfo.width}cm x {productInfo.length}cm x {productInfo.height}cm | {productInfo.weight}kg

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

  const handleDimensionChange = (dimension, value) => {
    let valid = true;
    let maxDimension = (dimension === 'length') ? 90 : 60;
    if (value === '') {
      setProductInfo({ ...productInfo, [dimension]: value });
      setMissingFields(prev => ({ ...prev, [dimension + 'Error']: false }));
    } else if (parseFloat(value) > 0 && parseFloat(value) <= maxDimension) {
      setProductInfo({ ...productInfo, [dimension]: value });
      setMissingFields(prev => ({ ...prev, [dimension + 'Error']: false }));
    } else {
      setProductInfo({ ...productInfo, [dimension]: '' });
      setMissingFields(prev => ({ ...prev, [dimension + 'Error']: true }));
      Alert.alert('Invalid Entry', `Please enter a ${dimension} up to ${maxDimension} cm.`);
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
        <SubPhotoPickerModal
          isVisible={isSubPhotoPickerModalVisible}
          onCancel={() => setIsSubPhotoPickerModalVisible(false)}
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
        <Text style={styles.title}>Resubmit Product</Text>
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
          Additional Photos  
        </Text>
        <View style={styles.subPhotosContainer}>
        {Array.isArray(productInfo.subPhotos) && productInfo.subPhotos.map((photo, index) => (
          <View key={index} style={styles.subPhotoContainer}>
            {photo ? (
              <TouchableOpacity onPress={handleChooseSubPhoto} style={[styles.subPhoto, styles.cameraIconContainer]}>
                <Image source={{ uri: photo }} style={styles.subPhotoImage} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleChooseSubPhoto} style={[styles.subPhoto, styles.cameraIconContainer]}>
                <Icon name="camera" size={24} color="#D3D3D3" />
              </TouchableOpacity>
            )}
            {photo && (
              <TouchableOpacity style={styles.removePhotoIconContainer} onPress={() => removeSubPhoto(index)}>
                <Icon name="times-circle" size={24} color="#FF0000" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        {Array.isArray(productInfo.subPhotos) && productInfo.subPhotos.length < MAX_SUB_PHOTOS && (
          <TouchableOpacity onPress={handleChooseSubPhoto} style={[styles.subPhoto, styles.cameraIconContainer]}>
            <Icon name="camera" size={24} color="#D3D3D3" />
          </TouchableOpacity>
        )}
      </View>
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
          <View style={[styles.input, styles.pickerInput, missingFields.category && styles.missingField]}>
              <Picker
                  selectedValue={productInfo.category}
                  onValueChange={(itemValue, itemIndex) => setProductInfo({ ...productInfo, category: itemValue })}
                  style={{flex: 1}}>
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((category) => (
                      <Picker.Item key={category.id} label={category.title} value={category.title} />
                  ))}
              </Picker>
          </View>
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
          Shipping: 
          {missingFields.photo && <Text style={{ color: 'red' }}> *</Text>} 
          <Icon
            name="info-circle"
            size={20}
            color="#808080"
            onPress={handleShippingInfoPress}
            style={styles.infoIcon}
          />
        </Text>
        <View style={styles.shippingContainer}>
          <Text style={styles.shippingLabel}>Packaging</Text>
          <View style={styles.dimensionsContainer}>
          <TextInput
            style={[styles.dimensionInput, missingFields.widthError && styles.missingField]}
            placeholder="Width (max 60 cm)"
            keyboardType="numeric"
            value={productInfo.width}
            onChangeText={(text) => handleDimensionChange('width', text)}
          />
          <TextInput
            style={[styles.dimensionInput, missingFields.heightError && styles.missingField]}
            placeholder="Height (max 60 cm)"
            keyboardType="numeric"
            value={productInfo.height}
            onChangeText={(text) => handleDimensionChange('height', text)}
          />
          <TextInput
            style={[styles.dimensionInput, missingFields.lengthError && styles.missingField]}
            placeholder="Length (max 90 cm)"
            keyboardType="numeric"
            value={productInfo.length}
            onChangeText={(text) => handleDimensionChange('length', text)}
          />

        </View>
        {missingFields.widthError && (
          <Text style={styles.validationText}>Please enter a width up to 60 cm.</Text>
        )}
        {missingFields.heightError && (
          <Text style={styles.validationText}>Please enter a height up to 60 cm.</Text>
        )}
        {missingFields.lengthError && (
          <Text style={styles.validationText}>Please enter a length up to 90 cm.</Text>
        )}
        </View>

        <View style={styles.shippingContainer}>
          <Text style={styles.shippingLabel}>Weight (kg):</Text>
          <View style={styles.weightControlContainer}>
            <TouchableOpacity style={styles.weightControlButton} onPress={decrementWeight}>
              <Text style={styles.weightControlButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.weightInput, missingFields.weightError && styles.missingField]}
              placeholder="Enter Weight (1-30 kg)"
              keyboardType="numeric"
              value={productInfo.weight}
              onChangeText={handleWeightChange}
              onBlur={() => {
                if (!productInfo.weight) {
                  setProductInfo({ ...productInfo, weight: '1' });
                }
              }}
            />
            <TouchableOpacity style={styles.weightControlButton} onPress={incrementWeight}>
              <Text style={styles.weightControlButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {missingFields.weightError && (
            <Text style={styles.validationText}>Please enter a weight between 1-30 kg.</Text>
          )}
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
          <Text style={styles.addButtonLabel}>Resubmit</Text>
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
      <SuccessModal 
        productName={productName}
        isVisible={successModalVisible}
        onCancel={() => setSuccessModalVisible(false)}
        navigateToSell={() => {
          setSuccessModalVisible(false);
          navigation.navigate('Sell');
        }}
        navigateToProductPosts={() => {
          setSuccessModalVisible(false);
          navigation.navigate('ProductPosts');
        }}
      />
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
    color: '#ccc',
    marginBottom: 5,
    fontSize: 14,
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
  shippingContainer: {
    marginBottom: 10,
  },
  shippingLabel: {
    fontSize: 14,
    paddingLeft: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  dimensionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dimensionInput: {
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  validationText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  weightInput: {
    width: '100%',
  },  
  centeredView1: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    // backgroundColor: 'rgba(0, 0, 0, 0.6)',

  },
  modalView1: {
    margin: 20,
    backgroundColor: '#05652D',

    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.25,
    elevation: 5,
  },   
  modalText: {
    marginBottom: 18,
    textAlign: "center",
    color: "white",
    fontWeight:'bold',
  },
  pendingIcon: {
    textAlign: 'center',
  },
  pendingText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 14,
    marginBottom: 20,
    color: "#ffffff",
    textAlign: 'center',
  }, 
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },  
  modalButtonOrder: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  textButton: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  homeButton: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  textStyle1: {
    color: "#05652D",
    fontWeight: "bold",
    textAlign: "center"
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  }, 
  modalButtonHome: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  modalButton: {
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 10,
    width: '60%',
  },    
  subPhotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  subPhotoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  subPhoto: {
    width: 120,
    height: 120,
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cameraIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoIconContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  subPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },  
  modalSubPhotoImage: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  weightControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weightControlButton: {
    padding: 10,
    backgroundColor: '#D3D3D3',
    borderRadius: 5,
  },
  weightControlButtonText: {
    fontSize: 18,
    color: '#333',
  },
  weightInput: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 5,
  },
  validationText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
    textAlign: 'center',
  },
                                  
});

export default ResubmitProduct;