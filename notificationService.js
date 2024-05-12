const axios = require('axios');

const sendFCMMessage = async (token, title, body) => {
  const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
  const serverKey = 'AAAAo1GLSPs:APA91bFe9NfclPcvEo_U_96zmoASd0wAQsrgbXTaOfcFlB56SQMuE41TVGfKWvQjDzcMU-gYaEtpJWCF0Op6rn-HIJoVhIU8KwM7RbeYiTdGMhNkpe7FzLvjPOTZShQVtd3VMr8U2fqi'; 

  const payload = {
    to: token,
    notification: {
      title: title,
      body: body,
    },
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'key=' + serverKey
  };

  try {
    const response = await axios.post(fcmUrl, payload, { headers: headers });
    console.log('Message sent: ', response.data);
  } catch (error) {
    console.error('Error sending FCM message:', error);
  }
};

module.exports = { sendFCMMessage };