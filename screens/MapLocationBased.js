import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, Button, StyleSheet, Text } from 'react-native';
import { Menu, Provider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const MapLocationBased = () => {
  const [location, setLocation] = useState({ lat: 10.3157, lng: 123.8854 });
  const [city, setCity] = useState('Cebu');
  const [menuVisible, setMenuVisible] = useState(false);
  const navigation = useNavigation();

  const confirmSelection = () => {
    navigation.navigate('SearchProducts', { selectedCity: city });
  };

  const cities = [
    { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
    { name: 'Mandaue', lat: 10.3236, lng: 123.9223 },
    { name: 'Lapu-Lapu', lat: 10.3119, lng: 123.9494 },
    { name: 'Talisay', lat: 10.2447, lng: 123.8494 },
    { name: 'Toledo', lat: 10.3769, lng: 123.6381 },
    { name: 'Alcantara', lat: 10.4000, lng: 123.6500 },
    { name: 'Alcoy', lat: 9.7619, lng: 123.5758 },
    { name: 'Alegria', lat: 9.7692, lng: 123.4147 },
    { name: 'Aloguinsan', lat: 10.2219, lng: 123.5547 },
    { name: 'Argao', lat: 9.8822, lng: 123.6089 },
    { name: 'Asturias', lat: 10.6078, lng: 123.7264 },
    { name: 'Badian', lat: 9.8703, lng: 123.3937 },
    { name: 'Balamban', lat: 10.4709, lng: 123.7190 },
    { name: 'Bantayan', lat: 11.1692, lng: 123.7178 },
    { name: 'Barili', lat: 10.1124, lng: 123.5192 },
    { name: 'Boljoon', lat: 9.6239, lng: 123.5147 },
    { name: 'Borbon', lat: 10.8280, lng: 124.0251 },
    { name: 'Carmen', lat: 10.5772, lng: 124.0209 },
    { name: 'Catmon', lat: 10.7202, lng: 124.0132 },
    { name: 'Compostela', lat: 10.4540, lng: 124.0013 },
    { name: 'Consolacion', lat: 10.3733, lng: 123.9621 },
    { name: 'Cordova', lat: 10.2533, lng: 123.9496 },
    { name: 'Daanbantayan', lat: 11.2518, lng: 124.0069 },
    { name: 'Dalaguete', lat: 9.7631, lng: 123.5350 },
    { name: 'Dumanjug', lat: 10.0535, lng: 123.4567 },
    { name: 'Ginatilan', lat: 9.5992, lng: 123.3345 },
    { name: 'Liloan', lat: 10.4008, lng: 123.9999 },
    { name: 'Madridejos', lat: 11.2958, lng: 123.7285 },
    { name: 'Malabuyoc', lat: 9.6425, lng: 123.4045 },
    { name: 'Medellin', lat: 11.1286, lng: 123.9601 },
    { name: 'Minglanilla', lat: 10.2440, lng: 123.7862 },
    { name: 'Moalboal', lat: 9.9551, lng: 123.3982 },
    { name: 'Oslob', lat: 9.5200, lng: 123.4383 },
    { name: 'Pilar', lat: 10.6615, lng: 124.3460 },
    { name: 'Pinamungajan', lat: 10.2692, lng: 123.5831 },
    { name: 'Poro', lat: 10.6236, lng: 124.0362 },
    { name: 'Ronda', lat: 10.0018, lng: 123.4137 },
    { name: 'Samboan', lat: 9.5301, lng: 123.3213 },
    { name: 'San Fernando', lat: 10.1596, lng: 123.7088 },
    { name: 'San Francisco', lat: 10.6500, lng: 124.4000 },
    { name: 'San Remigio', lat: 11.0714, lng: 123.9399 },
    { name: 'Santa Fe', lat: 11.1575, lng: 123.7985 },
    { name: 'Santander', lat: 9.3616, lng: 123.2868 },
    { name: 'Sibonga', lat: 10.0333, lng: 123.5167 },
    { name: 'Sogod', lat: 10.7525, lng: 124.0147 },
    { name: 'Tabogon', lat: 10.9360, lng: 124.0289 },
    { name: 'Tabuelan', lat: 10.7756, lng: 123.8338 },
    { name: 'Tuburan', lat: 10.7205, lng: 123.8757 },
    { name: 'Tudela', lat: 10.6172, lng: 124.4133 },
  ];

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if(window.updateMap) {
        updateMap(${location.lat}, ${location.lng}, '${city}');
      }
    `);
  }, [location, city]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setCity(data.city);
      const selectedCity = cities.find(c => c.name === data.city);
      if (selectedCity) {
        setLocation({ lat: selectedCity.lat, lng: selectedCity.lng });
      }
    } catch (e) {
      console.error("Failed to parse message from webview:", e);
    }
  };

  const webViewRef = React.useRef(null);

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style type="text/css">
      #map {
        height: 100%;
        width: 100%;
      }
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      #label {
        position: absolute;
        margin: 10px;
        padding: 5px;
        background: white;
        font-size: 16px;
        color: black;
        border: 1px solid black;
        border-radius: 5px;
      }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g"></script>
    <script>
      var map, marker, circle, infoWindow;
      function initMap(latitude, longitude, name) {
        var position = { lat: latitude, lng: longitude };
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 12,
            center: position
        });
        marker = new google.maps.Marker({
            position: position,
            map: map,
            title: name
        });
    
        circle = new google.maps.Circle({
            strokeColor: '#006400',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#00FF00',
            fillOpacity: 0.35,
            map: map,
            center: position,
            radius: 5000 // 5 kilometers
        });
    
        infoWindow = new google.maps.InfoWindow({
            content: name
        });
    
        infoWindow.open(map, marker);
    
        // Add a listener for the click event to move the marker and pan the map.
        map.addListener('click', function (e) {
            placeMarkerAndPanTo(e.latLng, map);
        });
    }
  
      function placeMarkerAndPanTo(latLng, map) {
        marker.setPosition(latLng);
        map.panTo(latLng);
        circle.setCenter(latLng);
        geocodeLatLng(latLng);
    }
  
    function updateMap(latitude, longitude, name) {
        console.log("Updating map to: ", latitude, longitude, name); // Add this line
        var newPosition = {lat: latitude, lng: longitude};
        map.setCenter(newPosition);
        marker.setPosition(newPosition);
        circle.setCenter(newPosition);
        marker.setTitle(name);
        infoWindow.setContent(name);
        infoWindow.open(map, marker);
    }
      function geocodeLatLng(latlng) {
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'location': latlng }, function(results, status) {
          if (status === 'OK') {
            if (results[0]) {
              var address = results[0].formatted_address;
              // Find the city or municipality component in the address
              var city = results[0].address_components.find(function(component) {
                return component.types.includes('locality') || component.types.includes('administrative_area_level_2');
              });
              city = city ? city.long_name : 'Unknown area';
              updateSelectedArea(city);
            } else {
              updateSelectedArea('No results found');
            }
          } else {
            updateSelectedArea('Geocoder failed due to: ' + status);
          }
        });
      }

      function updateSelectedArea(area) {
        const message = JSON.stringify({ city: area });
        window.ReactNativeWebView.postMessage(message);
      }
    </script>
  </head>
  <body onload="initMap(${location.lat}, ${location.lng}, '${city}')">
    <div id="map"></div>
    <div id="label">${city}</div>
  </body>
  </html>
  `;
  

  return (
    <Provider>
      <View style={{ flex: 1 }}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              onPress={() => setMenuVisible(true)}
              title="Select a city or municipality"
              color="#05652D"
            />
          }
        >
          {cities.map((c, index) => (
            <Menu.Item
              key={index}
              onPress={() => {
                setCity(c.name);
                setLocation({ lat: c.lat, lng: c.lng });
                setTimeout(() => {
                  webViewRef.current?.injectJavaScript(`
                    updateMap(${c.lat}, ${c.lng}, '${c.name}');
                  `);
                }, 100); 
                setMenuVisible(false);
              }}
              title={c.name}
            />
          ))}
        </Menu>
        <Text style={styles.infoText}>Selected Area: {city}</Text>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={onMessage}
        />
        <Button
          title="Confirm"
          color="#05652D"
          onPress={confirmSelection}
        />
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
    menuStyle: {
      //
    },
    infoContainer: {
        padding: 10,
        backgroundColor: '#ffffff', 
      },
      infoText: {
        padding: 10,
        fontSize: 16,
        color: '#000000',
        backgroundColor: '#ffffff',
      },
  })

export default MapLocationBased;