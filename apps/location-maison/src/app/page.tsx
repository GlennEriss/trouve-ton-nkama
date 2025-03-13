import HomePage from "@/components/home-page/HomePage";
import Navbar from "@/components/home-page/Navbar";
import React from "react";


export default function Home() {
    return (
        <div className="bg-gray-100 dark:bg-gray-900">
            <Navbar/>
            <HomePage/>
        </div>)
        ;
}