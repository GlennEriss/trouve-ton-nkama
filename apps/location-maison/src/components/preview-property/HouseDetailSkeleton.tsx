'use client'
import { useWindowSize } from '@/hooks/useSize'
import React from 'react'
import { Skeleton } from '../ui/skeleton'
import { RiHeart3Line } from 'react-icons/ri';
import { GoLocation } from 'react-icons/go';

export default function HouseDetailSkeleton() {
    const { width, height } = useWindowSize()
    if (width < 768) {
        return (
            <div className={height < 700 ? 'pb-20' : ''}>
                <Skeleton className='h-[400px]' />
                <div className='mt-5 flex gap-3 items-center px-4'>
                    <Skeleton className='h-5 w-20' />
                    <Skeleton className='h-5 w-28' />
                    <Skeleton className='h-5 w-10' />
                    <div className="text-gray-300 ml-auto">
                        <RiHeart3Line size={40} className=" animate-pulse" />
                    </div>
                </div>
                <div className='px-4 space-y-2'>
                    <Skeleton className='h-3 w-44' />
                    <Skeleton className='h-6 w-36' />
                    <div className="flex items-center gap-2">
                        <GoLocation size={25} className='text-gray-300 animate-pulse' />
                        <Skeleton className='h-5 w-20' />
                        <Skeleton className='h-5 w-28' />
                        <Skeleton className='h-5 w-10' />
                    </div>
                    <div className='space-y-2'>
                        <Skeleton className='h-3 w-48' />
                        <Skeleton className='h-3 w-44' />
                    </div>
                </div>
                <Skeleton className='h-1 my-5 w-full' />
                <div className='flex px-4 items-center'>
                    <Skeleton className='h-24 w-24 rounded-full' />
                    <div className='space-y-3 ml-2'>
                        <Skeleton className='h-5 w-20' />
                        <Skeleton className='h-5 w-28' />
                    </div>
                    <div className='flex gap-2 ml-auto'>
                        <Skeleton className='h-16 w-16' />
                        <Skeleton className='h-16 w-16' />
                    </div>
                </div>
                <Skeleton className='h-1 my-5 w-full' />
            </div>
        )
    }
    return (
        <div>
            <div className='flex gap-2 items-center'>
                <Skeleton className='h-[400px] w-[500px]' />
                <Skeleton className='h-[400px] w-[500px]' />
                <Skeleton className='h-[400px] w-[500px] hidden lg:block' />
            </div>
            <div className='mt-5 flex gap-3 items-center px-4'>
                <Skeleton className='h-5 w-20' />
                <Skeleton className='h-5 w-28' />
                <Skeleton className='h-5 w-10' />
                <div className="text-gray-300 ml-auto">
                    <RiHeart3Line size={40} className=" animate-pulse" />
                </div>
            </div>
            <div className='px-4 space-y-2'>
                <Skeleton className='h-3 w-44' />
                <Skeleton className='h-6 w-36' />
                <div className="flex items-center gap-2">
                    <GoLocation size={25} className='text-gray-300 animate-pulse' />
                    <Skeleton className='h-5 w-20' />
                    <Skeleton className='h-5 w-28' />
                    <Skeleton className='h-5 w-10' />
                </div>
                <div className='space-y-2'>
                    <Skeleton className='h-3 w-48' />
                    <Skeleton className='h-3 w-44' />
                </div>
            </div>
            <Skeleton className='h-1 my-5 w-full' />
            <div className='flex px-4 items-center'>
                <Skeleton className='h-24 w-24 rounded-full' />
                <div className='space-y-3 ml-2'>
                    <Skeleton className='h-5 w-20' />
                    <Skeleton className='h-5 w-28' />
                </div>
                <div className='flex gap-2 ml-auto'>
                    <Skeleton className='h-16 w-16' />
                    <Skeleton className='h-16 w-16' />
                </div>
            </div>
            <Skeleton className='h-1 my-5 w-full' />
        </div>
    )
}
