import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export const useCurrentUser = () => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(session?.user || undefined);

  useEffect(() => {
    if (status === "authenticated") {
      setUser(session.user);
    }else{
      setUser(undefined);
    }
  }, [session, status]);

  return user;
};