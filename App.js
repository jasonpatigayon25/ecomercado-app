import React, { useState, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, collection, where, getDocs, query } from 'firebase/firestore';
import registerNNPushToken from 'native-notify';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


// imported screens
import SearchResults from './screens/SearchResults';
import HomeScreen from './screens/Home';
import SignupScreen from './screens/Signup';
import Login from './screens/Login';
import SellScreen from './screens/Sell';
import DonateScreen from './screens/Donate';
import NotificationScreen from './screens/Notification';
import WishlistScreen from './screens/Wishlist';
import ForgotPasswordScreen from './screens/ForgotPassword';
import Chat from './screens/Chat';
import Chatbox from './screens/Chatbox';
import Contacts from './screens/Contacts';
import Account from './screens/Account';
import ProductDetail from './screens/ProductDetail';
import HelpCenter from './screens/HelpCenter';
import ContactUs from './screens/ContactUs';
import AboutUs from './screens/AboutUs';
import ChangePassword from './screens/ChangePassword';
import NotificationSettings from './screens/NotificationSettings';
import WelcomeHome from './screens/WelcomeHome';
import EditProfile from './screens/EditProfile';
import SellerManagement from './screens/SellerManagement';
import DonationManagement from './screens/DonationManagement';
import OrderHistory from './screens/OrderHistory';
import CheckOutScreen from './screens/CheckOutScreen';
import Cart from './screens/Cart';
import OrderConfirmation from './screens/OrderConfirmation';
import SearchScreen from './screens/SearchScreen';
import UserContext from './contexts/UserContext';
import Navbar from './navbars/Navbar';
import NavbarChat from './navbars/NavbarChat';
import CategoryResults from './screens/CategoryResults';
import Wish from './screens/Wish';
import SearchDonationScreen from './screens/SearchDonationScreen';
import DonationDetail from './screens/DonationDetail';
import RequestDonationScreen from './screens/RequestDonationScreen';
import SearchDonationResults from './screens/SearchDonationResults';
import RequestApproval from './screens/RequestApproval';
import UserVisit from './screens/UserVisit';
import CheckoutProducts from './screens/CheckoutProducts';
import OrdersConfirmation from './screens/OrdersConfirmation';
import ProductPosts from './screens/ProductPosts';
import SellerRegistration from './screens/SellerRegistration';
import SellAddProduct from './screens/SellAddProduct';
import DonateAddDonation from './screens/DonateAddDonation';
import RatingReview from './screens/RatingReview';
import SellerOrderManagement from './screens/SellerOrderManagement';
import OrderToPayDetails from './screens/OrderToPayDetails';
import OrderToShipDetails from './screens/OrderToShipDetails';
import OrderToReceiveDetails from './screens/OrderToReceiveDetail';
import OrderCancelledDetails from './screens/OrderCancelledDetails';
import OrderCompletedDetails from './screens/OrderCompletedDetails';
import SuspendedProducts from './screens/SuspendedProducts';
import OrderToApproveDetails from './screens/OrderToApproveDetail';
import OrderToShipBySellerDetails from './screens/OrderToShipBySellerDetails';
import OrderShippedDetails from './screens/OrderShippedDetails';
import OrderCompletedBySellerDetails from './screens/OrderCompletedBySellerDetails';

const getActiveRouteName = (state) => {
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // main screens navigations
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        if (keyboardVisible) {
          return null;
        }
        const routeName = getActiveRouteName(props.state);
        return <Navbar {...props} activeRoute={routeName} />;
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Sell" component={SellScreen} />
      <Tab.Screen name="Donate" component={DonateScreen} />
      <Tab.Screen name="Notification" component={NotificationScreen} />
      <Tab.Screen name="Account" component={Account} />
    </Tab.Navigator>
  );
};

const CCCTabs = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // chat system navigations
  return (
    <Tab.Navigator
      initialRouteName="Chatbox"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        if (keyboardVisible) {
          return null;
        }
        const routeName = getActiveRouteName(props.state);
        return <NavbarChat {...props} activeRoute={routeName} />;
      }}
    >
      <Tab.Screen name="Chatbox" component={Chatbox} />
      <Tab.Screen name="Contacts" component={Contacts} />
    </Tab.Navigator>
  );
};

const App = () => {
  registerNNPushToken(18345, 'TdOuHYdDSqcy4ULJFVCN7l');

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const checkIfUserIsBanned = async (email) => {
    const db = getFirestore();
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      if (userDoc.data().banned) {
        // if user is banned, show alert, sign out and navigate to Welcome Screen
        Alert.alert(
          "Account Banned",
          "Your account has been banned. You will be signed out automatically.",
          [
            {
              text: "OK",
              onPress: async () => {
                await signOut(getAuth());
              }
            }
          ],
          { cancelable: false }
        );
      }
    } else {
      console.log('User document not found with email:', email);
    }
  };


  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const hasJustRegistered = await AsyncStorage.getItem('hasJustRegistered');
        if (hasJustRegistered === 'true') {
          await AsyncStorage.removeItem('hasJustRegistered');
        } else {
          setUser(currentUser);
          checkIfUserIsBanned(currentUser.email).catch(console.error);
        }
      } else {
        setUser(null);
      }

      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  // last screen checking
  useEffect(() => {
    const getLastScreen = async () => {
      try {
        const lastScreen = await AsyncStorage.getItem('lastScreen');
        if (lastScreen) {
        }
      } catch (error) {
        console.error('Error reading lastScreen from AsyncStorage:', error);
      }
    };

    if (user) {
      getLastScreen();
    }
  }, [user]);

  if (initializing) {
    return null;
  }

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        setLastScreen('WelcomeHome');
      })
      .catch((error) => {
        console.error('Error signing out:', error);
      });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <UserContext.Provider value={{ user, setUser }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={user ? 'Main' : 'WelcomeHome'} screenOptions={{ headerShown: false }}>
          {user ? (
            // User is signed in
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="CCC" component={CCCTabs} />
              <Stack.Screen name="UserVisit" component={UserVisit} />
              <Stack.Screen name="CategoryResults" component={CategoryResults} />
              <Stack.Screen name="SearchScreen" component={SearchScreen} />
              <Stack.Screen name="SearchResults" component={SearchResults} />
              <Stack.Screen name="SearchDonationScreen" component={SearchDonationScreen} />
              <Stack.Screen name="SearchDonationResults" component={SearchDonationResults} />
              <Stack.Screen name="DonationDetail" component={DonationDetail} />
              <Stack.Screen name="RequestDonationScreen" component={RequestDonationScreen} />
              <Stack.Screen name="Wishlist" component={WishlistScreen} />
              <Stack.Screen name="Chat" component={Chat} />
              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="RatingReview" component={RatingReview}  options={{ presentation: 'modal' }}/>
              <Stack.Screen name="HelpCenter" component={HelpCenter} />
              <Stack.Screen name="ContactUs" component={ContactUs} />
              <Stack.Screen name="AboutUs" component={AboutUs} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} />
              <Stack.Screen name="NotificationSettings" component={NotificationSettings} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen name="SellAddProduct" component={SellAddProduct} />
              <Stack.Screen name="SellerManagement" component={SellerManagement} />
              <Stack.Screen name="SellerRegistration" component={SellerRegistration} />
              <Stack.Screen name="ProductPosts" component={ProductPosts} />
              <Stack.Screen name="DonationManagement" component={DonationManagement} />
              <Stack.Screen name="DonateAddDonation" component={DonateAddDonation} />
              <Stack.Screen name="OrderHistory" component={OrderHistory} />
              <Stack.Screen name="OrderToPayDetails" component={OrderToPayDetails} />
              <Stack.Screen name="OrderToShipDetails" component={OrderToShipDetails} />
              <Stack.Screen name="OrderToReceiveDetails" component={OrderToReceiveDetails} />
              <Stack.Screen name="OrderCompletedDetails" component={OrderCompletedDetails} />
              <Stack.Screen name="OrderCancelledDetails" component={OrderCancelledDetails} />
              <Stack.Screen name="OrderToApproveDetails" component={OrderToApproveDetails} />
              <Stack.Screen name="OrderToShipBySellerDetails" component={OrderToShipBySellerDetails} />
              <Stack.Screen name="OrderShippedDetails" component={OrderShippedDetails} />
              <Stack.Screen name="OrderCompletedBySellerDetails" component={OrderCompletedBySellerDetails} />
              <Stack.Screen name="SellerOrderManagement" component={SellerOrderManagement} />
              <Stack.Screen name="SuspendedProducts" component={SuspendedProducts} />
              <Stack.Screen name="RequestApproval" component={RequestApproval} />
              <Stack.Screen name="CheckOutScreen" component={CheckOutScreen} />
              <Stack.Screen name="CheckoutProducts" component={CheckoutProducts} />
              <Stack.Screen name="Cart" component={Cart} />
              <Stack.Screen name="Wish" component={Wish} />
              <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
              <Stack.Screen name="OrdersConfirmation" component={OrdersConfirmation} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Logout" component={MainTabs} options={{ headerRight: () => <Button title="Logout" onPress={handleLogout} /> }} />
            </>
          ) : (
            // No user is signed in
            <>
              <Stack.Screen name="WelcomeHome" component={WelcomeHome} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </UserContext.Provider>
    </GestureHandlerRootView>
  );
};

export default App;
