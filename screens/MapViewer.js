// import React from 'react';
// import { WebView } from 'react-native-webview';

// const MapViewer = () => {
//   return (
//     <WebView
//       source={{
//         uri: 'https://www.google.com/maps/@?AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g=1&map_action=map&center=10.3157,123.8854&zoom=10', 
//       }}
//       style={{ flex: 1 }}
//       javaScriptEnabled={true}
//       domStorageEnabled={true}
//     />
//   );
// };

// export default MapViewer;

import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const MapViewer = () => {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: 10.3157,
        longitude: 123.8854,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      <Marker
        coordinate={{ latitude: 10.3157, longitude: 123.8854 }}
        title="Cebu City"
        description="The Queen City of the South"
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: 'transparent',
  },
  map: {
    flex: 1,
  },
});


export default MapViewer;