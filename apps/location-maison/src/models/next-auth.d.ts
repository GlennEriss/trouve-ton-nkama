import { DefaultSession } from 'next-auth'
import { Account, User } from "@/types/models";
import {User as UserDetails} from '@/models/authentication'

declare module '@auth/core/types' {
    interface User extends UserDetails {}
    interface Session {
        user: User
    }
}

declare module '@auth/core/jwt' {
    interface JWT  {
        user: User
    }
}