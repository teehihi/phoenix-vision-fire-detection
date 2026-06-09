import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
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

const defaultCameras: CameraRegistryItem[] = [
  { id: 'cam-lobby-a01', name: 'Sảnh A01', location: 'Tầng trệt', zone: 'Khu dân cư A', source: 'ip', streamUrl: '', enabled: true },
  { id: 'cam-corridor-02', name: 'Hành lang tầng 2', location: 'Tầng 2', zone: 'Khu dân cư A', source: 'rtsp', streamUrl: '', enabled: true },
  { id: 'cam-parking-b1', name: 'Bãi xe B1', location: 'Tầng hầm', zone: 'Khu kỹ thuật', source: 'rtsp', streamUrl: '', enabled: true },
  { id: 'cam-stairs-03', name: 'Cầu thang bộ', location: 'Tầng 3', zone: 'Lối thoát hiểm', source: 'ip', streamUrl: '', enabled: false }
];

export function useCameraRegistry() {
  const { user } = useAuth();
  const [cameras, setCameras] = useState<CameraRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCameraCollection = useCallback(() => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi quản lý camera.');
    }
    return collection(db, 'users', user.uid, 'cameras');
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCameras([]);
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};
    let active = true;

    async function initialize() {
      try {
        setLoading(true);
        const cameraCollection = collection(db, 'users', user!.uid, 'cameras');
        const snapshot = await getDocs(cameraCollection);

        if (snapshot.empty) {
          const storageKey = `phoenix_cameras_${user!.uid}`;
          const stored = localStorage.getItem(storageKey);
          const seed: CameraRegistryItem[] = stored ? JSON.parse(stored) : defaultCameras;
          const batch = writeBatch(db);
          seed.forEach((camera) => {
            batch.set(doc(cameraCollection, camera.id), {
              ...withoutId(camera),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          });
          await batch.commit();
          localStorage.removeItem(storageKey);
        }

        unsubscribe = onSnapshot(
          cameraCollection,
          (nextSnapshot) => {
            if (!active) return;
            const items = nextSnapshot.docs
              .map((cameraDoc) => ({ id: cameraDoc.id, ...cameraDoc.data() } as CameraRegistryItem))
              .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
            setCameras(items);
            setError(null);
            setLoading(false);
          },
          (snapshotError) => {
            if (!active) return;
            setError(snapshotError.message);
            setLoading(false);
          }
        );
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Lỗi tải danh sách camera.');
        setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  const createCamera = useCallback(async (input: CameraRegistryInput) => {
    const cameraReference = doc(getCameraCollection());
    await setDoc(cameraReference, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }, [getCameraCollection]);

  const updateCamera = useCallback(async (cameraId: string, input: CameraRegistryInput) => {
    await setDoc(
      doc(getCameraCollection(), cameraId),
      { ...input, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }, [getCameraCollection]);

  const deleteCamera = useCallback(async (cameraId: string) => {
    await deleteDoc(doc(getCameraCollection(), cameraId));
  }, [getCameraCollection]);

  const deleteCameras = useCallback(async (cameraIds: string[]) => {
    const batch = writeBatch(db);
    const cameraCollection = getCameraCollection();
    cameraIds.forEach((cameraId) => batch.delete(doc(cameraCollection, cameraId)));
    await batch.commit();
  }, [getCameraCollection]);

  const setCamerasEnabled = useCallback(async (cameraIds: string[], enabled: boolean) => {
    const batch = writeBatch(db);
    const cameraCollection = getCameraCollection();
    cameraIds.forEach((cameraId) => {
      batch.set(doc(cameraCollection, cameraId), { enabled, updatedAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }, [getCameraCollection]);

  return {
    cameras,
    loading,
    error,
    createCamera,
    updateCamera,
    deleteCamera,
    deleteCameras,
    setCamerasEnabled
  };
}

function withoutId(camera: CameraRegistryItem): CameraRegistryInput {
  const { id: _id, ...input } = camera;
  return input;
}
