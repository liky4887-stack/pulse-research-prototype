import { Tabs } from 'expo-router';
import { HeartPulse, Home, LineChart, UserRound } from 'lucide-react-native';
import { View } from 'react-native';
const pink = '#f04c88';
const muted = '#8f8294';
export default function TabsLayout() {
    return (<Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: pink,
            tabBarInactiveTintColor: muted,
            tabBarStyle: {
                backgroundColor: '#100a15',
                borderTopColor: '#29182a',
                height: 76,
                paddingTop: 10,
                paddingBottom: 12,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size}/> }}/>
      <Tabs.Screen name="report" options={{ title: 'Reports', tabBarIcon: ({ color, size }) => <LineChart color={color} size={size}/> }}/>
      <Tabs.Screen name="scan" options={{
            title: '',
            tabBarLabel: () => null,
            tabBarIcon: ({ color }) => (<View style={{ backgroundColor: pink, borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <HeartPulse color={color === pink ? '#fff' : '#fff'} size={27} strokeWidth={1.8}/>
            </View>),
        }}/>
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size}/> }}/>
    </Tabs>);
}
