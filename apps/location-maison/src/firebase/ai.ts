import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app as firebaseApp } from '@/firebase/app';

export const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

export const model = getGenerativeModel(ai, { model: "gemini-2.0-flash" });
