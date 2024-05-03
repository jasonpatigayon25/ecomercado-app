import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';


const MapLocationSelector = () => {
    const navigation = useNavigation();
    const webViewRef = useRef(null);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style type="text/css">
          #map {
            height: 100%;
          }
          #searchInput {
            position: absolute;
            top: 20px;
            left: 10px; 
            right: 10px; 
            height: 120px; 
            padding: 0 15px; 
            font-size: 32px; 
            z-index: 1000; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.5); 
            border-radius: 8px; 
            background-color: white;
            outline: none; 
          }
          #confirmButton {
            position: fixed;
            left: 50%;
            bottom: 20px;
            transform: translateX(-50%);
            padding: 10px 20px;
            font-size: 20px;
            color: white;
            background-color: #4CAF50; 
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
        </style>
        <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g&libraries=places"></script>
        <script>
        function initMap() {
            var cebu = {lat: 10.3157, lng: 123.8854};
            var map = new google.maps.Map(document.getElementById('map'), {
                zoom: 15,
                center: cebu,
                mapTypeControl: false,
                draggable: true,
                title: 'Cebu City'
            });
        
            var marker = new google.maps.Marker({
                position: cebu,
                map: map,
                draggable: true,
            });
        
            var geocoder = new google.maps.Geocoder();
            var searchBox = new google.maps.places.SearchBox(document.getElementById('searchInput'));
            map.controls[google.maps.ControlPosition.TOP_LEFT].push(document.getElementById('searchInput'));
        
            map.addListener('bounds_changed', function() {
                searchBox.setBounds(map.getBounds());
            });
        
            searchBox.addListener('places_changed', function() {
                var places = searchBox.getPlaces();
                if (places.length === 0) {
                    return;
                }
                var bounds = new google.maps.LatLngBounds();
                places.forEach(function(place) {
                    if (!place.geometry) {
                        console.log("Returned place contains no geometry");
                        return;
                    }
                    if (place.geometry.viewport) {
                        bounds.union(place.geometry.viewport);
                    } else {
                        bounds.extend(place.geometry.location);
                    }
                    marker.setPosition(place.geometry.location);
                    updateLocationInput(place.geometry.location);
                });
                map.fitBounds(bounds);
            });
        
            // When the user clicks on the map, set the marker to the new location
            map.addListener('click', function(e) {
                marker.setPosition(e.latLng);
                updateLocationInput(e.latLng);
            });
        
            // Update the location in the input field
            function updateLocationInput(latlng) {
                geocoder.geocode({ 'location': latlng }, function(results, status) {
                    if (status === 'OK') {
                        if (results[0]) {
                            document.getElementById('searchInput').value = results[0].formatted_address;
                        } else {
                            document.getElementById('searchInput').value = 'No results found';
                        }
                    } else {
                        document.getElementById('searchInput').value = 'Geocoder failed due to: ' + status;
                    }
                });
            }
        
            google.maps.event.addListener(marker, 'position_changed', function() {
                updateLocationInput(marker.getPosition());
            });
        }
        </script>
      </head>
      <body onload="initMap()">
        <input id="searchInput" type="text" placeholder="Enter a location">
        <div id="map"></div>
      </body>
      </html>
    `;
  
    const confirmLocation = () => {
        webViewRef.current.postMessage("getLocation");
    };

    const onMessage = (event) => {
        const location = event.nativeEvent.data;
        navigation.navigate('Signup', { location });
    };

    return (
        <View style={{ flex: 1 }}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={onMessage}
            />
             <View style={styles.buttonContainer}>
                <Button title="Confirm Location" onPress={confirmLocation} color="#4CAF50" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        marginHorizontal: 20,  
        marginTop: 20,       
        height: 50,      
        justifyContent: 'center'
    }
});

  export default MapLocationSelector;