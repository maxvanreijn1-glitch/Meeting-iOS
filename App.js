/**
 * Meeting iOS App
 *
 * Root navigation component — no landing page, users go directly
 * to the join screen where they can start or join a meeting.
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import JoinScreen from './src/screens/JoinScreen';
import MeetingRoom from './src/screens/MeetingRoom';

const Stack = createStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <Stack.Navigator
          initialRouteName="Join"
          screenOptions={{
            headerShown: false,
            cardStyle: {backgroundColor: '#1a1a2e'},
          }}>
          <Stack.Screen name="Join" component={JoinScreen} />
          <Stack.Screen name="MeetingRoom" component={MeetingRoom} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
