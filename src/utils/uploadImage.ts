import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { File } from 'expo-file-system';
import { storage } from './firebase';

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');
}

export async function uploadEventImage(localUri: string, userId: string): Promise<string> {
  const buffer = await new File(localUri).arrayBuffer();
  const byteArray = new Uint8Array(buffer);

  const filename = `${Date.now()}.jpg`;
  const storageRef = ref(storage, `events/${userId}/${filename}`);

  await uploadBytes(storageRef, byteArray, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
