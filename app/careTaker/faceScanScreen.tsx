// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// import { Image } from 'expo-image';
// import * as ImagePicker from 'expo-image-picker';
// import { useRouter } from 'expo-router';
// import React, { useMemo, useState } from 'react';
// import {
//   Alert,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';

// import { Fonts } from '@/constants/theme';

// import { usePatientContext } from './patient-context';
// import { PATIENT_COLORS } from './patient-theme';

// const FACE_VALIDATION_ORDER = [
//   {
//     id: 'deshawn',
//     name: 'Deshawn',
//     relation: 'Caregiver',
//   },
//   {
//     id: 'ashlae',
//     name: 'Ashlae',
//     relation: 'Family',
//   },
//   {
//     id: 'nurse-nashella',
//     name: 'Nurse Nashella',
//     relation: 'Nurse',
//   },
// ] as const;

// type FaceValidationTarget = (typeof FACE_VALIDATION_ORDER)[number];

// type SavedFaceScan = FaceValidationTarget & {
//   capturedAt: string;
//   imageUri: string;
// };

// function getFaceSortValue(faceId: string) {
//   return FACE_VALIDATION_ORDER.findIndex((target) => target.id === faceId);
// }

// function formatCaptureTime() {
//   return new Date().toLocaleTimeString([], {
//     hour: '2-digit',
//     minute: '2-digit',
//   });
// }

// export default function FaceScanScreen() {
//   const router = useRouter();
//   const { addNotification } = usePatientContext();
//   const [savedScans, setSavedScans] = useState<SavedFaceScan[]>([]);
//   const [scanResult, setScanResult] = useState('Ready to validate the first familiar face.');
//   const [isScanning, setIsScanning] = useState(false);

//   const nextTarget = useMemo(
//     () =>
//       FACE_VALIDATION_ORDER.find(
//         (target) => !savedScans.some((savedScan) => savedScan.id === target.id)
//       ) ?? null,
//     [savedScans]
//   );

//   const handleScan = async () => {
//     if (!nextTarget) {
//       setScanResult('All three face photos are already validated. Remove one to scan again.');
//       return;
//     }

//     try {
//       setIsScanning(true);
//       const permissionResponse = await ImagePicker.requestCameraPermissionsAsync();

//       if (!permissionResponse.granted) {
//         setScanResult('Camera permission is required to validate a familiar face.');
//         return;
//       }

//       const result = await ImagePicker.launchCameraAsync({
//         allowsEditing: true,
//         aspect: [3, 4],
//         cameraType: ImagePicker.CameraType.front,
//         quality: 0.7,
//       });

//       if (result.canceled || !result.assets?.[0]?.uri) {
//         setScanResult('Face scan canceled before a photo was saved.');
//         return;
//       }

//       const capturedPhoto: SavedFaceScan = {
//         ...nextTarget,
//         capturedAt: formatCaptureTime(),
//         imageUri: result.assets[0].uri,
//       };

//       setSavedScans((currentScans) =>
//         [...currentScans.filter((scan) => scan.id !== nextTarget.id), capturedPhoto].sort(
//           (leftScan, rightScan) => getFaceSortValue(leftScan.id) - getFaceSortValue(rightScan.id)
//         )
//       );

//       setScanResult(`${nextTarget.name} validated as ${nextTarget.relation}.`);
//       addNotification({
//         id: `${Date.now()}-face`,
//         time: formatCaptureTime(),
//         message: `${nextTarget.name} was validated from a face scan photo.`,
//         type: 'success',
//       });
//     } catch {
//       setScanResult('The camera could not finish the face scan. Please try again.');
//     } finally {
//       setIsScanning(false);
//     }
//   };

//   const handleDelete = (target: FaceValidationTarget) => {
//     Alert.alert(
//       'Delete face photo?',
//       `Remove ${target.name}'s validated photo so it can be captured again?`,
//       [
//         {
//           text: 'Cancel',
//           style: 'cancel',
//         },
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: () => {
//             setSavedScans((currentScans) =>
//               currentScans.filter((savedScan) => savedScan.id !== target.id)
//             );
//             setScanResult(`${target.name}'s saved face photo was removed.`);
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <SafeAreaView style={styles.safeArea} edges={['top']}>
//       <View style={styles.container}>
//         <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
//           <View style={styles.header}>
//             <Pressable accessibilityRole="button" onPress={() => router.push('/patient')}>
//               <MaterialCommunityIcons color={PATIENT_COLORS.blue} name="arrow-left" size={24} />
//             </Pressable>
//             <Text style={styles.headerTitle}>Face Scan</Text>
//           </View>

//           <View style={styles.scanCard}>
//             <View style={styles.scanFrame}>
//               <MaterialCommunityIcons
//                 color={PATIENT_COLORS.blue}
//                 name="camera-account"
//                 size={84}
//               />
//             </View>

//             <Text style={styles.scanTitle}>Start a face scan</Text>




//             <Pressable
//               accessibilityRole="button"
//               disabled={isScanning}
//               onPress={handleScan}
//               style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}>
//               <MaterialCommunityIcons color="#FFFFFF" name="camera-outline" size={22} />
//               <Text style={styles.scanButtonText}>
//                 {isScanning ? 'Opening Camera...' : 'Start Face Scan'}
//               </Text>
//             </Pressable>
//           </View>

//           <View style={styles.resultCard}>
//             <Text style={styles.resultLabel}>Latest result</Text>
//             <Text style={styles.resultText}>{scanResult}</Text>
//             <Text style={styles.resultHint}>
//               {nextTarget
//                 ? `Next validation target: ${nextTarget.name}`
//                 : 'All required face photos have been validated.'}
//             </Text>
//           </View>

//           <Text style={styles.sectionTitle}>Validated photos</Text>
//           <View style={styles.faceList}>
//             {FACE_VALIDATION_ORDER.map((target) => {
//               const savedScan = savedScans.find((scan) => scan.id === target.id);

//               return (
//                 <View key={target.id} style={styles.faceCard}>
//                   <View style={styles.facePreview}>
//                     {savedScan ? (
//                       <Image contentFit="cover" source={savedScan.imageUri} style={styles.faceImage} />
//                     ) : (
//                       <MaterialCommunityIcons
//                         color={PATIENT_COLORS.blue}
//                         name="account-outline"
//                         size={42}
//                       />
//                     )}
//                   </View>

//                   <View style={styles.faceCopy}>
//                     <Text style={styles.faceName}>{target.name}</Text>
//                     <Text style={styles.faceMeta}>{target.relation}</Text>
//                     <Text style={styles.faceStatus}>
//                       {savedScan
//                         ? `Validated at ${savedScan.capturedAt}`
//                         : 'Waiting for photo capture'}
//                     </Text>
//                   </View>

//                   {savedScan ? (
//                     <Pressable
//                       accessibilityLabel={`Delete ${target.name} face photo`}
//                       accessibilityRole="button"
//                       onPress={() => handleDelete(target)}
//                       style={styles.deleteButton}>
//                       <MaterialCommunityIcons color={PATIENT_COLORS.textPrimary} name="close" size={20} />
//                     </Pressable>
//                   ) : (
//                     <View style={styles.pendingBadge}>
//                       <Text style={styles.pendingBadgeText}>
//                         {nextTarget?.id === target.id ? 'Next' : 'Pending'}
//                       </Text>
//                     </View>
//                   )}
//                 </View>
//               );
//             })}
//           </View>
//         </ScrollView>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: PATIENT_COLORS.background,
//   },
//   container: {
//     flex: 1,
//     backgroundColor: PATIENT_COLORS.background,
//   },
//   content: {
//     paddingHorizontal: 24,
//     paddingTop: 8,
//     paddingBottom: 28,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     marginBottom: 20,
//   },
//   headerTitle: {
//     fontSize: 28,
//     lineHeight: 34,
//     color: PATIENT_COLORS.textPrimary,
//     fontWeight: '800',
//     fontFamily: Fonts.rounded,
//   },
//   scanCard: {
//     backgroundColor: PATIENT_COLORS.surface,
//     borderRadius: 24,
//     borderWidth: 1,
//     borderColor: PATIENT_COLORS.border,
//     padding: 20,
//     alignItems: 'center',
//     marginBottom: 18,
//   },
//   scanFrame: {
//     width: 164,
//     height: 164,
//     borderRadius: 40,
//     borderWidth: 3,
//     borderColor: '#BFD8F2',
//     backgroundColor: PATIENT_COLORS.blueSoft,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 16,
//   },
//   scanTitle: {
//     fontSize: 24,
//     lineHeight: 30,
//     color: PATIENT_COLORS.textPrimary,
//     fontWeight: '800',
//     fontFamily: Fonts.rounded,
//     textAlign: 'center',
//   },
//   scanSubtitle: {
//     marginTop: 8,
//     fontSize: 15,
//     lineHeight: 22,
//     color: PATIENT_COLORS.textSecondary,
//     fontWeight: '500',
//     textAlign: 'center',
//   },
//   orderRow: {
//     width: '100%',
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//     justifyContent: 'center',
//     marginTop: 18,
//   },
//   orderChip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     borderRadius: 999,
//     backgroundColor: '#F7F7FB',
//     borderWidth: 1,
//     borderColor: PATIENT_COLORS.border,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   orderChipCompleted: {
//     backgroundColor: '#E8F7F0',
//     borderColor: '#B8E3CC',
//   },
//   orderNumber: {
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     overflow: 'hidden',
//     textAlign: 'center',
//     textAlignVertical: 'center',
//     fontSize: 12,
//     lineHeight: 22,
//     color: PATIENT_COLORS.blue,
//     fontWeight: '800',
//     backgroundColor: PATIENT_COLORS.blueSoft,
//   },
//   orderNumberCompleted: {
//     color: '#0E7A4E',
//     backgroundColor: '#D7F2E3',
//   },
//   orderLabel: {
//     fontSize: 13,
//     lineHeight: 18,
//     color: PATIENT_COLORS.textPrimary,
//     fontWeight: '700',
//   },
//   orderLabelCompleted: {
//     color: '#0E7A4E',
//   },
//   scanButton: {
//     minHeight: 58,
//     borderRadius: 18,
//     backgroundColor: PATIENT_COLORS.blue,
//     paddingHorizontal: 20,
//     marginTop: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//   },
//   scanButtonDisabled: {
//     opacity: 0.7,
//   },
//   scanButtonText: {
//     fontSize: 16,
//     lineHeight: 22,
//     color: '#FFFFFF',
//     fontWeight: '800',
//   },
//   resultCard: {
//     backgroundColor: PATIENT_COLORS.surface,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: PATIENT_COLORS.border,
//     padding: 18,
//     marginBottom: 18,
//   },
//   resultLabel: {
//     fontSize: 13,
//     lineHeight: 18,
//     color: PATIENT_COLORS.textSecondary,
//     fontWeight: '700',
//   },
//   resultText: {
//     marginTop: 8,
//     fontSize: 16,
//     lineHeight: 22,
//     color: PATIENT_COLORS.textPrimary,
//     fontWeight: '700',
//   },
//   resultHint: {
//     marginTop: 10,
//     fontSize: 13,
//     lineHeight: 18,
//     color: PATIENT_COLORS.textSecondary,
//     fontWeight: '600',
//   },
//   sectionTitle: {
//     fontSize: 20,
//     lineHeight: 26,
//     color: PATIENT_COLORS.textPrimary,
//     fontWeight: '800',
//     fontFamily: Fonts.rounded,
//     marginBottom: 12,
//   },
//   faceList: {
//     gap: 12,
//   },
//   faceCard: {
//     backgroundColor: PATIENT_COLORS.surface,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: PATIENT_COLORS.border,
//     padding: 14,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 14,
//   },
//   facePreview: {
//     width: 74,
//     height: 92,
//     borderRadius: 20,
//     backgroundColor: PATIENT_COLORS.blueSoft,
//     overflow: 'hidden',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   faceImage: {
//     width: '100%',
//     height: '100%',
//   },
//   faceCopy: {
//     flex: 1,
//     gap: 4,
//   },
//   faceName: {
//     fontSize: 16,
//     lineHeight: 22,
//     color: PATIENT_COLORS.textPrimary,
//     fontWeight: '800',
//   },
//   faceMeta: {
//     fontSize: 14,
//     lineHeight: 20,
//     color: PATIENT_COLORS.textSecondary,
//     fontWeight: '600',
//   },
//   faceStatus: {
//     fontSize: 13,
//     lineHeight: 18,
//     color: PATIENT_COLORS.textSecondary,
//     fontWeight: '500',
//   },
//   deleteButton: {
//     width: 34,
//     height: 34,
//     borderRadius: 17,
//     backgroundColor: '#F3F5F7',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   pendingBadge: {
//     borderRadius: 999,
//     backgroundColor: '#F7F7FB',
//     borderWidth: 1,
//     borderColor: PATIENT_COLORS.border,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//   },
//   pendingBadgeText: {
//     fontSize: 12,
//     lineHeight: 16,
//     color: PATIENT_COLORS.textSecondary,
//     fontWeight: '700',
//   },
// });
