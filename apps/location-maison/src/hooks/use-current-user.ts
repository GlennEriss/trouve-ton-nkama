import { auth } from "@/firebase/auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { signInWithCustomToken } from "firebase/auth";

export const useCurrentUser = () => {
  const { data: session, status, update } = useSession();
  const [user, setUser] = useState(session?.user || undefined);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser(session.user);

      const connectFirebase = async () => {
        const firebaseToken = (session.user as any).firebaseToken;

        if (!auth.currentUser) {
          try {
            let token = firebaseToken;

            if (!token && (session.user as any).uid) {
              const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/generate-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uid: (session.user as any).uid })
              });

              if (!response.ok) throw new Error('Erreur lors de la génération du token');

              const data = await response.json();
              token = data.token;
              update({
                ...session,
                user: {
                  ...session.user,
                  firebaseToken: token,
                }
              })
            }

            if (token) {
              await signInWithCustomToken(auth, token);
            }
          } catch (err) {
            console.error("Erreur Firebase Auth:", err);
          }
        }
      };

      connectFirebase();
    }

    if (status === "unauthenticated") {
      setUser(undefined);
    }
  }, [session, status]);

  return { user, setUser };
};