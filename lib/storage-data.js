import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { storage } from './firebase';

function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = function handleLoad() {
      resolve(xhr.response);
    };

    xhr.onerror = function handleError() {
      reject(new TypeError('Could not read the selected file.'));
    };

    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

function getFileExtension(uri, fallbackExtension) {
  const extensionMatch = String(uri ?? '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return extensionMatch?.[1]?.toLowerCase() ?? fallbackExtension;
}

function getImageContentType(fileExtension) {
  if (fileExtension === 'jpg') {
    return 'image/jpeg';
  }

  return `image/${fileExtension}`;
}

function getAudioContentType(fileExtension) {
  switch (fileExtension) {
    case 'aac':
      return 'audio/aac';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'caf':
      return 'audio/x-caf';
    case 'm4a':
    case 'mp4':
    default:
      return 'audio/mp4';
  }
}

async function uploadFileAtPath({ contentType, filePath, uri }) {
  const storageRef = ref(storage, filePath);
  const fileBlob = await uriToBlob(uri);

  try {
    await uploadBytes(storageRef, fileBlob, contentType ? { contentType } : undefined);
  } finally {
    if (typeof fileBlob?.close === 'function') {
      fileBlob.close();
    }
  }

  const downloadUrl = await getDownloadURL(storageRef);

  return {
    imagePath: filePath,
    imageUrl: downloadUrl,
  };
}

export async function uploadMedicationPhoto({ patientId, userId, uri }) {
  const fileExtension = getFileExtension(uri, 'jpg');
  const filePath = `patients/${patientId}/medications/${Date.now()}-${userId}.${fileExtension}`;

  return uploadFileAtPath({
    contentType: getImageContentType(fileExtension),
    filePath,
    uri,
  });
}

export async function uploadMemoryPhoto({ patientId, userId, uri }) {
  const fileExtension = getFileExtension(uri, 'jpg');
  const filePath = `patients/${patientId}/memories/${Date.now()}-${userId}.${fileExtension}`;

  return uploadFileAtPath({
    contentType: getImageContentType(fileExtension),
    filePath,
    uri,
  });
}

export async function uploadMemoryVoiceNote({ patientId, userId, uri }) {
  const fileExtension = getFileExtension(uri, 'm4a');
  const filePath = `patients/${patientId}/memories/${Date.now()}-${userId}-voice.${fileExtension}`;

  return uploadFileAtPath({
    contentType: getAudioContentType(fileExtension),
    filePath,
    uri,
  });
}

export async function uploadCaregiverCheckInPhoto({ patientId, userId, uri }) {
  const fileExtension = getFileExtension(uri, 'jpg');
  const filePath = `patients/${patientId}/checkins/${Date.now()}-${userId}.${fileExtension}`;

  return uploadFileAtPath({
    contentType: getImageContentType(fileExtension),
    filePath,
    uri,
  });
}

export async function uploadImportantPersonPhoto({ patientId, userId, uri }) {
  const fileExtension = getFileExtension(uri, 'jpg');
  const filePath = `patients/${patientId}/importantPeople/photos/${Date.now()}-${userId}.${fileExtension}`;

  return uploadFileAtPath({
    contentType: getImageContentType(fileExtension),
    filePath,
    uri,
  });
}

export async function uploadImportantPersonVoiceNote({ patientId, userId, uri }) {
  const fileExtension = getFileExtension(uri, 'm4a');
  const filePath = `patients/${patientId}/importantPeople/voiceNotes/${Date.now()}-${userId}.${fileExtension}`;

  return uploadFileAtPath({
    contentType: getAudioContentType(fileExtension),
    filePath,
    uri,
  });
}

export async function deleteStorageFile(filePath) {
  const normalizedPath = String(filePath ?? '').trim();

  if (!normalizedPath) {
    return;
  }

  await deleteObject(ref(storage, normalizedPath));
}
