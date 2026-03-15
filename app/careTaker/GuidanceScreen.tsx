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

type MapCoordinate = { latitude: number; longitude: number };
type PatientRecord = { patientName?: string } | null;
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
type FeedbackState = { message: string; tone: 'error' | 'success' } | null;

const COLORS = {
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
  pink: '#D887A6',
  pinkSoft: '#FDF2F6',
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const MapViewComponent = NativeMaps?.default;
const MarkerComponent = NativeMaps?.Marker;
const PolylineComponent = NativeMaps?.Polyline;
const GoogleMapProvider = NativeMaps?.PROVIDER_GOOGLE;

function isValidCoordinate(c?: Partial<MapCoordinate> | null): c is MapCoordinate {
  return Boolean(c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
}

function toCoordinate(location: PatientLocationRecord) {
  if (!isValidCoordinate(location)) return null;
  return { latitude: Number(location.latitude), longitude: Number(location.longitude) };
}

function getSafeZoneCenter(safeZone: SafeZoneRecord) {
  if (isValidCoordinate(safeZone?.center)) {
    return { latitude: Number(safeZone.center.latitude), longitude: Number(safeZone.center.longitude) };
  }
  const verts = Array.isArray(safeZone?.vertices) ? safeZone.vertices.filter(isValidCoordinate) : [];
  if (!verts.length) return null;
  return {
    latitude: verts.reduce((s, v) => s + v.latitude, 0) / verts.length,
    longitude: verts.reduce((s, v) => s + v.longitude, 0) / verts.length,
  };
}

function buildRegionFromCoordinates(coordinates: MapCoordinate[]) {
  const valid = coordinates.filter(isValidCoordinate);
  if (!valid.length) return DEFAULT_REGION;
  const lats = valid.map((c) => c.latitude);
  const lngs = valid.map((c) => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, valid.length === 1 ? 0.0022 : 0.006),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, valid.length === 1 ? 0.0022 : 0.006),
  };
}

function getDistanceInMeters(start: MapCoordinate, end: MapCoordinate) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(end.latitude - start.latitude);
  const dLng = toRad(end.longitude - start.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(start.latitude)) * Math.cos(toRad(end.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrackingState(location: PatientLocationRecord) {
  if (!location?.updatedAtMs) return { label: 'Waiting', color: COLORS.pink, backgroundColor: COLORS.pinkSoft };
  return Date.now() - location.updatedAtMs <= 120000
    ? { label: 'Live', color: COLORS.green, backgroundColor: COLORS.greenSoft }
    : { label: 'Stale', color: COLORS.orange, backgroundColor: COLORS.orangeSoft };
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

  const mapRef = useRef<any>(null);
  const bottomSheetRef = useRef<any>(null);

  // Fixed single snap — sheet height is just enough for two big buttons
  const snapPoints = useMemo(() => [Math.min(windowHeight * 0.28, 240)], [windowHeight]);

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

  const trackingState = useMemo(() => getTrackingState(locationRecord), [locationRecord]);
  const patientCoordinate = useMemo(() => toCoordinate(locationRecord), [locationRecord]);
  const safeZoneCenter = useMemo(() => getSafeZoneCenter(safeZoneRecord), [safeZoneRecord]);
  const safeZoneRadiusMeters = Math.max(Number(safeZoneRecord?.radiusMeters ?? 50), 25);

  const isInsideSafeArea = useMemo(() => {
    if (!patientCoordinate || !safeZoneCenter) return null;
    return getDistanceInMeters(patientCoordinate, safeZoneCenter) <= safeZoneRadiusMeters;
  }, [patientCoordinate, safeZoneCenter, safeZoneRadiusMeters]);

  const routeCoordinates = useMemo(() => {
    if (!showHomeRoute || !patientCoordinate || !safeZoneCenter) return [];
    return [patientCoordinate, safeZoneCenter];
  }, [patientCoordinate, safeZoneCenter, showHomeRoute]);

  const mapCoordinates = useMemo(() => {
    if (routeCoordinates.length) return routeCoordinates;
    return [patientCoordinate, safeZoneCenter].filter(Boolean) as MapCoordinate[];
  }, [patientCoordinate, routeCoordinates, safeZoneCenter]);

  const initialRegion = useMemo(() => buildRegionFromCoordinates(mapCoordinates), [mapCoordinates]);
  const canShowRoute = Boolean(patientCoordinate && safeZoneCenter);
  const canSendAlert = role === 'patient' && Boolean(patientId && userId);

  useEffect(() => {
    if (!safeZoneCenter || isInsideSafeArea === null) {
      setDeviating(false); setHomeSafe(true); return;
    }
    setDeviating(!isInsideSafeArea);
    setHomeSafe(isInsideSafeArea);
  }, [isInsideSafeArea, safeZoneCenter, setDeviating, setHomeSafe]);

  useEffect(() => {
    if (!canShowRoute) setShowHomeRoute(false);
  }, [canShowRoute]);

  useEffect(() => {
    if (!MapViewComponent || !mapRef.current || !isMapReady || !mapCoordinates.length) return undefined;
    const timer = setTimeout(() => {
      if (!mapRef.current) return;
      if (mapCoordinates.length === 1) {
        mapRef.current.animateToRegion(buildRegionFromCoordinates(mapCoordinates), 260);
        return;
      }
      mapRef.current.fitToCoordinates(mapCoordinates, {
        animated: true,
        edgePadding: { top: 100, right: 64, bottom: 280, left: 64 },
      });
    }, 140);
    return () => clearTimeout(timer);
  }, [isMapReady, mapCoordinates]);

  const handleFindHome = () => {
    if (!canShowRoute) return;
    setFeedback(null);
    setShowHomeRoute(true);
  };

  const handleAlertCaregiver = async () => {
    if (!canSendAlert || isSendingAlert) return;
    setIsSendingAlert(true);
    setFeedback(null);
    try {
      const patientName = patientRecord?.patientName || 'Patient';
      await savePatientAlert(patientId, userId, {
        type: 'help-request',
        requestedNeeds: ['assistance'],
        message: `${patientName} needs care assistance.`,
        safeZoneLabel: safeZoneRecord?.label ?? '',
        location: patientCoordinate,
      });
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addNotification({
        id: `patient-help-${Date.now()}`,
        time: nowTime,
        message: 'Caregiver notified.',
        type: 'warning',
      });
      setFeedback({ message: 'Your caregiver has been notified.', tone: 'success' });
    } catch (error) {
      setFeedback({ message: formatFirebaseError(error, 'Could not reach your caregiver right now.'), tone: 'error' });
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
            zoomTapEnabled
          >
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
            <Text style={styles.mapFallbackText}>Open the mobile build to view guidance.</Text>
          </View>
        )}
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        animateOnMount
        enableOverDrag={false}
        enablePanDownToClose={false}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Status chips row */}
          <View style={styles.statusRow}>
            <View style={[styles.chip, { backgroundColor: trackingState.backgroundColor }]}>
              <View style={[styles.chipDot, { backgroundColor: trackingState.color }]} />
              <Text style={[styles.chipText, { color: trackingState.color }]}>{trackingState.label}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: isInsideSafeArea === false ? COLORS.dangerSoft : COLORS.greenSoft }]}>
              <MaterialCommunityIcons
                color={isInsideSafeArea === false ? COLORS.danger : COLORS.green}
                name={isInsideSafeArea === false ? 'shield-alert' : 'shield-check'}
                size={13}
              />
              <Text style={[styles.chipText, { color: isInsideSafeArea === false ? COLORS.danger : COLORS.green }]}>
                {isInsideSafeArea === false ? 'Away from home' : 'Safe'}
              </Text>
            </View>
          </View>

          {/* Feedback */}
          {feedback ? (
            <View style={[styles.banner, feedback.tone === 'success' ? styles.bannerSuccess : styles.bannerError]}>
              <MaterialCommunityIcons
                color={feedback.tone === 'success' ? COLORS.green : COLORS.danger}
                name={feedback.tone === 'success' ? 'check-circle' : 'alert-circle'}
                size={17}
              />
              <Text style={[styles.bannerText, { color: feedback.tone === 'success' ? COLORS.green : COLORS.danger }]}>
                {feedback.message}
              </Text>
            </View>
          ) : null}

          {/* Two action buttons */}
          <View style={styles.btnRow}>
            <SheetButton
              activeOpacity={0.88}
              disabled={!canShowRoute || showHomeRoute}
              onPress={handleFindHome}
              style={[styles.btn, styles.btnPrimary, (!canShowRoute || showHomeRoute) && styles.dim]}
            >
              <MaterialCommunityIcons color={COLORS.white} name="navigation-variant" size={22} />
              <Text style={styles.btnTextPrimary}>
                {showHomeRoute ? 'Route Showing' : 'Find Home'}
              </Text>
            </SheetButton>

            <SheetButton
              activeOpacity={0.88}
              disabled={!canSendAlert || isSendingAlert}
              onPress={() => { void handleAlertCaregiver(); }}
              style={[styles.btn, styles.btnSecondary, (!canSendAlert || isSendingAlert) && styles.dim]}
            >
              {isSendingAlert
                ? <ActivityIndicator color={COLORS.orange} size="small" />
                : <MaterialCommunityIcons color={COLORS.orange} name="bell-ring" size={22} />
              }
              <Text style={styles.btnTextSecondary}>
                {isSendingAlert ? 'Call Care' : 'Call Care'}
              </Text>
            </SheetButton>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.mapBackdrop },
  mapLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.mapBackdrop },
  map: { flex: 1 },

  patientMarker: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.purple,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
  },
  homeMarker: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.green,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
  },

  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  mapFallbackTitle: { fontSize: 26, color: COLORS.title, fontFamily: Fonts.rounded, fontWeight: '800' },
  mapFallbackText: { fontSize: 15, color: COLORS.subtitle, lineHeight: 22, textAlign: 'center' },

  // Sheet
  sheetBg: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    shadowColor: COLORS.title, shadowOpacity: 0.06, shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 }, elevation: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: '#D8D8E2' },
  sheetContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 14 },

  // Status row
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipDot: { width: 7, height: 7, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },

  // Feedback
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  bannerSuccess: { backgroundColor: '#F4FBF6', borderColor: '#D5ECDB' },
  bannerError: { backgroundColor: '#FEF4F4', borderColor: '#F3D6D6' },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1, minHeight: 64, borderRadius: 22,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  btnPrimary: { backgroundColor: COLORS.blue },
  btnSecondary: { backgroundColor: COLORS.orangeSoft, borderWidth: 1, borderColor: '#F6D5BD' },
  btnTextPrimary: { color: COLORS.white, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  btnTextSecondary: { color: COLORS.orange, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  dim: { opacity: 0.45 },
});