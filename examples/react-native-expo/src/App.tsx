import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Test ElevenLabs SDK import
try {
  const ElevenLabs = require('@elevenlabs/react-native');
  console.log('ElevenLabs SDK imported successfully:', Object.keys(ElevenLabs));
} catch (error) {
  console.error('Failed to import ElevenLabs SDK:', error);
}

const Tab = createBottomTabNavigator();

function HomeScreen() {
  const [clicks, setClicks] = useState(0);

  const handlePress = async () => {
    // Test haptics
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Test AsyncStorage
    const newClicks = clicks + 1;
    setClicks(newClicks);
    await AsyncStorage.setItem('clickCount', newClicks.toString());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello ElevenLabs!</Text>
      <Text style={styles.subtitle}>Navigation + Basic deps working</Text>

      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Test Haptics & Storage</Text>
        <Text style={styles.buttonText}>Clicks: {clicks}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings</Text>
      <Text style={styles.subtitle}>Dependencies testing screen</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Settings') {
              iconName = 'settings';
            } else {
              iconName = 'help';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#666',
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});