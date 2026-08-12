'use client'
import { useWindowSize } from '@/hooks/useSize'
import React from 'react'
import { Skeleton } from '@trouve-ton-nkama/ui/skeleton'
import { RiHeart3Line } from 'react-icons/ri';
import { GoLocation } from 'react-icons/go';

export default function HouseDetailSkeleton() {
    const { width, height } = useWindowSize()
    if (width < 768) {
        return (
            <div className={`${height < 700 ? 'pb-20' : ''} px-4 py-6`}>
                <Skeleton className='h-[460px] md:h-[450px] rounded-2xl' />
                <div className='mt-6 flex gap-3 items-center'>
                    <Skeleton className='h-6 w-24 rounded-full' />
                    <Skeleton className='h-6 w-32 rounded-full' />
                    <Skeleton className='h-6 w-16 rounded-full' />
                    <div className="text-gray-300 ml-auto">
                        <RiHeart3Line size={32} className="animate-pulse" />
                    </div>
                </div>
                <div className='space-y-4 mt-6'>
                    <Skeleton className='h-4 w-3/4 rounded-full' />
                    <Skeleton className='h-7 w-1/2 rounded-full' />
                    <div className="flex items-center gap-3">
                        <GoLocation size={24} className='text-gray-300 animate-pulse' />
                        <Skeleton className='h-6 w-24 rounded-full' />
                        <Skeleton className='h-6 w-32 rounded-full' />
                        <Skeleton className='h-6 w-16 rounded-full' />
                    </div>
                    <div className='space-y-3 mt-2'>
                        <Skeleton className='h-4 w-5/6 rounded-full' />
                        <Skeleton className='h-4 w-4/6 rounded-full' />
                    </div>
                </div>
                <div className='h-[1px] bg-gray-200 my-8' />
                <div className='flex items-center'>
                    <Skeleton className='h-20 w-20 rounded-full' />
                    <div className='space-y-3 ml-4 flex-1'>
                        <Skeleton className='h-6 w-32 rounded-full' />
                        <Skeleton className='h-6 w-40 rounded-full' />
                    </div>
                    <div className='flex gap-3'>
                        <Skeleton className='h-14 w-14 rounded-xl' />
                        <Skeleton className='h-14 w-14 rounded-xl' />
                    </div>
                </div>
                <div className='h-[1px] bg-gray-200 my-8' />
            </div>
        )
    }
    return (
        <div className='container mx-auto px-4 py-8'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                <Skeleton className='h-[450px] rounded-2xl' />
                <Skeleton className='h-[450px] rounded-2xl' />
                <Skeleton className='h-[450px] rounded-2xl hidden lg:block' />
            </div>
            <div className='mt-8 flex gap-4 items-center'>
                <Skeleton className='h-7 w-28 rounded-full' />
                <Skeleton className='h-7 w-36 rounded-full' />
                <Skeleton className='h-7 w-20 rounded-full' />
                <div className="text-gray-300 ml-auto">
                    <RiHeart3Line size={36} className="animate-pulse" />
                </div>
            </div>
            <div className='space-y-5 mt-8'>
                <Skeleton className='h-5 w-2/3 rounded-full' />
                <Skeleton className='h-8 w-1/2 rounded-full' />
                <div className="flex items-center gap-4">
                    <GoLocation size={28} className='text-gray-300 animate-pulse' />
                    <Skeleton className='h-7 w-28 rounded-full' />
                    <Skeleton className='h-7 w-36 rounded-full' />
                    <Skeleton className='h-7 w-20 rounded-full' />
                </div>
                <div className='space-y-4 mt-4'>
                    <Skeleton className='h-5 w-3/4 rounded-full' />
                    <Skeleton className='h-5 w-2/3 rounded-full' />
                </div>
            </div>
            <div className='h-[1px] bg-gray-200 my-10' />
            <div className='flex items-center'>
                <Skeleton className='h-28 w-28 rounded-full' />
                <div className='space-y-4 ml-6 flex-1'>
                    <Skeleton className='h-7 w-40 rounded-full' />
                    <Skeleton className='h-7 w-48 rounded-full' />
                </div>
                <div className='flex gap-4'>
                    <Skeleton className='h-16 w-16 rounded-xl' />
                    <Skeleton className='h-16 w-16 rounded-xl' />
                </div>
            </div>
            <div className='h-[1px] bg-gray-200 my-10' />
        </div>
    )
}
