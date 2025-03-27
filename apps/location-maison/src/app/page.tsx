import HomePage from "@/components/home-page/HomePage";
import Navbar from "@/components/home-page/Navbar";
import { auth } from "@/next-auth/auth";
import React from "react";


export default async function Home() {
    const session = await auth()
    return (
        <div className="bg-gray-100 dark:bg-gray-900">
            <Navbar session={session} />
            <HomePage />
        </div>)
        ;
}