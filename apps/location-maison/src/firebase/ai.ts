import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app as firebaseApp } from '@/firebase/app';
import { setupFirebaseAppCheck } from '@/firebase/app-check';
import { resolveGeminiModel } from '@/lib/ai/gemini-model';

setupFirebaseAppCheck(firebaseApp);

const firebaseAIModel = resolveGeminiModel(
  process.env.NEXT_PUBLIC_FIREBASE_AI_MODEL,
  process.env.NEXT_PUBLIC_GEMINI_MODEL
);

export const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

export const model = getGenerativeModel(ai, { model: firebaseAIModel });
