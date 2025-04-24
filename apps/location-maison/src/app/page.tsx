import HomePage from "@/components/home-page/HomePage";
import Navbar from "@/components/home-page/Navbar";
import { auth } from "@/next-auth/auth";
import React from "react";


export default async function Home() {
    const session = await auth()
    return (
        <div className="bg-gray-100 dark:bg-gray-900">
            <head>
                <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2799688336707362"
                    crossOrigin="anonymous"></script>
            </head>
            <Navbar session={session} />
            <HomePage />
        </div>)
        ;
}