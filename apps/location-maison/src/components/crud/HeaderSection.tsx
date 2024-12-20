import React from 'react'
import LinkCrudComponent from './LinkCrudComponent'
import TitleCrudComponent from './TitleCrudComponent'
import CardChartCompnent from './CardChartCompnent'

export default function HeaderSection() {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <TitleCrudComponent />
                <LinkCrudComponent />
            </div>
            <CardChartCompnent />
        </div>
    )
}