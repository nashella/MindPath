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
      reject(new TypeError('Could not read the image file.'));
    };

    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadImageAtPath({ filePath, uri }) {
  const extensionMatch = String(uri ?? '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const fileExtension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
  const storageRef = ref(storage, filePath);
  const imageBlob = await uriToBlob(uri);

  try {
    await uploadBytes(storageRef, imageBlob, {
      contentType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
    });
  } finally {
    if (typeof imageBlob?.close === 'function') {
      imageBlob.close();
    }
  }

  const downloadUrl = await getDownloadURL(storageRef);

  return {
    imagePath: filePath,
    imageUrl: downloadUrl,
  };
}

export async function uploadMedicationPhoto({ patientId, userId, uri }) {
  const extensionMatch = String(uri ?? '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const fileExtension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
  const filePath = `patients/${patientId}/medications/${Date.now()}-${userId}.${fileExtension}`;

  return uploadImageAtPath({
    filePath,
    uri,
  });
}

export async function uploadMemoryPhoto({ patientId, userId, uri }) {
  const extensionMatch = String(uri ?? '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const fileExtension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
  const filePath = `patients/${patientId}/memories/${Date.now()}-${userId}.${fileExtension}`;

  return uploadImageAtPath({
    filePath,
    uri,
  });
}

export async function uploadCaregiverCheckInPhoto({ patientId, userId, uri }) {
  const extensionMatch = String(uri ?? '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const fileExtension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
  const filePath = `patients/${patientId}/checkins/${Date.now()}-${userId}.${fileExtension}`;

  return uploadImageAtPath({
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
