import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Button } from 'react-native-elements';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const MapSelector = ({ onLocationSelect }) => {
  const initialRegionPhilippines = {
    latitude: 14.5995, 
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [initialRegion, setInitialRegion] = useState(initialRegionPhilippines);
  const [locationToConfirm, setLocationToConfirm] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    if (isWithinPhilippines(location.coords)) {
      const currentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setInitialRegion(currentCoords);
      setSelectedLocation(currentCoords);
      setLocationToConfirm(currentCoords);
    } else {
      setInitialRegion(initialRegionPhilippines);
      setSelectedLocation(initialRegionPhilippines);
      setLocationToConfirm(initialRegionPhilippines);
    }
  };

  const isWithinPhilippines = (coords) => {
    const northLat = 21.120611;
    const southLat = 4.227853;
    const westLng = 116.954517;
    const eastLng = 126.604394;
    return (
      coords.latitude <= northLat &&
      coords.latitude >= southLat &&
      coords.longitude >= westLng &&
      coords.longitude <= eastLng
    );
  };

  const handlePress = (event) => {
    const coords = event.nativeEvent.coordinate;
    if (isWithinPhilippines(coords)) {
      setLocationToConfirm(coords);
      setSelectedLocation(coords);
    } else {
      Alert.alert('Location is outside the Philippines');
    }
  };

  const confirmLocation = async () => {
    if (!locationToConfirm) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${locationToConfirm.latitude},${locationToConfirm.longitude}&key=AIzaSyB6ZjHWI8Pvj6VTz5xM2jpcbdSjaQBkujI`
      );

      if (!response.ok) throw new Error('Network response was not ok.');
      const data = await response.json();

      if (data.results.length > 0) {
        const locationName = data.results[0].formatted_address;
        if (onLocationSelect) {
          onLocationSelect(locationName);
        }
      } else {
        if (onLocationSelect) {
          onLocationSelect('Location name not found');
        }
      }
    } catch (error) {
      console.error('Error during reverse geocoding:', error);
      if (onLocationSelect) {
        onLocationSelect('Error retrieving location name');
      }
    }

    setSelectedLocation(null);
    setLocationToConfirm(null);
  };

  const handleLocationSelect = (data, details = null) => {
    if (details) {
      const location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      if (isWithinPhilippines(location)) {
        setSelectedLocation(location);
        setInitialRegion(location);
        onLocationSelect(data.description);
      } else {
        Alert.alert('Selected location is outside the Philippines');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ zIndex: 1, width: '90%', position: 'absolute', top: 0, padding: 10 }}>
        <GooglePlacesAutocomplete
          placeholder="Search your location"
          onPress={handleLocationSelect}
          fetchDetails={true}
          query={{
            key: 'AIzaSyB6ZjHWI8Pvj6VTz5xM2jpcbdSjaQBkujI',
            language: 'en',
          }}
          onFail={(error) => console.error(error)}
          styles={{
            textInputContainer: {
              backgroundColor: 'rgba(0,0,0,0)', 
              borderTopWidth: 0,
              borderBottomWidth:0,
            },
            textInput: {
              marginLeft: 0,
              marginRight: 0,
              height: 38,
              color: '#5d5d5d',
              fontSize: 16
            },
            predefinedPlacesDescription: {
              color: '#1faadb'
            },
          }}
        />
      </View>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handlePress}
      >
        {selectedLocation && (
          <Marker coordinate={selectedLocation} />
        )}
      </MapView>
      {locationToConfirm && (
        <View style={styles.confirmButtonContainer}>
          <Button title="Confirm Marked Location" onPress={confirmLocation} buttonStyle={{ backgroundColor: 'green' }}/>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: Dimensions.get('window').width,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmButtonContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
});

export default MapSelector;
