import React from 'react';
import { WebView } from 'react-native-webview';

const MapViewer = () => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style type="text/css">
        #map {
          height: 100%;
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
      </style>
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA6bqssrv5NTEf2lr6aZMSh_4hGrnjr32g"></script>
      <script>
        function initMap() {
          var cebu = {lat: 10.3157, lng: 123.8854};
          var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: cebu
          });
          var marker = new google.maps.Marker({
            position: cebu,
            map: map,
            title: 'Cebu City'
          });
        }
      </script>
    </head>
    <body onload="initMap()">
      <div id="map"></div>
    </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: htmlContent }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
};

export default MapViewer;