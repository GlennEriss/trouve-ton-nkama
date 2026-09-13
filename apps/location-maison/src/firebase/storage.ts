import { getStorage } from 'firebase/storage';
import { app } from './app';

export const storage = getStorage(app);

export {
  ref,
  uploadBytes,
  uploadBytesResumable,
  deleteObject,
  getDownloadURL,
  updateMetadata
} from 'firebase/storage';
