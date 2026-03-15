import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import BottomSheet, {
  BottomSheetScrollView,
  TouchableOpacity as SheetButton,
} from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { formatFirebaseError } from '@/lib/firebase-errors';
import {
  savePatientAlert,
  subscribeToPatient,
  subscribeToPatientLocation,
  subscribeToPatientSafeZone,
} from '@/lib/firestore-data';
import { useLinkedAccount } from '@/lib/use-linked-account';

import { usePatientContext } from './patient-context';

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type PatientRecord = {
  patientName?: string;
} | null;

type PatientLocationRecord = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  updatedAtMs?: number;
  source?: string;
} | null;

type SafeZoneRecord = {
  label?: string;
  center?: MapCoordinate;
  radiusMeters?: number;
  vertices?: MapCoordinate[];
} | null;

type FeedbackTone = 'error' | 'success';

type FeedbackState = {
  message: string;
  tone: FeedbackTone;
} | null;

type NeedOption = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  backgroundColor: string;
  color: string;
};

const COLORS = {
  background: '#FAFAFA',
  title: '#1A1A2E',
  subtitle: '#8A8A9E',
  white: '#FFFFFF',
  blue: '#4A90D9',
  blueSoft: '#EBF4FC',
  green: '#6DBF8A',
  greenSoft: '#ECF9F1',
  orange: '#E8925E',
  orangeSoft: '#FDF3EC',
  purple: '#B786F7',
  purpleSoft: '#F6EDFD',
  pink: '#D887A6',
  pinkSoft: '#FDF2F6',
  chip: '#F4F4F6',
  danger: '#E05C5C',
  dangerSoft: '#FDECEC',
  mapBackdrop: '#EBF4FC',
  routeStroke: '#4A90D9',
};

const DEFAULT_REGION = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

const NEED_OPTIONS: NeedOption[] = [
  {
    id: 'find-home',
    label: 'Find Home',
    icon: 'navigation-variant',
    backgroundColor: COLORS.blueSoft,
    color: COLORS.blue,
  },
  {
    id: 'call-caregiver',
    label: 'Call Caregiver',
    icon: 'phone-outline',
    backgroundColor: COLORS.greenSoft,
    color: COLORS.green,
  },
  {
    id: 'medication',
    label: 'Medication',
    icon: 'pill',
    backgroundColor: COLORS.purpleSoft,
    color: COLORS.purple,
  },
  {
    id: 'bathroom',
    label: 'Bathroom',
    icon: 'toilet',
    backgroundColor: COLORS.orangeSoft,
    color: COLORS.orange,
  },
];

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const MapViewComponent = NativeMaps?.default;
const MarkerComponent = NativeMaps?.Marker;
const PolylineComponent = NativeMaps?.Polyline;
const GoogleMapProvider = NativeMaps?.PROVIDER_GOOGLE;

function isValidCoordinate(
  coordinate?: Partial<MapCoordinate> | null
): coordinate is MapCoordinate {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude)
  );
}

function toCoordinate(location: PatientLocationRecord) {
  if (!isValidCoordinate(location)) return null;

  return {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  };
}

function getSafeZoneCenter(safeZone: SafeZoneRecord) {
  if (isValidCoordinate(safeZone?.center)) {
    return {
      latitude: Number(safeZone.center.latitude),
      longitude: Number(safeZone.center.longitude),
    };
  }

  const legacyVertices = Array.isArray(safeZone?.vertices)
    ? safeZone.vertices.filter(isValidCoordinate)
    : [];

  if (!legacyVertices.length) {
    return null;
  }

  return {
    latitude:
      legacyVertices.reduce((sum, vertex) => sum + vertex.latitude, 0) /
      legacyVertices.length,
    longitude:
      legacyVertices.reduce((sum, vertex) => sum + vertex.longitude, 0) /
      legacyVertices.length,
  };
}

function buildRegionFromCoordinates(coordinates: MapCoordinate[]) {
  const valid = coordinates.filter(isValidCoordinate);

  if (!valid.length) return DEFAULT_REGION;

  const latitudes = valid.map((coordinate) => coordinate.latitude);
  const longitudes = valid.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(
      (maxLatitude - minLatitude) * 1.8,
      valid.length === 1 ? 0.0022 : 0.006
    ),
    longitudeDelta: Math.max(
      (maxLongitude - minLongitude) * 1.8,
      valid.length === 1 ? 0.0022 : 0.006
    ),
  };
}

function getDistanceInMeters(start: MapCoordinate, end: MapCoordinate) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function formatLocationAge(updatedAtMs?: number) {
  if (!updatedAtMs) return 'Waiting for first signal';

  const elapsedMs = Date.now() - updatedAtMs;

  if (elapsedMs < 60000) return 'Just now';
  if (elapsedMs < 3600000) {
    return `${Math.max(1, Math.round(elapsedMs / 60000))} min ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(updatedAtMs);
}

function getTrackingState(location: PatientLocationRecord) {
  if (!location?.updatedAtMs) {
    return {
      label: 'Waiting',
      color: COLORS.pink,
      backgroundColor: COLORS.pinkSoft,
    };
  }

  return Date.now() - location.updatedAtMs <= 120000
    ? { label: 'Live', color: COLORS.green, backgroundColor: COLORS.greenSoft }
    : { label: 'Stale', color: COLORS.orange, backgroundColor: COLORS.orangeSoft };
}

function buildHelpMessage(patientName: string, selectedNeeds: string[]) {
  if (!selectedNeeds.length) {
    return `${patientName} needs help.`;
  }

  if (selectedNeeds.length === 1) {
    return `${patientName} needs help with ${selectedNeeds[0].toLowerCase()}.`;
  }

  const leadingNeeds = selectedNeeds.slice(0, -1).join(', ');
  const trailingNeed = selectedNeeds[selectedNeeds.length - 1];

  return `${patientName} needs help with ${leadingNeeds.toLowerCase()} and ${trailingNeed.toLowerCase()}.`;
}

export default function GuidanceScreen() {
  const { patientId, role, userId } = useLinkedAccount();
  const { addNotification, setDeviating, setHomeSafe } = usePatientContext();
  const { height: windowHeight } = useWindowDimensions();

  const [patientRecord, setPatientRecord] = useState<PatientRecord>(null);
  const [locationRecord, setLocationRecord] = useState<PatientLocationRecord>(null);
  const [safeZoneRecord, setSafeZoneRecord] = useState<SafeZoneRecord>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showHomeRoute, setShowHomeRoute] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['find-home']);

  const mapRef = useRef<any>(null);
  const bottomSheetRef = useRef<any>(null);
  const snapPoints = useMemo(
    () => [
      Math.min(windowHeight * 0.28, 250),
      Math.min(windowHeight * 0.52, 460),
      Math.min(windowHeight * 0.8, 700),
    ],
    [windowHeight]
  );

  useEffect(() => {
    if (!patientId) return undefined;
    return subscribeToPatient(patientId, setPatientRecord, () => {});
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return undefined;
    return subscribeToPatientLocation(patientId, setLocationRecord, () => {});
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return undefined;
    return subscribeToPatientSafeZone(patientId, setSafeZoneRecord, () => {});
  }, [patientId]);

  const trackingState = useMemo(
    () => getTrackingState(locationRecord),
    [locationRecord]
  );
  const patientCoordinate = useMemo(
    () => toCoordinate(locationRecord),
    [locationRecord]
  );
  const safeZoneCenter = useMemo(
    () => getSafeZoneCenter(safeZoneRecord),
    [safeZoneRecord]
  );
  const safeZoneRadiusMeters = Math.max(
    Number(safeZoneRecord?.radiusMeters ?? 50),
    25
  );
  const isInsideSafeArea = useMemo(() => {
    if (!patientCoordinate || !safeZoneCenter) return null;
    return getDistanceInMeters(patientCoordinate, safeZoneCenter) <= safeZoneRadiusMeters;
  }, [patientCoordinate, safeZoneCenter, safeZoneRadiusMeters]);
  const routeCoordinates = useMemo(() => {
    if (!showHomeRoute || !patientCoordinate || !safeZoneCenter) {
      return [];
    }

    return [patientCoordinate, safeZoneCenter];
  }, [patientCoordinate, safeZoneCenter, showHomeRoute]);
  const mapCoordinates = useMemo(() => {
    if (routeCoordinates.length) {
      return routeCoordinates;
    }

    return [patientCoordinate, safeZoneCenter].filter(Boolean) as MapCoordinate[];
  }, [patientCoordinate, routeCoordinates, safeZoneCenter]);
  const initialRegion = useMemo(
    () => buildRegionFromCoordinates(mapCoordinates),
    [mapCoordinates]
  );
  const canShowRoute = Boolean(patientCoordinate && safeZoneCenter);
  const canSendAlert =
    role === 'patient' && Boolean(patientId && userId);
  const selectedNeedLabels = useMemo(
    () =>
      NEED_OPTIONS.filter((option) => selectedNeeds.includes(option.id)).map(
        (option) => option.label
      ),
    [selectedNeeds]
  );

  useEffect(() => {
    if (!safeZoneCenter || isInsideSafeArea === null) {
      setDeviating(false);
      setHomeSafe(true);
      return;
    }

    setDeviating(!isInsideSafeArea);
    setHomeSafe(isInsideSafeArea);
  }, [isInsideSafeArea, safeZoneCenter, setDeviating, setHomeSafe]);

  useEffect(() => {
    if (!canShowRoute) {
      setShowHomeRoute(false);
    }
  }, [canShowRoute]);

  useEffect(() => {
    if (!MapViewComponent || !mapRef.current || !isMapReady || !mapCoordinates.length) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (mapCoordinates.length === 1) {
        mapRef.current.animateToRegion(
          buildRegionFromCoordinates(mapCoordinates),
          260
        );
        return;
      }

      mapRef.current.fitToCoordinates(mapCoordinates, {
        animated: true,
        edgePadding: { top: 100, right: 64, bottom: 320, left: 64 },
      });
    }, 140);

    return () => clearTimeout(timer);
  }, [isMapReady, mapCoordinates]);

  const toggleNeed = (needId: string) => {
    setFeedback(null);
    setSelectedNeeds((currentNeeds) =>
      currentNeeds.includes(needId)
        ? currentNeeds.filter((currentNeed) => currentNeed !== needId)
        : [...currentNeeds, needId]
    );
  };

  const handleFindHome = () => {
    if (!canShowRoute) return;
    setFeedback(null);
    setShowHomeRoute(true);
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleAlertCaregiver = async () => {
    if (!canSendAlert || isSendingAlert) return;

    if (!selectedNeedLabels.length) {
      setFeedback({
        message: 'Choose at least one need before sending a help request.',
        tone: 'error',
      });
      return;
    }

    setIsSendingAlert(true);
    setFeedback(null);

    try {
      const patientName = patientRecord?.patientName || 'Patient';

      await savePatientAlert(patientId, userId, {
        type: 'help-request',
        requestedNeeds: selectedNeedLabels,
        message: buildHelpMessage(patientName, selectedNeedLabels),
        safeZoneLabel: safeZoneRecord?.label ?? '',
        location: patientCoordinate,
      });

      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      addNotification({
        id: `patient-help-${Date.now()}`,
        time: nowTime,
        message: `Caregiver notified: ${selectedNeedLabels.join(', ')}.`,
        type: 'warning',
      });
      setFeedback({
        message: 'Help request sent to your caregiver.',
        tone: 'success',
      });
    } catch (error) {
      setFeedback({
        message: formatFirebaseError(error, 'Could not alert your caregiver right now.'),
        tone: 'error',
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.mapLayer}>
        {MapViewComponent && MarkerComponent ? (
          <MapViewComponent
            ref={mapRef}
            initialRegion={initialRegion}
            maxZoomLevel={21}
            minZoomLevel={2}
            onMapReady={() => setIsMapReady(true)}
            pitchEnabled
            provider={GoogleMapProvider}
            rotateEnabled
            scrollEnabled
            showsCompass={false}
            showsMyLocationButton={false}
            showsPointsOfInterest={false}
            showsUserLocation={false}
            style={styles.map}
            zoomEnabled
            zoomTapEnabled>
            {routeCoordinates.length === 2 && PolylineComponent ? (
              <PolylineComponent
                coordinates={routeCoordinates}
                lineCap="round"
                lineJoin="round"
                strokeColor={COLORS.routeStroke}
                strokeWidth={6}
              />
            ) : null}

            {patientCoordinate ? (
              <MarkerComponent coordinate={patientCoordinate}>
                <View style={styles.patientMarker}>
                  <FontAwesome6 color="#000000" name="person-dress" size={24} />
                </View>
              </MarkerComponent>
            ) : null}

            {safeZoneCenter ? (
              <MarkerComponent coordinate={safeZoneCenter}>
                <View style={styles.homeMarker}>
                  <AntDesign color="#000000" name="home" size={24} />
                </View>
              </MarkerComponent>
            ) : null}
          </MapViewComponent>
        ) : (
          <View style={styles.mapFallback}>
            <MaterialCommunityIcons color={COLORS.blue} name="map-outline" size={64} />
            <Text style={styles.mapFallbackTitle}>Map unavailable</Text>
            <Text style={styles.mapFallbackText}>
              Open the mobile build to view guidance and request help.
            </Text>
          </View>
        )}
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        animateOnMount
        enableOverDrag={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}>
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.sheetTitle}>
                {patientRecord?.patientName
                  ? `${patientRecord.patientName}'s Guidance`
                  : 'Guidance'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                Use the map below to head home or ask for help.
              </Text>
            </View>
            <View style={styles.chipStack}>
              <View
                style={[
                  styles.pillChip,
                  { backgroundColor: trackingState.backgroundColor },
                ]}>
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: trackingState.color },
                  ]}
                />
                <Text style={[styles.chipText, { color: trackingState.color }]}>
                  {trackingState.label}
                </Text>
              </View>
              <View
                style={[
                  styles.pillChip,
                  {
                    backgroundColor:
                      isInsideSafeArea === false
                        ? COLORS.dangerSoft
                        : COLORS.greenSoft,
                  },
                ]}>
                <MaterialCommunityIcons
                  color={isInsideSafeArea === false ? COLORS.danger : COLORS.green}
                  name={isInsideSafeArea === false ? 'shield-alert' : 'shield-check'}
                  size={14}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        isInsideSafeArea === false ? COLORS.danger : COLORS.green,
                    },
                  ]}>
                  {isInsideSafeArea === false ? 'Away' : 'Safe'}
                </Text>
              </View>
            </View>
          </View>

          {feedback ? (
            <View
              style={[
                styles.feedbackBanner,
                feedback.tone === 'success'
                  ? styles.feedbackSuccess
                  : styles.feedbackError,
              ]}>
              <MaterialCommunityIcons
                color={feedback.tone === 'success' ? COLORS.green : COLORS.danger}
                name={feedback.tone === 'success' ? 'check-circle' : 'alert-circle'}
                size={20}
              />
              <Text
                style={[
                  styles.feedbackText,
                  {
                    color:
                      feedback.tone === 'success' ? COLORS.green : COLORS.danger,
                  },
                ]}>
                {feedback.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.statRow}>
            <View style={[styles.card, { backgroundColor: COLORS.blueSoft }]}>
              <Text style={[styles.eyebrow, { color: COLORS.blue }]}>
                Last Update
              </Text>
              <Text style={styles.cardValue}>
                {formatLocationAge(locationRecord?.updatedAtMs)}
              </Text>
              <Text style={styles.cardHint}>
                {locationRecord?.source || 'Waiting for patient tracking'}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: COLORS.greenSoft }]}>
              <Text style={[styles.eyebrow, { color: COLORS.green }]}>
                Home Pin
              </Text>
              <Text style={styles.cardValue}>
                {safeZoneCenter ? 'Ready' : 'Missing'}
              </Text>
              <Text style={styles.cardHint}>
                {safeZoneCenter
                  ? 'Find Home draws a straight line to the saved home pin.'
                  : 'A caregiver needs to save a home pin first.'}
              </Text>
            </View>
          </View>

          <View style={[styles.block, { backgroundColor: COLORS.purpleSoft }]}>
            <Text style={[styles.blockTitle, { color: COLORS.purple }]}>
              What Do You Need?
            </Text>
            <Text style={styles.blockText}>
              Select one or more needs, then alert your caregiver.
            </Text>
            <View style={styles.needGrid}>
              {NEED_OPTIONS.map((option) => {
                const isSelected = selectedNeeds.includes(option.id);

                return (
                  <SheetButton
                    key={option.id}
                    activeOpacity={0.86}
                    onPress={() => toggleNeed(option.id)}
                    style={[
                      styles.needChip,
                      { backgroundColor: option.backgroundColor },
                      isSelected && styles.needChipSelected,
                    ]}>
                    <MaterialCommunityIcons
                      color={option.color}
                      name={option.icon}
                      size={18}
                    />
                    <Text style={[styles.needChipText, { color: option.color }]}>
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <MaterialCommunityIcons
                        color={option.color}
                        name="check-circle"
                        size={18}
                      />
                    ) : null}
                  </SheetButton>
                );
              })}
            </View>
          </View>

          <View style={[styles.block, { backgroundColor: COLORS.chip }]}>
            <Text style={styles.blockTitle}>Actions</Text>
            <Text style={styles.blockText}>
              Use Find Home for a straight route back to the saved pin, or send a
              help request with all selected needs at once.
            </Text>

            <SheetButton
              activeOpacity={0.88}
              disabled={!canShowRoute || showHomeRoute}
              onPress={handleFindHome}
              style={[
                styles.primaryActionButton,
                (!canShowRoute || showHomeRoute) && styles.opacityDim,
              ]}>
              <MaterialCommunityIcons
                color={COLORS.white}
                name="navigation-variant"
                size={22}
              />
              <Text style={styles.primaryActionText}>
                {showHomeRoute ? 'Route Showing' : 'Find Home'}
              </Text>
            </SheetButton>

            <SheetButton
              activeOpacity={0.88}
              disabled={!canSendAlert || isSendingAlert || selectedNeedLabels.length === 0}
              onPress={() => {
                void handleAlertCaregiver();
              }}
              style={[
                styles.secondaryActionButton,
                (!canSendAlert || isSendingAlert || selectedNeedLabels.length === 0) &&
                  styles.opacityDim,
              ]}>
              {isSendingAlert ? (
                <ActivityIndicator color={COLORS.orange} />
              ) : (
                <MaterialCommunityIcons
                  color={COLORS.orange}
                  name="bell-ring"
                  size={22}
                />
              )}
              <Text style={styles.secondaryActionText}>
                {isSendingAlert ? 'Sending...' : 'Alert Caregiver'}
              </Text>
            </SheetButton>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.mapBackdrop,
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.mapBackdrop,
  },
  map: {
    flex: 1,
  },
  patientMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.purple,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  homeMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.green,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  mapFallbackTitle: {
    fontSize: 26,
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  mapFallbackText: {
    fontSize: 15,
    color: COLORS.subtitle,
    lineHeight: 22,
    textAlign: 'center',
  },
  sheetBackground: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: COLORS.title,
    shadowOpacity: 0.06,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8D8E2',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 24,
    color: COLORS.title,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.subtitle,
  },
  chipStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 1,
  },
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#F4FBF6',
    borderColor: '#D5ECDB',
  },
  feedbackError: {
    backgroundColor: '#FEF4F4',
    borderColor: '#F3D6D6',
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 132,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardValue: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.title,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  cardHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.subtitle,
  },
  block: {
    borderRadius: 28,
    padding: 18,
    gap: 12,
  },
  blockTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.title,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  blockText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtitle,
  },
  needGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    rowGap: 10,
  },
  needChip: {
    width: '50%',
    paddingHorizontal: 4,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  needChipSelected: {
    borderColor: COLORS.title,
  },
  needChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionButton: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  secondaryActionButton: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: COLORS.orangeSoft,
    borderWidth: 1,
    borderColor: '#F6D5BD',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionText: {
    color: COLORS.orange,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  opacityDim: {
    opacity: 0.45,
  },
});
