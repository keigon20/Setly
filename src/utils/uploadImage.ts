import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, storage, getStorageAppCheckToken, storageBucket } from './firebase';

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');
}

// Uses expo-file-system's native uploadAsync to bypass Hermes's Blob-from-ArrayBuffer
// limitation that breaks the Firebase JS SDK's uploadString/uploadBytes on New Architecture.
export async function uploadEventImage(localUri: string, userId: string): Promise<string> {
  const filename = `${Date.now()}.jpg`;
  const storagePath = `events/${userId}/${filename}`;

  const [idToken, appCheckToken] = await Promise.all([
    auth.currentUser?.getIdToken(),
    getStorageAppCheckToken(),
  ]);

  if (!idToken) throw new Error('Not authenticated');

  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'image/jpeg',
    'Authorization': `Firebase ${idToken}`,
  };
  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }

  const result = await uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status} ${result.body}`);
  }

  return getDownloadURL(ref(storage, storagePath));
}
