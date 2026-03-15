import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import BottomSheet, {
  BottomSheetScrollView,
  TouchableOpacity as SheetButton,
} from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import {
  clearPatientSafeZone,
  savePatientSafeZone,
  subscribeToPatient,
  subscribeToPatientLocation,
  subscribeToPatientSafeZone,
} from '@/lib/firestore-data';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { useLinkedAccount } from '@/lib/use-linked-account';

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
  pink: '#D887A6',
  pinkSoft: '#FDF2F6',
  chip: '#F4F4F6',
  danger: '#E05C5C',
  dangerSoft: '#FDECEC',
  border: '#E7E7EF',
  mapBackdrop: '#EBF4FC',
};

const DEFAULT_REGION = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

const SAFE_ZONE_RADIUS_METERS = 50;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const MapViewComponent = NativeMaps?.default;
const MarkerComponent = NativeMaps?.Marker;
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

  if (!legacyVertices.length) return null;

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
      valid.length === 1 ? 0.002 : 0.006
    ),
    longitudeDelta: Math.max(
      (maxLongitude - minLongitude) * 1.8,
      valid.length === 1 ? 0.002 : 0.006
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

function formatDistance(distanceMeters?: number | null) {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return '--';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function areCoordinatesEqual(left?: MapCoordinate | null, right?: MapCoordinate | null) {
  if (!left || !right) return false;

  return (
    Math.abs(left.latitude - right.latitude) < 0.000001 &&
    Math.abs(left.longitude - right.longitude) < 0.000001
  );
}

export default function SafeZonesScreen() {
  const { patientId, userId } = useLinkedAccount();
  const { height: windowHeight } = useWindowDimensions();

  const [patientRecord, setPatientRecord] = useState<PatientRecord>(null);
  const [locationRecord, setLocationRecord] = useState<PatientLocationRecord>(null);
  const [safeZoneRecord, setSafeZoneRecord] = useState<SafeZoneRecord>(null);
  const [draftHomeCoordinate, setDraftHomeCoordinate] = useState<MapCoordinate | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSavingHomePin, setIsSavingHomePin] = useState(false);
  const [isClearingHomePin, setIsClearingHomePin] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  const mapRef = useRef<any>(null);
  const bottomSheetRef = useRef<any>(null);

  const snapPoints = useMemo(
    () => [
      Math.min(windowHeight * 0.26, 230),
      Math.min(windowHeight * 0.46, 430),
      Math.min(windowHeight * 0.72, 620),
    ],
    [windowHeight]
  );

  useEffect(() => {
    if (!patientId) return undefined;

    return subscribeToPatient(patientId, setPatientRecord, (error: any) => {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not load the linked patient.'));
    });
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return undefined;

    return subscribeToPatientLocation(patientId, setLocationRecord, (error: any) => {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not load the live location.'));
    });
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return undefined;

    return subscribeToPatientSafeZone(patientId, setSafeZoneRecord, (error: any) => {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not load the saved home pin.'));
    });
  }, [patientId]);

  const patientCoordinate = useMemo(() => toCoordinate(locationRecord), [locationRecord]);
  const safeZoneCenter = useMemo(() => getSafeZoneCenter(safeZoneRecord), [safeZoneRecord]);
  const effectiveHomeCoordinate = draftHomeCoordinate ?? safeZoneCenter;

  const distanceFromHome = useMemo(() => {
    if (!patientCoordinate || !safeZoneCenter) return null;
    return getDistanceInMeters(patientCoordinate, safeZoneCenter);
  }, [patientCoordinate, safeZoneCenter]);

  const isInsideSafeArea = useMemo(() => {
    if (!patientCoordinate || !safeZoneCenter) return null;
    return distanceFromHome != null && distanceFromHome <= SAFE_ZONE_RADIUS_METERS;
  }, [distanceFromHome, patientCoordinate, safeZoneCenter]);

  const mapCoordinates = useMemo(() => {
    return [patientCoordinate, effectiveHomeCoordinate].filter(Boolean) as MapCoordinate[];
  }, [effectiveHomeCoordinate, patientCoordinate]);

  const initialRegion = useMemo(
    () => buildRegionFromCoordinates(mapCoordinates),
    [mapCoordinates]
  );

  const hasUnsavedHomePin = Boolean(
    draftHomeCoordinate && !areCoordinatesEqual(draftHomeCoordinate, safeZoneCenter)
  );

  const summaryTitle = useMemo(() => {
    if (!safeZoneCenter && !draftHomeCoordinate) {
      return 'No home pin saved yet';
    }

    if (hasUnsavedHomePin) {
      return 'New home pin ready to save';
    }

    if (!patientCoordinate) {
      return 'Home pin saved';
    }

    return isInsideSafeArea === false
      ? 'Patient is outside the safe area'
      : 'Patient is inside the safe area';
  }, [draftHomeCoordinate, hasUnsavedHomePin, isInsideSafeArea, patientCoordinate, safeZoneCenter]);

  const summaryText = useMemo(() => {
    if (!safeZoneCenter && !draftHomeCoordinate) {
      return 'Tap the map to place a home pin. A fixed 50 meter safe area will be saved around it.';
    }

    if (hasUnsavedHomePin) {
      return 'Confirm this home pin to update the safe area centered around the patient’s house.';
    }

    if (!patientCoordinate) {
      return 'The home pin is saved. The app will compare the patient location to this home area when live location is available.';
    }

    if (isInsideSafeArea === false) {
      return 'The patient has moved beyond the saved home area.';
    }

    return 'The patient is currently within the saved home area.';
  }, [draftHomeCoordinate, hasUnsavedHomePin, isInsideSafeArea, patientCoordinate, safeZoneCenter]);

  const summaryTone = hasUnsavedHomePin
    ? 'info'
    : isInsideSafeArea === false
      ? 'danger'
      : 'success';

  const summaryStyles =
    summaryTone === 'danger'
      ? styles.summaryDanger
      : summaryTone === 'info'
        ? styles.summaryInfo
        : styles.summarySuccess;

  useEffect(() => {
    if (!MapViewComponent || !mapRef.current || !isMapReady || !mapCoordinates.length) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (mapCoordinates.length === 1) {
        mapRef.current.animateToRegion(buildRegionFromCoordinates(mapCoordinates), 260);
        return;
      }

      mapRef.current.fitToCoordinates(mapCoordinates, {
        animated: true,
        edgePadding: { top: 100, right: 64, bottom: 340, left: 64 },
      });
    }, 140);

    return () => clearTimeout(timer);
  }, [isMapReady, mapCoordinates]);

  const handleMapPress = (event: any) => {
    const nextCoordinate = event?.nativeEvent?.coordinate;

    if (!isValidCoordinate(nextCoordinate)) {
      return;
    }

    setDraftHomeCoordinate({
      latitude: Number(nextCoordinate.latitude),
      longitude: Number(nextCoordinate.longitude),
    });
    setStatusTone('success');
    setStatusMessage('Home pin placed. Tap Confirm Home Pin to save it.');
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleConfirmHomePin = async () => {
    if (!patientId || !userId || !draftHomeCoordinate) {
      return;
    }

    setIsSavingHomePin(true);
    try {
      await savePatientSafeZone(patientId, userId, {
        label: `${patientRecord?.patientName || 'Patient'} Home`,
        center: draftHomeCoordinate,
        radiusMeters: SAFE_ZONE_RADIUS_METERS,
      });
      setDraftHomeCoordinate(null);
      setStatusTone('success');
      setStatusMessage('Home pin saved for the safe area.');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not save the home pin.'));
    } finally {
      setIsSavingHomePin(false);
    }
  };

  const handleClearHomePin = async () => {
    if (!patientId) {
      return;
    }

    if (draftHomeCoordinate && !safeZoneCenter) {
      setDraftHomeCoordinate(null);
      setStatusTone('success');
      setStatusMessage('Draft home pin removed.');
      return;
    }

    setIsClearingHomePin(true);
    try {
      await clearPatientSafeZone(patientId);
      setDraftHomeCoordinate(null);
      setStatusTone('success');
      setStatusMessage('Saved home pin removed.');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(formatFirebaseError(error, 'Could not clear the home pin.'));
    } finally {
      setIsClearingHomePin(false);
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
            onMapPress={handleMapPress}
            onMapReady={() => setIsMapReady(true)}
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
            {patientCoordinate ? (
              <MarkerComponent coordinate={patientCoordinate}>
                <View style={styles.patientMarker}>
                  <FontAwesome6 color="#000000" name="person-dress" size={22} />
                </View>
              </MarkerComponent>
            ) : null}

            {effectiveHomeCoordinate ? (
              <MarkerComponent coordinate={effectiveHomeCoordinate}>
                <View
                  style={[
                    styles.homeMarker,
                    hasUnsavedHomePin && styles.homeMarkerDraft,
                  ]}
                >
                  <AntDesign color="#000000" name="home" size={22} />
                </View>
              </MarkerComponent>
            ) : null}
          </MapViewComponent>
        ) : (
          <View style={styles.mapFallback}>
            <MaterialCommunityIcons color={COLORS.blue} name="map-outline" size={64} />
            <Text style={styles.mapFallbackTitle}>Map unavailable</Text>
            <Text style={styles.mapFallbackText}>
              Open the mobile build to place the home pin and view live location.
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
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {patientRecord?.patientName || 'Patient'} Safe Zone
            </Text>
            <Text style={styles.sheetSubtitle}>
              Tap the map to place the home pin.
            </Text>
          </View>

          <View style={[styles.summaryCard, summaryStyles]}>
            <View style={styles.summaryIconWrap}>
              <MaterialCommunityIcons
                color={
                  summaryTone === 'danger'
                    ? COLORS.danger
                    : summaryTone === 'info'
                      ? COLORS.blue
                      : COLORS.green
                }
                name={
                  summaryTone === 'danger'
                    ? 'shield-alert'
                    : summaryTone === 'info'
                      ? 'map-marker-check'
                      : 'shield-check'
                }
                size={22}
              />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>{summaryTitle}</Text>
              <Text style={styles.summaryText}>{summaryText}</Text>
            </View>
          </View>

          {statusMessage ? (
            <View
              style={[
                styles.statusBanner,
                statusTone === 'error' ? styles.statusBannerError : styles.statusBannerSuccess,
              ]}
            >
              <MaterialCommunityIcons
                color={statusTone === 'error' ? COLORS.danger : COLORS.green}
                name={statusTone === 'error' ? 'alert-circle' : 'check-circle'}
                size={18}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusTone === 'error' ? COLORS.danger : COLORS.green },
                ]}
              >
                {statusMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.statRow}>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>Safe Area</Text>
              <Text style={styles.cardValue}>
                {safeZoneCenter
                  ? isInsideSafeArea === false
                    ? 'Outside'
                    : patientCoordinate
                      ? 'Inside'
                      : 'Saved'
                  : draftHomeCoordinate
                    ? 'Draft'
                    : 'Not Set'}
              </Text>
              <Text style={styles.cardHint}>50 meter radius around the home pin</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.eyebrow}>Distance</Text>
              <Text style={styles.cardValue}>{formatDistance(distanceFromHome)}</Text>
              <Text style={styles.cardHint}>From the saved home pin</Text>
            </View>
          </View>

          <View style={styles.block}>
            <SheetButton
              activeOpacity={0.88}
              disabled={!hasUnsavedHomePin || isSavingHomePin}
              onPress={handleConfirmHomePin}
              style={[
                styles.primaryActionButton,
                (!hasUnsavedHomePin || isSavingHomePin) && styles.opacityDim,
              ]}
            >
              <MaterialCommunityIcons color={COLORS.white} name="check-circle" size={22} />
              <Text style={styles.primaryActionText}>
                {isSavingHomePin ? 'Saving...' : 'Confirm Home Pin'}
              </Text>
            </SheetButton>

            <SheetButton
              activeOpacity={0.88}
              disabled={
                (!safeZoneCenter && !draftHomeCoordinate) || isClearingHomePin
              }
              onPress={handleClearHomePin}
              style={[
                styles.secondaryActionButton,
                (!safeZoneCenter && !draftHomeCoordinate || isClearingHomePin) &&
                  styles.opacityDim,
              ]}
            >
              <MaterialCommunityIcons color={COLORS.title} name="close-circle-outline" size={20} />
              <Text style={styles.secondaryActionText}>
                {isClearingHomePin ? 'Removing...' : 'Remove Home Pin'}
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.pink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },
  homeMarker: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.green,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },
  homeMarkerDraft: {
    borderColor: COLORS.orange,
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
    paddingTop: 10,
    paddingBottom: 40,
    gap: 18,
  },
  sheetHeader: {
    gap: 4,
  },
  sheetTitle: {
    fontSize: 26,
    color: COLORS.title,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtitle,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  summarySuccess: {
    backgroundColor: COLORS.greenSoft,
  },
  summaryDanger: {
    backgroundColor: COLORS.dangerSoft,
  },
  summaryInfo: {
    backgroundColor: COLORS.blueSoft,
  },
  summaryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.title,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtitle,
    fontWeight: '500',
  },
  statusBanner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBannerError: {
    backgroundColor: COLORS.dangerSoft,
  },
  statusBannerSuccess: {
    backgroundColor: COLORS.greenSoft,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 116,
    backgroundColor: COLORS.chip,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.subtitle,
  },
  cardValue: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
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
    gap: 12,
    paddingTop: 6,
  },
  primaryActionButton: {
    minHeight: 60,
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
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryActionText: {
    color: COLORS.title,
    fontSize: 16,
    fontWeight: '700',
  },
  opacityDim: {
    opacity: 0.45,
  },
});
