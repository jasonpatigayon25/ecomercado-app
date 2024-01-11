import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Platform, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const Chat = ({ navigation, route }) => {

  const [senderName, setSenderName] = useState('');

  const [receiverName, setReceiverName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [chatData, setChatData] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState(route.params.receiverEmail || '');

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const { chatId, productDetails, donationDetails } = route.params;
  const messagesRef = collection(db, 'messages');

  const fetchReceiverName = async (email) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
  
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setReceiverName(`${userData.firstName} ${userData.lastName}`);
      } else {
        console.log(`No user found for email: ${email}`);
        setReceiverName('User not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    if (receiverEmail) {
      fetchReceiverName(receiverEmail);
    }
  }, [receiverEmail]);

  useEffect(() => {
    const fetchUserName = async (uid) => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', uid));
  
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setSenderName(`${userData.firstName} ${userData.lastName}`);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
  
    if (currentUser?.uid) {
      fetchUserName(currentUser.uid);
    }
  }, [currentUser]);

  const handleSend = async () => {
    if (message.trim() !== '') {
      await addDoc(messagesRef, {
        chatId,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        receiverEmail,
        text: message,
        timestamp: serverTimestamp(),
      });
      setMessage('');
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp ? new Date(timestamp.seconds * 1000).toLocaleString() : '';
  };

  const renderItem = ({ item }) => {
    const isUserSender = item.senderId === currentUser.uid;

    const isHiddenForUser = item.hiddenFor && item.hiddenFor[currentUser.uid];
  
    if (isHiddenForUser) return null; 
  
    let displayName = isUserSender ? `me (${senderName})` : receiverName;

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item.id, isUserSender)}
        style={[
          styles.messageContainer,
          isUserSender ? styles.userMessageContainer : styles.sellerMessageContainer,
        ]}
      >
        <Text style={styles.emailText}>{displayName || (isUserSender ? 'me' : 'User not found')}</Text>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
        ) : (
          <Text style={styles.messageText}>{item.text}</Text>
        )}
        <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    if (productDetails || donationDetails) {
      sendAutoMessage(productDetails, donationDetails);
    }

    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id });
      });
      setChatData(messages);
    });

    if (!receiverEmail) {
      const chatDetailsRef = doc(db, 'chats', chatId);
      getDoc(chatDetailsRef).then((docSnap) => {
        if (docSnap.exists()) {
          const chatDetails = docSnap.data();
          const otherParticipantEmail = chatDetails.users.find(email => email !== currentUser.email);
          setReceiverEmail(otherParticipantEmail);
        }
      }).catch(error => {
        console.error("Error fetching chat details: ", error);
      });
    }

    return () => {
      unsubscribe();
    };
  }, [chatId, receiverEmail, productDetails, donationDetails]);

  const sendAutoMessage = async (product, donation) => {
    let messageText;
    let imageUrl;
    
    if (product) {
      messageText = `Here's the product you were interested in: ${product.name}`;
      imageUrl = product.imageUrl;
    } else if (donation) {
      messageText = `Interested in the donation: ${donation.name}`;
      imageUrl = donation.imageUrl;
    }
  
    if (messageText) {
      await addDoc(messagesRef, {
        chatId,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        receiverEmail,
        text: messageText,
        imageUrl,  
        timestamp: serverTimestamp(),
      });
    }
  };

  const storage = getStorage();

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `chat-images/${Date.now()}-${currentUser.uid}`);
    
    let downloadUrl = '';
    try {
      await uploadBytes(storageRef, blob);
      downloadUrl = await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading image: ', error);
    }
    return downloadUrl;
  };

  const handleSendImage = async (uri) => {
    const imageUrl = await uploadImage(uri);
    if (imageUrl) {
      await addDoc(messagesRef, {
        chatId,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        receiverEmail,
        imageUrl,
        timestamp: serverTimestamp(),
      });
    }
  };

  const handleChoosePhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleSendImage(result.assets[0].uri);
    }
  };
  
  const handleTakePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleSendImage(result.assets[0].uri);
    }
  };

  const handleLongPress = (messageId, isUserSender) => {
    Alert.alert(
      'Delete Message',
      'Do you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          onPress: () => deleteMessageForMe(messageId),
        },
        isUserSender ? {
          text: 'Delete for everyone',
          onPress: () => deleteMessageForEveryone(messageId),
          style: 'destructive',
        } : null,
      ].filter(Boolean),
    );
  };
  
  const deleteMessageForMe = async (messageId) => {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      [`hiddenFor.${currentUser.uid}`]: true,
    });
  };
  
  const deleteMessageForEveryone = async (messageId) => {
    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" style={styles.backButtonIcon} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>To: {receiverName || receiverEmail}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('UserVisit', { email: receiverEmail })}>
            <Text style={styles.visitText}>Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.chatContainer}>
        <FlatList
          data={chatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatContent}
          inverted
        />
      </View>
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleChoosePhoto}>
          <Icon style={styles.icons} name="photo" size={24} color="#05652D" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleTakePhoto}>
          <Icon style={styles.icons} name="camera" size={24} color="#05652D" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Icon name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // marginTop: 30,
    backgroundColor: '#FFFFFF',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
  },
  backButtonIcon: {
    marginRight: 10,
  },
  chatContainer: {
    flex: 1,
    paddingTop: 20,
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: '70%',
    alignSelf: 'flex-start',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  sellerMessageContainer: {
    backgroundColor: '#E4E4E4',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    backgroundColor: '#FFF',
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#05652D',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  icons: {
    marginHorizontal: 8,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#05652D',
    textDecorationLine: 'underline', 
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
});

export default Chat;