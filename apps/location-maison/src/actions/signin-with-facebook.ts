'use server'

import { signIn } from "@/next-auth/auth"

export const signInWithFacebook = async () => {
    return await signIn("facebook")
}