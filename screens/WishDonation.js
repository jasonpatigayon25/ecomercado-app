import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, FlatList, ScrollView  } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db } from '../config/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDocs, collection, getDoc, doc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Animated } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

const WishDonation = ({ navigation, route }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [error, setError] = useState('');
  const [matchedImages, setMatchedImages] = useState([]);
  const [matchedProductsDetails, setMatchedProductsDetails] = useState([]);
  const [photoChosen, setPhotoChosen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donationCategories, setDonationCategories] = useState([]);
  const [hasMatchedDonations, setHasMatchedDonations] = useState(true);

  useEffect(() => {
    if (route.params?.donationId) {
      fetchDonationDetails(route.params.donationId);
    }
  }, [route.params?.donationId]);
  
  const fetchDonationDetails = async (donationId) => {
    try {
      const docRef = doc(db, 'donation', donationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const donationData = docSnap.data();
      } else {
        console.log('No such document!');
      }
    } catch (error) {
      console.error('Error fetching donation details:', error);
    }
  };

  useEffect(() => {
    const fetchDonationCategories = async () => {
      setLoading(true);
      try {
        const categoriesSnapshot = await getDocs(collection(db, 'donationCategories'));
        const categories = [];
        categoriesSnapshot.forEach((doc) => {
          categories.push(doc.data().title); 
        });
        setDonationCategories(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        Alert.alert('Error', 'Failed to fetch donation categories.');
      }
      setLoading(false);
    };
  
    fetchDonationCategories();
  }, []);

  useEffect(() => {
    if (route.params?.shouldOpenConfirmModal) {
      handleChoosePhoto();
    }
  }, [route.params?.shouldOpenConfirmModal]);

  const scaleAnim = new Animated.Value(1);

  const startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startAnimation();
  }, []);  

  const handleChoosePhoto = async () => {
    let options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    };
  
    Alert.alert(
      "Search Via Image",
      "Choose an option",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Take Photo",
          onPress: async () => {
            let result = await ImagePicker.launchCameraAsync(options);
            processImageResult(result);
          }
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync(options);
            processImageResult(result);
          }
        },
      ],
      { cancelable: true }
    );
  };
  
  
  const processImageResult = (result) => {
    if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        saveImageToFolder(imageUri, 'taken_images_donation');
        detectProductsInImage(imageUri);
        setPhotoChosen(true);
    }
};

  const handleChooseAgain = () => {
    setSelectedImage(null);
    setMatchedProducts([]);
    setMatchedImages([]);
    setMatchedProductsDetails([]);
    setError('');
    setPhotoChosen(false);
  
    if (matchedProducts.length > 0) {
      handleChoosePhoto();
    }
  };
  const saveImageToFolder = async (imageUri, folderName) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, `${folderName}/${Date.now()}`);
  
      const response = await fetch(imageUri);
      const blob = await response.blob();
      await uploadBytes(imageRef, blob);
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save the image.');
    }
  };

  const detectProductsInImage = async (imageUri) => {
    try {
      setLoading(true);
      const storage = getStorage();
      const imageRef = ref(storage, 'donations/' + Date.now());
  
      const response = await fetch(imageUri);
      const blob = await response.blob();
      await uploadBytes(imageRef, blob);
  
      const imageUrl = await getDownloadURL(imageRef);
  
      const visionApiEndpoint = 'https://vision.googleapis.com/v1/images:annotate';
      const apiKey = 'AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g';
  
      const requestBody = {
        requests: [
          {
            image: {
              source: {
                imageUri: imageUrl,
              },
            },
            features: [
              {
                type: 'LABEL_DETECTION',
                maxResults: 10,
              },
            ],
          },
        ],
      };
  
      const visionResponse = await axios.post(`${visionApiEndpoint}?key=${apiKey}`, requestBody);
  
      const labels = visionResponse.data.responses[0]?.labelAnnotations || [];
      const detectedLabels = labels.map((label) => label.description.toLowerCase());
  
      const matchedProductsData = [];
      const productsSnapshot = await getDocs(collection(db, 'donation'));
      await Promise.all(
        productsSnapshot.docs.map(async (doc) => {
          const product = doc.data();
          const productCategory = product.category;
  
          if (
            detectedLabels.includes(productCategory.toLowerCase()) ||
            product.subPhotos.some((subPhoto) => detectedLabels.includes(subPhoto.toLowerCase())) ||
            detectedLabels.includes(product.name.toLowerCase()) ||
            product.itemNames.some((itemName) => detectedLabels.includes(itemName.toLowerCase()))
          ) {
            matchedProductsData.push({
              id: doc.id,
              name: product.name,
              itemNames: product.itemNames,
              photo: product.photo,
              category: productCategory,
            });
          }
        })
      );
  
      if (matchedProductsData.length === 0) {
        setMatchedProducts(['No product found']);
        setMatchedImages([]);
        setHasMatchedDonations(false);
      } else {
        const matchedProductNames = matchedProductsData.map((product) => product.name);
        setMatchedProducts(matchedProductNames);
        setMatchedImages(matchedProductsData.map((product) => product.imageUrl));
        setMatchedProductsDetails(matchedProductsData);
      }
  
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Error detecting products:', error);
      Alert.alert('Error', 'Failed to detect products in the image.');
      setError('Failed to detect products in the image.');
    }
  };

  const renderMatchedProduct = (product, index) => {
    if (!product) {
      console.error("Product is undefined");
      return null;
    }
  
    const isEvenIndex = index % 2 === 0;
  
    if (isEvenIndex) {
      const nextProduct = matchedProductsDetails[index + 1];
      return (
        <View key={index} style={styles.matchedProductRow}>
          <TouchableOpacity onPress={() => navigation.navigate('DonationDetail', { product })}>
            <View style={styles.matchedProductCard}>
              {product.photo ? (
                <Image source={{ uri: product.photo }} style={styles.matchedImageItem} />
              ) : (
                <Text>No Image Available</Text>
              )}
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>{product.itemNames.join(' · ')}</Text>
              <Text style={styles.productCategory}>
                <Text style={styles.matchedProductInfo}>{product.category}</Text>
              </Text>
            </View>
          </TouchableOpacity>
          {nextProduct && (
            <TouchableOpacity onPress={() => navigation.navigate('DonationDetail', { donation: nextProduct })}>
              <View style={styles.matchedProductCard}>
                {nextProduct.photo ? (
                  <Image source={{ uri: nextProduct.photo }} style={styles.matchedImageItem} />
                ) : (
                  <Text>No Image Available</Text>
                )}
                <Text style={styles.productName}>{nextProduct.name}</Text>
                <Text style={styles.productPrice}>{nextProduct.itemNames.join(' · ')}</Text>
                <Text style={styles.productCategory}>
                  <Text style={styles.matchedProductInfo}>{nextProduct.category}</Text>
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    } else {
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Via Image</Text>
        <TouchableOpacity style={styles.searchImageButton} onPress={photoChosen ? handleChooseAgain : handleChoosePhoto}>
          <Image source={require('../assets/zoom-in.png')} style={styles.searchImageIcon} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView}>
      <Text style={styles.hintText}>Please take or choose a photo that matches the donation.</Text>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.circleButton}
        onPress={photoChosen ? handleChooseAgain : handleChoosePhoto}
      >
        <Icon name="camera" size={30} color="#FFF" />
        <Text style={styles.circleButtonText}>
          {photoChosen ? 'Choose Again' : 'Choose Photo'}
        </Text>
      </TouchableOpacity>
      </Animated.View>
      
      {selectedImage && (
        <View style={styles.imageContainer}>
          <Text style={styles.matchedImagesSearch}>Searched Image:</Text>
          <Image source={{ uri: selectedImage }} style={styles.image} />
        </View>
      )}
        {loading ? (
        <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color="#05652D" />
            <Text style={styles.loadingText}>Finding matches...</Text>
        </View>
        ) : (
        <View style={styles.matchedImagesContainer}>
        <Text style={styles.matchedImagesText}>Matched Donations:</Text>
        {matchedProductsDetails && matchedProductsDetails.length > 0 ? (
    matchedProductsDetails.map(renderMatchedProduct)
) : (
    <Text style={styles.noProductMatchedText}>No Matched Donations</Text>
)}
        </View>
        )}
        {error !== '' && (
        <Text style={styles.errorText}>{error}</Text>
        )}
      </ScrollView>
      {/* {loading && (
      <View style={styles.loadingIndicator}>
        <ActivityIndicator size="large" color="#05652D" />
        <Text style={styles.loadingText}>Finding matches...</Text>
      </View>
    )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF', 
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    color: '#000', 
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between', 
    marginVertical: 20,
    paddingHorizontal: 10, 
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D3D3D3', 
  },
  matchedImagesContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  matchedImagesSearch: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  matchedImagesText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  matchedImageItem: {
    width: 120,
    height: 120,
    margin: 10,
    borderRadius: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  circleButton: {
    backgroundColor: '#05652D', 
    padding: 20,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 5,
    marginVertical: 20,
  },
  circleButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  hintText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  matchedProductCard: {
    backgroundColor: '#FFF',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchedProductTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333', 
    marginBottom: 5,
  },
  matchedProductText: {
    fontSize: 14,
    color: '#333',
  },
  matchedProductInfo: {
    fontWeight: 'bold',
  },
  searchedProductText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#05652D',
    marginBottom: 6,
  },
  productCategory: {
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
  productPrice: {
    color: '#05652D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  matchedProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchedProductsList: {
  marginTop: 10,
  paddingHorizontal: 20,
},
matchedProductName: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
},
searchImageButton: {
  marginLeft: 50,
},
loadingIndicator: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  justifyContent: 'center',
  alignItems: 'center',
},
loadingText: {
  fontSize: 18,
  fontWeight: 'bold',
  marginTop: 10,
  color: '#05652D',
},
noProductMatchedText: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#666', 
  marginTop: 20,
},
});

export default WishDonation;