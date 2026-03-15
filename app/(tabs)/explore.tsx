import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import BottomSheet, { BottomSheetScrollView, TouchableOpacity as SheetButton } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { formatFirebaseError } from '@/lib/firebase-errors';
import { clearPatientSafeZone, savePatientSafeZone, subscribeToPatient, subscribeToPatientLocation, subscribeToPatientSafeZone } from '@/lib/firestore-data';
import { useLinkedAccount } from '@/lib/use-linked-account';

type MapCoordinate = { latitude: number; longitude: number };
type PatientRecord = { patientName?: string } | null;
type PatientLocationRecord = { latitude?: number; longitude?: number; accuracy?: number; updatedAtMs?: number; source?: string } | null;
type SafeZoneRecord = { label?: string; center?: MapCoordinate; radiusMeters?: number; vertices?: MapCoordinate[] } | null;
type FeedbackState = { message: string; tone: 'error' | 'success' } | null;

const COLORS = {
  background: '#FAFAFA',
  title: '#1A1A2E',
  subtitle: '#8A8A9E',
  white: '#FFFFFF',
  chip: '#F4F4F6',
  blue: '#4A90D9',
  blueSoft: '#EBF4FC',
  green: '#6DBF8A',
  greenSoft: '#ECF9F1',
  pink: '#D887A6',
  pinkSoft: '#FDF2F6',
  purple: '#B786F7',
  purpleSoft: '#F6EDFD',
  danger: '#E05C5C',
  dangerSoft: '#FDECEC',
  mapBackdrop: '#EBF4FC',
};

const SAFE_ZONE_RADIUS_METERS = 50;
const DEFAULT_REGION = { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 18, longitudeDelta: 18 };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const MapViewComponent = NativeMaps?.default;
const MarkerComponent = NativeMaps?.Marker;
const CircleComponent = NativeMaps?.Circle;
const GoogleMapProvider = NativeMaps?.PROVIDER_GOOGLE;

function isValidCoordinate(coordinate?: Partial<MapCoordinate> | null): coordinate is MapCoordinate {
  return Boolean(coordinate && Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude));
}

function toCoordinate(location: PatientLocationRecord) {
  if (!isValidCoordinate(location)) return null;
  return { latitude: Number(location.latitude), longitude: Number(location.longitude) };
}

function getSafeZoneCenter(safeZone: SafeZoneRecord) {
  if (isValidCoordinate(safeZone?.center)) {
    return { latitude: Number(safeZone.center.latitude), longitude: Number(safeZone.center.longitude) };
  }
  const legacyVertices = Array.isArray(safeZone?.vertices) ? safeZone.vertices.filter(isValidCoordinate) : [];
  if (!legacyVertices.length) return null;
  return {
    latitude: legacyVertices.reduce((sum, vertex) => sum + vertex.latitude, 0) / legacyVertices.length,
    longitude: legacyVertices.reduce((sum, vertex) => sum + vertex.longitude, 0) / legacyVertices.length,
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
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.9, valid.length === 1 ? 0.0022 : 0.006),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.9, valid.length === 1 ? 0.0022 : 0.006),
  };
}

function formatLocationAge(updatedAtMs?: number) {
  if (!updatedAtMs) return 'Waiting for signal';
  const elapsedMs = Date.now() - updatedAtMs;
  if (elapsedMs < 60000) return 'Just now';
  if (elapsedMs < 3600000) return `${Math.max(1, Math.round(elapsedMs / 60000))} min ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(updatedAtMs);
}

function getTrackingState(location: PatientLocationRecord) {
  if (!location?.updatedAtMs) return { label: 'Waiting', color: COLORS.pink, backgroundColor: COLORS.pinkSoft };
  return Date.now() - location.updatedAtMs <= 120000
    ? { label: 'Live', color: COLORS.green, backgroundColor: COLORS.greenSoft }
    : { label: 'Stale', color: COLORS.blue, backgroundColor: COLORS.blueSoft };
}

export default function SafeZonesScreen() {
  const { patientId, isProfileLoading, profileError, role, userId } = useLinkedAccount();
  const { height: windowHeight } = useWindowDimensions();
  const [patientRecord, setPatientRecord] = useState<PatientRecord>(null);
  const [locationRecord, setLocationRecord] = useState<PatientLocationRecord>(null);
  const [safeZoneRecord, setSafeZoneRecord] = useState<SafeZoneRecord>(null);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isSafeZoneLoading, setIsSafeZoneLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(1);
  const [isPlacingZone, setIsPlacingZone] = useState(false);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [isClearingZone, setIsClearingZone] = useState(false);
  const [draftZoneCenter, setDraftZoneCenter] = useState<MapCoordinate | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const mapRef = useRef<any>(null);
  const bottomSheetRef = useRef<any>(null);
  const snapPoints = useMemo(() => [Math.min(windowHeight * 0.26, 230), Math.min(windowHeight * 0.5, 430), Math.min(windowHeight * 0.8, 690)], [windowHeight]);

  useEffect(() => {
    if (!patientId) { setPatientRecord(null); setIsPatientLoading(false); return undefined; }
    setIsPatientLoading(true);
    return subscribeToPatient(patientId, (patient: PatientRecord) => { setPatientRecord(patient); setIsPatientLoading(false); }, (error: unknown) => { setFeedback({ message: formatFirebaseError(error, 'Could not load the linked patient.'), tone: 'error' }); setIsPatientLoading(false); });
  }, [patientId]);

  useEffect(() => {
    if (!patientId) { setLocationRecord(null); setIsLocationLoading(false); return undefined; }
    setIsLocationLoading(true);
    return subscribeToPatientLocation(patientId, (location: PatientLocationRecord) => { setLocationRecord(location); setIsLocationLoading(false); }, (error: unknown) => { setFeedback({ message: formatFirebaseError(error, 'Could not load the patient location.'), tone: 'error' }); setIsLocationLoading(false); });
  }, [patientId]);

  useEffect(() => {
    if (!patientId) { setSafeZoneRecord(null); setIsSafeZoneLoading(false); return undefined; }
    setIsSafeZoneLoading(true);
    return subscribeToPatientSafeZone(patientId, (safeZone: SafeZoneRecord) => { setSafeZoneRecord(safeZone); setIsSafeZoneLoading(false); }, (error: unknown) => { setFeedback({ message: formatFirebaseError(error, 'Could not load the safe zone.'), tone: 'error' }); setIsSafeZoneLoading(false); });
  }, [patientId]);

  const trackingState = useMemo(() => getTrackingState(locationRecord), [locationRecord]);
  const patientCoordinate = useMemo(() => toCoordinate(locationRecord), [locationRecord]);
  const savedZoneCenter = useMemo(() => getSafeZoneCenter(safeZoneRecord), [safeZoneRecord]);
  const activeZoneCenter = useMemo(() => (isPlacingZone ? draftZoneCenter : savedZoneCenter), [draftZoneCenter, isPlacingZone, savedZoneCenter]);
  const mapCoordinates = useMemo(() => [patientCoordinate, activeZoneCenter].filter(Boolean) as MapCoordinate[], [activeZoneCenter, patientCoordinate]);
  const currentSheetHeight = snapPoints[Math.max(sheetIndex, 0)] ?? snapPoints[1];
  const initialRegion = useMemo(() => buildRegionFromCoordinates(mapCoordinates), [mapCoordinates]);
  const patientAccuracyRadius = Math.max(Number(locationRecord?.accuracy ?? 0), 90);
  const zoneRadiusMeters = Math.max(Number(safeZoneRecord?.radiusMeters ?? SAFE_ZONE_RADIUS_METERS), 25);
  const canEditSafeZone = role === 'caregiver' && Boolean(patientId && userId);
  const hasSavedZone = Boolean(savedZoneCenter);
  const readyToSaveZone = Boolean(draftZoneCenter);
  const visibleMessage = feedback?.message || profileError;
  const visibleMessageTone = feedback?.message ? feedback.tone : 'error';

  useEffect(() => {
    if (!MapViewComponent || !mapRef.current || !isMapReady || !mapCoordinates.length) return undefined;
    const timer = setTimeout(() => {
      if (!mapRef.current) return;
      if (mapCoordinates.length === 1) { mapRef.current.animateToRegion(buildRegionFromCoordinates(mapCoordinates), 260); return; }
      mapRef.current.fitToCoordinates(mapCoordinates, { animated: true, edgePadding: { top: 90, right: 72, bottom: Math.round(currentSheetHeight) + 30, left: 72 } });
    }, 150);
    return () => clearTimeout(timer);
  }, [currentSheetHeight, isMapReady, mapCoordinates]);

  const handleMapPress = (event: { nativeEvent: { coordinate: MapCoordinate } }) => {
    if (!isPlacingZone) return;
    const nextCoordinate = event.nativeEvent.coordinate;
    if (!isValidCoordinate(nextCoordinate)) return;
    setFeedback(null);
    setDraftZoneCenter(nextCoordinate);
    bottomSheetRef.current?.snapToIndex(2);
  };

  const handleStartZonePlacement = () => {
    if (!canEditSafeZone) return;
    setFeedback(null);
    setDraftZoneCenter(null);
    setIsPlacingZone(true);
    bottomSheetRef.current?.snapToIndex(2);
  };

  const handleSaveZone = async () => {
    if (!patientId || !userId || !readyToSaveZone || isSavingZone) return;
    setIsSavingZone(true);
    try {
      await savePatientSafeZone(patientId, userId, { label: patientRecord?.patientName ? `${patientRecord.patientName}'s Home Pin` : 'Primary Safe Pin', center: draftZoneCenter, radiusMeters: zoneRadiusMeters });
      setDraftZoneCenter(null);
      setIsPlacingZone(false);
      setFeedback({ message: 'Patient home pin saved and synced.', tone: 'success' });
      bottomSheetRef.current?.snapToIndex(1);
    } catch (error) {
      setFeedback({ message: formatFirebaseError(error, 'Could not save the patient home pin.'), tone: 'error' });
    } finally {
      setIsSavingZone(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!isPlacingZone) { handleStartZonePlacement(); return; }
    if (!draftZoneCenter) { setFeedback({ message: 'Tap the map to place the safe-area pin first.', tone: 'error' }); return; }
    void handleSaveZone();
  };

  const handleCancelPlacement = () => {
    setDraftZoneCenter(null);
    setIsPlacingZone(false);
    setFeedback(null);
    bottomSheetRef.current?.snapToIndex(1);
  };

  const clearSavedZone = async () => {
    if (!patientId || isClearingZone) return;
    setIsClearingZone(true);
    try {
      await clearPatientSafeZone(patientId);
      setDraftZoneCenter(null);
      setIsPlacingZone(false);
      setFeedback({ message: 'Patient home pin removed.', tone: 'success' });
    } catch (error) {
      setFeedback({ message: formatFirebaseError(error, 'Could not remove the safe zone.'), tone: 'error' });
    } finally {
      setIsClearingZone(false);
    }
  };

  const confirmClearSavedZone = () => {
    Alert.alert('Remove home pin?', 'This removes the saved home pin for the linked patient.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void clearSavedZone(); } }]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.mapLayer}>
        {MapViewComponent && MarkerComponent ? (
          <MapViewComponent ref={mapRef} initialRegion={initialRegion} maxZoomLevel={21} minZoomLevel={2} onMapReady={() => setIsMapReady(true)} onPress={handleMapPress} pitchEnabled rotateEnabled scrollEnabled zoomEnabled zoomTapEnabled provider={GoogleMapProvider} style={styles.map}>
            {patientCoordinate && CircleComponent ? <CircleComponent center={patientCoordinate} fillColor={trackingState.backgroundColor} radius={patientAccuracyRadius} strokeColor={trackingState.color} strokeWidth={2} /> : null}
            {activeZoneCenter ? (
              <MarkerComponent coordinate={activeZoneCenter} title={isPlacingZone ? 'Home pin' : safeZoneRecord?.label || 'Home pin'}>
                <View style={[styles.mapMarker, styles.homeMarker]}>
                  <AntDesign color="#000000" name="home" size={24} />
                </View>
              </MarkerComponent>
            ) : null}
            {patientCoordinate ? (
              <MarkerComponent coordinate={patientCoordinate} title={patientRecord?.patientName || 'Patient'}>
                <View style={[styles.mapMarker, styles.patientMarker]}>
                  <FontAwesome6 color="#000000" name="person-dress" size={24} />
                </View>
              </MarkerComponent>
            ) : null}
          </MapViewComponent>
        ) : (
          <View style={styles.mapFallback}>
            <MaterialCommunityIcons color={COLORS.blue} name="map-outline" size={48} />
            <Text style={styles.mapFallbackTitle}>Map unavailable</Text>
            <Text style={styles.mapFallbackText}>Open the mobile build to view the live patient map and set a home pin.</Text>
          </View>
        )}
      </View>

      <BottomSheet ref={bottomSheetRef} index={1} snapPoints={snapPoints} animateOnMount enableOverDrag={false} backgroundStyle={styles.sheetBackground} handleIndicatorStyle={styles.handleIndicator} onChange={(index) => setSheetIndex(index < 0 ? 0 : index)}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.sheetTitle}>{patientRecord?.patientName ? `${patientRecord.patientName}'s Map` : 'Live Map'}</Text>
              <Text style={styles.sheetSubtitle}>Caregiver Safe Zones</Text>
            </View>
            <View style={styles.chipStack}>
              <View style={[styles.pillChip, { backgroundColor: trackingState.backgroundColor }]}>
                <View style={[styles.chipDot, { backgroundColor: trackingState.color }]} />
                <Text style={[styles.chipText, { color: trackingState.color }]}>{trackingState.label}</Text>
              </View>
            </View>
          </View>

          {visibleMessage ? (
            <View style={[styles.feedbackBanner, visibleMessageTone === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
              <MaterialCommunityIcons color={visibleMessageTone === 'success' ? COLORS.green : COLORS.danger} name={visibleMessageTone === 'success' ? 'check-circle' : 'alert-circle'} size={20} />
              <Text style={[styles.feedbackText, { color: visibleMessageTone === 'success' ? COLORS.green : COLORS.danger }]}>{visibleMessage}</Text>
            </View>
          ) : null}

          <View style={styles.statRow}>
            <View style={[styles.card, { backgroundColor: COLORS.blueSoft }]}>
              <Text style={[styles.eyebrow, { color: COLORS.blue }]}>Last Update</Text>
              <Text style={styles.cardValue}>{formatLocationAge(locationRecord?.updatedAtMs)}</Text>
              <Text style={styles.cardHint}>{locationRecord?.source || 'Waiting for the patient signal'}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: COLORS.purpleSoft }]}>
              <Text style={[styles.eyebrow, { color: COLORS.purple }]}>Home Pin</Text>
              <SheetButton activeOpacity={0.88} disabled={!canEditSafeZone || isSavingZone} onPress={handlePrimaryAction} style={[styles.actionButton, (!canEditSafeZone || isSavingZone) && styles.opacityDim]}>
                {isSavingZone ? <ActivityIndicator color={COLORS.white} size="small" /> : <><MaterialCommunityIcons color={COLORS.white} name={readyToSaveZone ? 'check-circle-outline' : 'map-marker-plus-outline'} size={18} /><Text style={styles.actionButtonText}>{readyToSaveZone ? 'Confirm' : 'Set Pin'}</Text></>}
              </SheetButton>
              <Text style={styles.cardHint}>{isPlacingZone ? 'Drop the pin on the map, then confirm.' : 'Place a home pin for the patient and sync it to Firebase.'}</Text>
            </View>
          </View>

          <View style={[styles.block, { backgroundColor: COLORS.greenSoft }]}>
            <View style={styles.blockHeader}>
              <Text style={[styles.blockTitle, { color: COLORS.green }]}>Home Pin</Text>
              {isSafeZoneLoading ? <ActivityIndicator color={COLORS.green} size="small" /> : null}
            </View>
            <Text style={styles.blockText}>{isPlacingZone ? (readyToSaveZone ? 'Pin ready. Tap Confirm to save the patient home pin.' : 'Tap the map once to drop the home pin.') : (hasSavedZone ? 'A home pin is saved for the patient.' : 'No patient home pin has been saved yet.')}</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Latitude</Text><Text style={styles.detailValue}>{activeZoneCenter ? activeZoneCenter.latitude.toFixed(6) : '--'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Longitude</Text><Text style={styles.detailValue}>{activeZoneCenter ? activeZoneCenter.longitude.toFixed(6) : '--'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Accuracy</Text><Text style={styles.detailValue}>{locationRecord?.accuracy ? `${Math.round(locationRecord.accuracy)} m` : 'Pending'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>{isPlacingZone ? (readyToSaveZone ? 'Ready to save' : 'Waiting for pin') : (hasSavedZone ? 'Saved' : 'Not set')}</Text></View>
            </View>
            {isPlacingZone ? <SheetButton activeOpacity={0.86} onPress={handleCancelPlacement} style={styles.ghostButton}><Text style={styles.ghostButtonText}>Cancel Placement</Text></SheetButton> : null}
            {!isPlacingZone && hasSavedZone && canEditSafeZone ? <SheetButton activeOpacity={0.86} disabled={isClearingZone} onPress={confirmClearSavedZone} style={[styles.ghostButton, isClearingZone && styles.opacityDim]}>{isClearingZone ? <ActivityIndicator color={COLORS.danger} size="small" /> : <Text style={styles.removeText}>Remove Home Pin</Text>}</SheetButton> : null}
          </View>

          <View style={[styles.block, { backgroundColor: COLORS.chip }]}>
            <Text style={styles.blockTitle}>Live Coordinates</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Latitude</Text><Text style={styles.detailValue}>{patientCoordinate ? patientCoordinate.latitude.toFixed(6) : '--'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Longitude</Text><Text style={styles.detailValue}>{patientCoordinate ? patientCoordinate.longitude.toFixed(6) : '--'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Source</Text><Text style={styles.detailValue}>{locationRecord?.source || 'Pending'}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Patient</Text><Text style={styles.detailValue}>{patientRecord?.patientName || 'Linked patient'}</Text></View>
            </View>
          </View>

          {(isProfileLoading || isPatientLoading || isLocationLoading) && !patientCoordinate ? <View style={styles.loadingRow}><ActivityIndicator color={COLORS.blue} /><Text style={styles.loadingText}>Loading tracking data...</Text></View> : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.mapBackdrop },
  mapLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.mapBackdrop },
  map: { flex: 1 },
  mapMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: COLORS.title,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  homeMarker: {
    borderColor: COLORS.green,
  },
  patientMarker: {
    borderColor: COLORS.purple,
  },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  mapFallbackTitle: { fontSize: 22, color: COLORS.title, fontWeight: '700', fontFamily: Fonts.rounded },
  mapFallbackText: { fontSize: 15, color: COLORS.subtitle, textAlign: 'center', lineHeight: 22 },
  sheetBackground: { backgroundColor: COLORS.white, borderTopLeftRadius: 40, borderTopRightRadius: 40, shadowColor: COLORS.title, shadowOpacity: 0.06, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 10 },
  handleIndicator: { width: 40, height: 4, borderRadius: 999, backgroundColor: '#D8D8E2' },
  sheetContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  sheetTitle: { fontSize: 22, color: COLORS.title, fontWeight: '700', fontFamily: Fonts.rounded, letterSpacing: -0.3 },
  sheetSubtitle: { fontSize: 13, color: COLORS.subtitle, marginTop: 1 },
  chipStack: { flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  pillChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipDot: { width: 7, height: 7, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
  feedbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: '#F4FBF6', borderColor: '#D5ECDB' },
  feedbackError: { backgroundColor: '#FEF4F4', borderColor: '#F3D6D6' },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 14 },
  card: { flex: 1, borderRadius: 24, padding: 16, minHeight: 132 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  cardValue: { marginTop: 8, fontSize: 22, lineHeight: 28, color: COLORS.title, fontFamily: Fonts.rounded, fontWeight: '800' },
  cardHint: { marginTop: 10, fontSize: 13, lineHeight: 18, color: COLORS.subtitle },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.purple, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, marginTop: 12 },
  actionButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800', fontFamily: Fonts.rounded },
  block: { borderRadius: 28, padding: 18, gap: 12 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  blockTitle: { fontSize: 18, lineHeight: 24, color: COLORS.title, fontWeight: '700', fontFamily: Fonts.rounded },
  blockText: { fontSize: 14, lineHeight: 20, color: COLORS.subtitle },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 },
  detailItem: { width: '50%', paddingHorizontal: 6 },
  detailLabel: { fontSize: 12, lineHeight: 16, color: COLORS.subtitle, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' },
  detailValue: { marginTop: 4, fontSize: 16, lineHeight: 20, color: COLORS.title, fontWeight: '700' },
  ghostButton: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#ECECF3' },
  ghostButtonText: { color: COLORS.title, fontWeight: '700' },
  removeText: { color: COLORS.danger, fontWeight: '700' },
  opacityDim: { opacity: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 10 },
  loadingText: { color: COLORS.subtitle, fontSize: 14, fontWeight: '600' },
});
