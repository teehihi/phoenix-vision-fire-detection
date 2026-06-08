import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';

export type CameraSource = 'webcam' | 'rtsp' | 'ip';

export type CameraRegistryItem = {
  id: string;
  name: string;
  location: string;
  zone: string;
  source: CameraSource;
  streamUrl: string;
  enabled: boolean;
};

export type CameraRegistryInput = Omit<CameraRegistryItem, 'id'>;

const defaultCameras: Array<CameraRegistryInput & { id: string }> = [
  {
    id: 'cam-lobby-a01',
    name: 'Sảnh A01',
    location: 'Tầng trệt',
    zone: 'Khu dân cư A',
    source: 'ip',
    streamUrl: '',
    enabled: true
  },
  {
    id: 'cam-corridor-02',
    name: 'Hành lang tầng 2',
    location: 'Tầng 2',
    zone: 'Khu dân cư A',
    source: 'rtsp',
    streamUrl: '',
    enabled: true
  },
  {
    id: 'cam-parking-b1',
    name: 'Bãi xe B1',
    location: 'Tầng hầm',
    zone: 'Khu kỹ thuật',
    source: 'rtsp',
    streamUrl: '',
    enabled: true
  },
  {
    id: 'cam-stairs-03',
    name: 'Cầu thang bộ',
    location: 'Tầng 3',
    zone: 'Lối thoát hiểm',
    source: 'ip',
    streamUrl: '',
    enabled: false
  }
];

export function useCameraRegistry() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<CameraRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCameras([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const camerasCollection = collection(db, 'users', user.uid, 'cameras');
    const cameraQuery = query(camerasCollection, orderBy('createdAt', 'asc'));

    return onSnapshot(
      cameraQuery,
      (snapshot) => {
        const items = snapshot.docs.map((cameraDoc) => {
          const data = cameraDoc.data() as Omit<CameraRegistryItem, 'id'>;
          return {
            id: cameraDoc.id,
            name: data.name,
            location: data.location,
            zone: data.zone,
            source: data.source,
            streamUrl: data.streamUrl ?? '',
            enabled: data.enabled ?? true
          };
        });

        setCameras(items);
        setLoading(false);
        setError(null);

        if (snapshot.empty) {
          seedDefaultCameras(user.uid).catch(() => setError('Không thể tạo dữ liệu camera mặc định trên Firestore.'));
        }
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );
  }, [user]);

  const createCamera = useCallback(async (input: CameraRegistryInput) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi thêm camera.');
    }
    const camerasCollection = collection(db, 'users', user.uid, 'cameras');
    await addDoc(camerasCollection, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }, [user]);

  const updateCamera = useCallback(async (cameraId: string, input: CameraRegistryInput) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi sửa camera.');
    }
    await updateDoc(doc(db, 'users', user.uid, 'cameras', cameraId), {
      ...input,
      updatedAt: serverTimestamp()
    });
  }, [user]);

  const deleteCamera = useCallback(async (cameraId: string) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi xóa camera.');
    }
    await deleteDoc(doc(db, 'users', user.uid, 'cameras', cameraId));
  }, [user]);

  return {
    cameras,
    loading,
    error,
    createCamera,
    updateCamera,
    deleteCamera
  };
}

async function seedDefaultCameras(userId: string) {
  await Promise.all(
    defaultCameras.map((camera) =>
      setDoc(doc(db, 'users', userId, 'cameras', camera.id), {
        name: camera.name,
        location: camera.location,
        zone: camera.zone,
        source: camera.source,
        streamUrl: camera.streamUrl,
        enabled: camera.enabled,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    )
  );
}
