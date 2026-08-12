import React from 'react'
import { Badge } from '@trouve-ton-nkama/ui/badge'
import { nameToColorHex } from '@/lib/generateColorFromName'

export default function Tag({name}: Readonly<{name: string}>) {
  const bgColor = nameToColorHex(name)
  return (
    <Badge className='text-nowrap' style={{ backgroundColor: bgColor }}>{name}</Badge>
  )
}
