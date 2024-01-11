import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FlatList } from 'react-native-gesture-handler';
import { ActivityIndicator } from 'react-native'; 

const SERVER_URL = 'http://10.0.2.2:3000';

const Wishlist = ({ navigation }) => {
  const [productName, setProductName] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const uploadImageAsync = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storage = getStorage();
    const storageRef = ref(storage, `wishlist/${Date.now()}`);
    await uploadBytes(storageRef, blob);

    blob.close();

    return await getDownloadURL(storageRef);
  };

  const getMatchesFromServer = async (uploadUrl) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: uploadUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const data = await response.json();
      const matches = await findMatchingProducts(data.labels);
      setMatchedProducts(matches);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", `Failed to analyze image. Please try again. ${error.message}`);
    }
    finally {
      setIsLoading(false);
    }
  };

  const findMatchingProducts = async (labels) => {
    let products = [];
    const productsRef = firestore().collection('products');

    for (const label of labels) {
      const snapshot = await productsRef.where('category', '==', label).get();
      snapshot.forEach(doc => {
        products.push(doc.data());
      });
    }

    return products;
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const uploadUrl = await uploadImageAsync(imageUri);
      setUploadedImage(uploadUrl);
      await getMatchesFromServer(uploadUrl);
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
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Select Photo</Text>
          <Text style={styles.modalSubHeader}>Choose a photo from the gallery or take a new one.</Text>
          <View style={styles.photoOptionsContainer}>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage("library");
                onCancel();
              }}
            >
              <Icon name="photo" size={80} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoOption, styles.separateBorder]}
              onPress={async () => {
                await pickImage("camera");
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

  const handleChoosePhoto = () => {
    setIsPhotoPickerModalVisible(true);
  };


  const handleRemove = (product) => {
    const updatedProducts = matchedProducts.filter((p) => p.id !== product.id);
    setMatchedProducts(updatedProducts);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleProductNameSubmit = () => {
    
    Alert.alert("Search", `Searching for ${productName}...`);
  };

  const renderItem = ({ item }) => (
    <View style={styles.matchedProduct}>
      <Image source={{ uri: item.photo }} style={styles.matchedProductImage} />
      <View style={styles.matchedProductDetails}>
        <Text style={styles.matchedProductName}>{item.name}</Text>
        <Text style={styles.matchedProductCategory}>{item.category}</Text>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <Text style={styles.noMatchText}>No product match on this photo.</Text>
  );

  return (
    <View style={styles.container}>
      <PhotoPickerModal
        isVisible={isPhotoPickerModalVisible}
        onCancel={() => setIsPhotoPickerModalVisible(false)}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#05652D" />
        </TouchableOpacity>
        <Text style={styles.title}>My Wishlist</Text>
      </View>
      <Text style={styles.hintText}>Please search or take/choose photo to match a product.</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.productNameInput}
          placeholder="Type product name..."
          value={productName}
          onChangeText={setProductName}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleProductNameSubmit}>
          <Text style={styles.buttonText}>Search by Name</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={handleChoosePhoto}>
          <Icon name="camera" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Take/Upload Photo</Text>
        </TouchableOpacity>
        {uploadedImage && (
          <View style={styles.uploadedImageContainer}>
            <Image source={{ uri: uploadedImage }} style={styles.uploadedImage} />
          </View>
        )}
      </View>
  
      <FlatList
        data={matchedProducts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyComponent}
        ListHeaderComponent={
          isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#05652D" />
              <Text>Loading...</Text>
            </View>
          )
        }
        style={styles.list}
      />
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
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#05652D',
    marginLeft: 10,
  },
  wishlistContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  uploadImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  matchedProductTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#05652D',
  },
  matchedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchedProductImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },
  matchedProductDetails: {
    flex: 1,
  },
  matchedProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  matchedProductPrice: {
    fontSize: 14,
    color: '#05652D',
    marginBottom: 5,
  },
  wishlistViewDescription: {
    fontSize: 14,
    color: '#05652D',
    textDecorationLine: 'underline',
  },
  noMatchText: {
    fontSize: 16,
    color: '#05652D',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 16,
    color: '#05652D',
    textAlign: 'justify',
    marginHorizontal: 20,
  },
    productNameInput: {
    width: '100%',
    height: 40,
    borderBottomColor: 'gray', 
    borderBottomWidth: 1,
    padding: 10,
    marginBottom: 20,
  },
  uploadButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  uploadButton: {
    width: 160,
    height: 160, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#05652D',
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#05652D',
  },
  uploadButtonText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  searchButton: {
    backgroundColor: '#05652D',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#05652D',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    alignContent: 'center',
  },
  uploadedImage: {
    width: '20%', 
    height: 120, 
    resizeMode: 'contain',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  matchedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchedProductImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },
  matchedProductDetails: {
    flex: 1,
  },
  matchedProductName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchedProductCategory: {
    fontSize: 14,
    color: '#05652D',
  },
  noMatchText: {
    fontSize: 16,
    color: '#05652D',
    textAlign: 'center',
    marginTop: 20,
  },
  inputContainer: {
    padding: 20,
  },
  list: {
    flex: 1,
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
  buttonContainer: {
    alignItems: 'center', 
    marginBottom: 20,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 10, 
  },
  uploadedImageContainer: {
    alignItems: 'center',
    marginTop: 20,     
  },
  uploadedImage: {
    width: 150,         
    height: 150,        
    borderRadius: 20,   
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#05652D',
  },
});

export default Wishlist;