import { User } from "firebase/auth";
import { createModel } from "./generic.db";

export async function createUser(user: Partial<User>) {
    return await createModel<Partial<User>>(user)
}