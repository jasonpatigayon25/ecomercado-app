/* 
ECOMercado
Programmer/Designer: PATIGAYON, JASON B.
 */

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
import OrderCancelledBySellerDetails from './screens/OrderCancelledBySellerDetails';
import DonationImage from './screens/DonationImage';
import ProductImage from './screens/ProductImage';
import DonationWishlist from './screens/DonationWishlist';
import RequestCheckout from './screens/RequestCheckout';
import RequestConfirmation from './screens/RequestConfirmation';
import RequestHistory from './screens/RequestHistory';
import RequestToApproveDetails from './screens/RequestToApproveDetails';
import RequestToDeliverDetails from './screens/RequestToDeliverDetails';
import RequestToReceiveDetails from './screens/RequestToReceiveDetails';
import RequestCompletedDetails from './screens/RequestCompletedDetails';
import RequestDeclinedDetails from './screens/RequestDeclinedDetails';
import DonationPosts from './screens/DonationPosts';
import DonorManagement from './screens/DonorManagement';
import EditDonation from './screens/EditDonation';
import EditProduct from './screens/EditProduct';
import RequestManagement from './screens/RequestManagement';
import RequestToApproveByDonorDetails from './screens/RequestToApproveByDonorDetails';
import RequestToDeliverByDonorDetails from './screens/RequestToDeliverByDonorDetails';
import RequestReceivingDetails from './screens/RequestReceivingDetails';
import RequestCompletedByDonorDetails from './screens/RequestCompletedByDonorDetails';
import RequestDeclinedByDonorDetails from './screens/RequestDeclinedByDonorDetails';
import SuspendedDonation from './screens/SuspendedDonation';
import ResubmitDonation from './screens/ResubmitDonation';
import ResubmitProduct from './screens/ResubmitProduct';
import EditSellerInfo from './screens/EditSellerInfo';
import ViewerImage from './screens/ViewerImage';
import CategorizedProduct from './screens/CategorizedProduct';
import CategorizedDonation from './screens/CategorizedDonation';
import CategoryResultsDonation from './screens/CategoryResultsDonation';
import SearchProducts from './screens/SearchProducts';
import SearchProductResults from './screens/SearchProductResults';
import SearchDonations from './screens/SearchDonations';
import WishDonation from './screens/WishDonation';
import MapSelector from './screens/MapSelector';
import MapViewer from './screens/MapViewer';
import MapLocationBased from './screens/MapLocationBased';
import MapLocationBasedHome from './screens/MapLocationBasedHome';
import MapLocationBasedDonation from './screens/MapLocationBasedDonation';
import MapLocationSelector from './screens/MapLocationSelector';
import MapLocationSelectorSell from './screens/MapLocationSelectorSell';
import MapLocationSelectorSellProduct from './screens/MapLocationSelectorSellProduct';
import MapLocationSelectorEditProduct from './screens/MapLocationSelectorEditProduct';
import MapLocationSelectorResubmitProduct from './screens/MapLocationSelectorResubmitProduct';
import MapLocationSelectorDonate from './screens/MapLocationSelectorDonate';
import MapLocationSelectorDonateAddDonation from './screens/MapLocationSelectorDonateAddDonation';
import MapLocationSelectorEditDonation from './screens/MapLocationSelectorEditDonation';
import MapLocationSelectorResubmitDonation from './screens/MapLocationSelectorResubmitDonation';
import MapLocationSelectorProfile from './screens/MapLocationSelectorProfile';

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
  registerNNPushToken(21249, 'kHrDsgwvsjqsZkDuubGBMU');

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
              <Stack.Screen name="CategoryResultsDonation" component={CategoryResultsDonation} />
              <Stack.Screen name="CategorizedProduct" component={CategorizedProduct} />
              <Stack.Screen name="CategorizedDonation" component={CategorizedDonation} />
              <Stack.Screen name="SearchProducts" component={SearchProducts} />
              <Stack.Screen name="SearchProductResults" component={SearchProductResults} />
              <Stack.Screen name="SearchDonations" component={SearchDonations} />
              <Stack.Screen name="SearchScreen" component={SearchScreen} />
              <Stack.Screen name="SearchResults" component={SearchResults} />
              <Stack.Screen name="SearchDonationScreen" component={SearchDonationScreen} />
              <Stack.Screen name="SearchDonationResults" component={SearchDonationResults} />
              <Stack.Screen name="DonationDetail" component={DonationDetail} />
              <Stack.Screen name="RequestCheckout" component={RequestCheckout} />
              <Stack.Screen name="DonationImage" component={DonationImage} />
              <Stack.Screen name="RequestDonationScreen" component={RequestDonationScreen} />
              <Stack.Screen name="RequestConfirmation" component={RequestConfirmation} />
              <Stack.Screen name="Wishlist" component={WishlistScreen} />
              <Stack.Screen name="Chat" component={Chat} />
              <Stack.Screen name="ProductDetail" component={ProductDetail} />
              <Stack.Screen name="ProductImage" component={ProductImage} />
              <Stack.Screen name="RatingReview" component={RatingReview}  options={{ presentation: 'modal' }}/>
              <Stack.Screen name="HelpCenter" component={HelpCenter} />
              <Stack.Screen name="ContactUs" component={ContactUs} />
              <Stack.Screen name="AboutUs" component={AboutUs} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} />
              <Stack.Screen name="NotificationSettings" component={NotificationSettings} />
              <Stack.Screen name="ViewerImage" component={ViewerImage} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen name="EditSellerInfo" component={EditSellerInfo} />
              <Stack.Screen name="EditProduct" component={EditProduct} />
              <Stack.Screen name="EditDonation" component={EditDonation} />
              <Stack.Screen name="ResubmitDonation" component={ResubmitDonation} />
              <Stack.Screen name="ResubmitProduct" component={ResubmitProduct} />
              <Stack.Screen name="SellAddProduct" component={SellAddProduct} />
              <Stack.Screen name="SellerManagement" component={SellerManagement} />
              <Stack.Screen name="SellerRegistration" component={SellerRegistration} />
              <Stack.Screen name="ProductPosts" component={ProductPosts} />
              <Stack.Screen name="DonationManagement" component={DonationManagement} />
              <Stack.Screen name="DonorManagement" component={DonorManagement} />
              <Stack.Screen name="DonateAddDonation" component={DonateAddDonation} />
              <Stack.Screen name="DonationPosts" component={DonationPosts} />
              <Stack.Screen name="RequestManagement" component={RequestManagement} />
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
              <Stack.Screen name="OrderCancelledBySellerDetails" component={OrderCancelledBySellerDetails} />
              <Stack.Screen name="SellerOrderManagement" component={SellerOrderManagement} />
              <Stack.Screen name="SuspendedProducts" component={SuspendedProducts} />
              <Stack.Screen name="SuspendedDonation" component={SuspendedDonation} />
              <Stack.Screen name="RequestApproval" component={RequestApproval} />
              <Stack.Screen name="RequestHistory" component={RequestHistory} />
              <Stack.Screen name="RequestToApproveDetails" component={RequestToApproveDetails} />
              <Stack.Screen name="RequestToDeliverDetails" component={RequestToDeliverDetails} />
              <Stack.Screen name="RequestToReceiveDetails" component={RequestToReceiveDetails} />
              <Stack.Screen name="RequestCompletedDetails" component={RequestCompletedDetails} />
              <Stack.Screen name="RequestDeclinedDetails" component={RequestDeclinedDetails} />
              <Stack.Screen name="RequestToApproveByDonorDetails" component={RequestToApproveByDonorDetails} />
              <Stack.Screen name="RequestToDeliverByDonorDetails" component={RequestToDeliverByDonorDetails} />
              <Stack.Screen name="RequestReceivingDetails" component={RequestReceivingDetails} />
              <Stack.Screen name="RequestCompletedByDonorDetails" component={RequestCompletedByDonorDetails} />
              <Stack.Screen name="RequestDeclinedByDonorDetails" component={RequestDeclinedByDonorDetails} />
              <Stack.Screen name="CheckOutScreen" component={CheckOutScreen} />
              <Stack.Screen name="CheckoutProducts" component={CheckoutProducts} />
              <Stack.Screen name="Cart" component={Cart} />
              <Stack.Screen name="DonationWishlist" component={DonationWishlist} />
              <Stack.Screen name="Wish" component={Wish} />
              <Stack.Screen name="WishDonation" component={WishDonation} />
              <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
              <Stack.Screen name="OrdersConfirmation" component={OrdersConfirmation} />
              <Stack.Screen name="MapSelector" component={MapSelector} />
              <Stack.Screen name="MapViewer" component={MapViewer} />
              <Stack.Screen name="MapLocationBased" component={MapLocationBased} />
              <Stack.Screen name="MapLocationBasedDonation" component={MapLocationBasedDonation} />
              <Stack.Screen name="MapLocationBasedHome" component={MapLocationBasedHome} />
              <Stack.Screen name="MapLocationSelectorSell" component={MapLocationSelectorSell} />
              <Stack.Screen name="MapLocationSelectorSellProduct" component={MapLocationSelectorSellProduct} />
              <Stack.Screen name="MapLocationSelectorEditProduct" component={MapLocationSelectorEditProduct} />
              <Stack.Screen name="MapLocationSelectorResubmitProduct" component={MapLocationSelectorResubmitProduct} />
              <Stack.Screen name="MapLocationSelectorDonate" component={MapLocationSelectorDonate} />
              <Stack.Screen name="MapLocationSelectorDonateAddDonation" component={MapLocationSelectorDonateAddDonation} />
              <Stack.Screen name="MapLocationSelectorEditDonation" component={MapLocationSelectorEditDonation} />
              <Stack.Screen name="MapLocationSelectorResubmitDonation" component={MapLocationSelectorResubmitDonation} />
              <Stack.Screen name="MapLocationSelectorProfile" component={MapLocationSelectorProfile} />
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
              <Stack.Screen name="MapLocationSelector" component={MapLocationSelector} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </UserContext.Provider>
    </GestureHandlerRootView>
  );
};

export default App;