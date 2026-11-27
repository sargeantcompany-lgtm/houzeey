import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export type Photo = { uri: string; name: string; type: string };
export type Video = { uri: string; type: string; size: number };

export const MAX_PHOTOS = 20;
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
const VIDEO_TYPES: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm' };

function askForSettings(what: string) {
  Alert.alert(`Allow ${what}`, `Houzeey needs access to your ${what} for this. You can turn it on in Settings.`, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

// Photos are always saved as JPEG so the server accepts them (iPhone HEIC is converted).
function toPhoto(a: ImagePicker.ImagePickerAsset, i: number): Photo {
  return { uri: a.uri, name: `photo-${Date.now()}-${i}.jpg`, type: 'image/jpeg' };
}

const photoOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export async function pickPhotos(limit: number): Promise<Photo[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ ...photoOptions, allowsMultipleSelection: true, selectionLimit: limit, orderedSelection: true });
  return res.canceled ? [] : res.assets.slice(0, limit).map(toPhoto);
}

export async function takePhoto(front = false): Promise<Photo | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    askForSettings('camera');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({ ...photoOptions, cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back });
  return res.canceled ? null : toPhoto(res.assets[0], 0);
}

function toVideo(a: ImagePicker.ImagePickerAsset): Video | string {
  const ext = (a.fileName || a.uri).split('.').pop()?.toLowerCase() || '';
  const type = a.mimeType && Object.values(VIDEO_TYPES).includes(a.mimeType) ? a.mimeType : VIDEO_TYPES[ext];
  if (!type) return 'Choose an MP4 or MOV video.';
  const size = a.fileSize || new File(a.uri).size || 0;
  if (size > MAX_VIDEO_BYTES) return 'That video is over 512 MB. Choose a shorter clip (under 2 minutes is ideal).';
  return { uri: a.uri, type, size };
}

export async function pickVideo(): Promise<Video | string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 180 });
  return res.canceled ? null : toVideo(res.assets[0]);
}

export async function recordVideo(): Promise<Video | string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    askForSettings('camera');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 120, videoQuality: ImagePicker.UIImagePickerControllerQualityType.High });
  return res.canceled ? null : toVideo(res.assets[0]);
}

// Sends the video straight to storage (never through our server), with progress 0-100.
export async function uploadVideo(video: Video, url: string, headers: Record<string, string>, onProgress: (pct: number) => void) {
  const task = new File(video.uri).createUploadTask(url, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': video.type, ...headers },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress(Math.round((bytesSent / totalBytes) * 100));
    },
  });
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Video upload failed (${result?.status ?? 'no response'}). Please try again.`);
  }
}

// Phones: React Native's FormData takes { uri, name, type }. Browser preview: a real Blob.
export async function appendFile(form: FormData, field: string, file: Photo) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name.replace(/.jpg$/, blob.type === 'image/png' ? '.png' : '.jpg'));
    return;
  }
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
}
