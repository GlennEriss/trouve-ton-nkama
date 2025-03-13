'use server'
import { signIn } from "@/next-auth/auth"

export const signInWithGoogle = async () => {
    return await signIn('google')
}