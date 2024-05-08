import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db } from '../config/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDocs, collection } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Animated } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

const WishDonation = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [matchedDonations, setMatchedDonations] = useState([]);
  const [error, setError] = useState('');
  const [photoChosen, setPhotoChosen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNoMatch, setHasNoMatch] = useState(false);

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
        detectDonationsInImage(imageUri);
        setPhotoChosen(true);
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

  const detectDonationsInImage = async (imageUri) => {
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
  
      const donationsSnapshot = await getDocs(collection(db, 'donation'));
      const matchedDonationsData = [];
  
      donationsSnapshot.forEach((doc) => {
        const donation = doc.data();
        if (detectedLabels.some((label) => donation.itemNames.some(item => item.toLowerCase().includes(label)))) {
          matchedDonationsData.push({
            id: doc.id,
            name: donation.name,
            photo: donation.photo,
            subPhotos: donation.subPhotos,
            itemNames: donation.itemNames,
            category: donation.category,
            purpose: donation.purpose,
            message: donation.message,
            donor_email: donation.donor_email,
            location: donation.location
          });
        }
      });
  
      setMatchedDonations(matchedDonationsData);

      if (matchedDonationsData.length === 0) {
        setHasNoMatch(true);
      } else {
        setHasNoMatch(false); 
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Error detecting donations:', error);
      Alert.alert('Error', 'Failed to detect donations in the image.');
      setError('Failed to detect donations in the image.');
    }
  };

  const renderMatchedDonation = (donation, index) => {
    return (
      <TouchableOpacity key={index} onPress={() => navigation.navigate('DonationDetail', { donation })}>
        <View style={styles.matchedProductCard}>
          {donation.subPhotos.length > 0 ? (
            <Image source={{ uri: donation.subPhotos[0] }} style={styles.matchedImageItem} />
          ) : (
            <Text>No Image Available</Text>
          )}
          <Text style={styles.productName}>{donation.name}</Text>
          <Text style={styles.productCategory}>{donation.category}</Text>
          {/* <Text style={styles.productCategory}>
            Purpose: <Text style={styles.matchedProductInfo}>{donation.purpose}</Text>
          </Text>
          <Text style={styles.productCategory}>
            Message: <Text style={styles.matchedProductInfo}>{donation.message}</Text>
          </Text> */}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Via Image</Text>
        <TouchableOpacity style={styles.searchImageButton} onPress={photoChosen ? handleChoosePhoto : handleChoosePhoto}>
          <Image source={require('../assets/zoom-in.png')} style={styles.searchImageIcon} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.hintText}>Please take or choose a photo that could match a donation.</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={photoChosen ? handleChoosePhoto : handleChoosePhoto}
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
        <View style={styles.matchedImagesContainer}>
          {hasNoMatch ? (
            <Text style={styles.noProductMatchedText}>No Matched Donations</Text>
          ) : (
            matchedDonations.map(renderMatchedDonation)
          )}
        </View>
        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </ScrollView>
      {loading && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="large" color="#05652D" />
          <Text style={styles.loadingText}>Finding matches...</Text>
        </View>
      )}
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
  matchedProductInfo: {
    fontWeight: 'bold',
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
    textAlign: 'center', 
  },
  searchImageButton: {
    marginLeft: 50,
  },
});

export default WishDonation;
