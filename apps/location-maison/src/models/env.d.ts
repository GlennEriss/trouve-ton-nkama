namespace NodeJS {
    interface ProcessEnv extends NodeJS.ProcessEnv {
        //GOOGLE
        GOOGLE_CLIENT_ID: string
        GOOGLE_CLIENT_SECRET: string
        GOOGLE_REFRESH_TOKEN: string
        GOOGLE_EMAIL: string
        GMAIL_USER: string
        //NEXT_AUTH
        NEXTAUTH_SECRET: string;
        //FIREBASE
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
        NEXT_PUBLIC_FIREBASE_API_KEY: string;
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
        NEXT_PUBLIC_FIREBASE_APP_ID: string;
        NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY: string
        NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: string;
        NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: string;
        //HOST_URL
        NEXT_PUBLIC_HOST: string;
     }
}