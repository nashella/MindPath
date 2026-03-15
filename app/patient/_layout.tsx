import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";

import { PatientProvider } from "../careTaker/patient-context";

export default function PatientTabLayout() {
  return (
    <PatientProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: "#4A90D9",
          tabBarInactiveTintColor: "#7D8798",
          tabBarStyle: {
            height: 74,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: "#FFFFFF",
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                color={color}
                name="home-variant-outline"
                size={24}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                color={color}
                name="calendar-clock-outline"
                size={24}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="guidance"
          options={{
            title: "Guidance",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                color={color}
                name="navigation-variant-outline"
                size={24}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="face-scan"
          options={{
            title: "Scan",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                color={color}
                name="account-search-outline"
                size={24}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Memories"
          options={{
            title: "Memories",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                color={color}
                name="account-search-outline"
                size={24}
              />
            ),
          }}
        />
      </Tabs>
    </PatientProvider>
  );
}
