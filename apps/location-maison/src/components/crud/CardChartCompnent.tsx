'use client'
import React from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { useCrudContext } from '@/providers/crud.provider'

export default function CardChartCompnent() {
    const { stats } = useCrudContext()
    return (
        <div className='grid grid-cols-3 gap-2 lg:flex lg:justify-end'>
            {
                stats.map((stat, key) => (
                    <CardChart
                        key={key}
                        title={stat.title}
                        total={stat.total}
                        color={stat.color}
                    />
                ))
            }
        </div>
    )
}

const CardChart = ({ title, total, color }: { title: string, total: number, color: string }) => {
    const getColor = () => {
        switch (color) {
            case 'green':
                return 'text-green-500'
            case 'orange':
                return 'text-orange-500'
            default:
                return 'text-red-500'
        }
    }
    return (
        <Card className='p-0 lg:w-[140px]'>
            <CardHeader className={`font-semibold text-sm p-2 ${getColor()}`}>
                {title}
            </CardHeader>
            <CardContent className='flex justify-center text-xl font-bold'>
                {total}
            </CardContent>

        </Card>
    )
}