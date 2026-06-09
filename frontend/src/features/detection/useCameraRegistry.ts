import { useCallback, useEffect, useState } from 'react';
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

  const getStorageKey = useCallback(() => {
    return user ? `phoenix_cameras_${user.uid}` : '';
  }, [user]);

  const loadCameras = useCallback(() => {
    const key = getStorageKey();
    if (!key) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setCameras(JSON.parse(stored));
      } else {
        // Seed defaults
        localStorage.setItem(key, JSON.stringify(defaultCameras));
        setCameras(defaultCameras);
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi tải danh sách camera');
    } finally {
      setLoading(false);
    }
  }, [getStorageKey]);

  useEffect(() => {
    if (!user) {
      setCameras([]);
      setLoading(false);
      return;
    }
    loadCameras();
  }, [user, loadCameras]);

  const createCamera = useCallback(async (input: CameraRegistryInput) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi thêm camera.');
    }
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    const list: CameraRegistryItem[] = stored ? JSON.parse(stored) : [];
    const newCam: CameraRegistryItem = {
      ...input,
      id: 'cam-' + Math.random().toString(36).substring(2, 9)
    };
    list.push(newCam);
    localStorage.setItem(key, JSON.stringify(list));
    setCameras(list);
  }, [user, getStorageKey]);

  const updateCamera = useCallback(async (cameraId: string, input: CameraRegistryInput) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi sửa camera.');
    }
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    let list: CameraRegistryItem[] = stored ? JSON.parse(stored) : [];
    list = list.map(cam => cam.id === cameraId ? { ...cam, ...input } : cam);
    localStorage.setItem(key, JSON.stringify(list));
    setCameras(list);
  }, [user, getStorageKey]);

  const deleteCamera = useCallback(async (cameraId: string) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập trước khi xóa camera.');
    }
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    let list: CameraRegistryItem[] = stored ? JSON.parse(stored) : [];
    list = list.filter(cam => cam.id !== cameraId);
    localStorage.setItem(key, JSON.stringify(list));
    setCameras(list);
  }, [user, getStorageKey]);

  return {
    cameras,
    loading,
    error,
    createCamera,
    updateCamera,
    deleteCamera
  };
}
