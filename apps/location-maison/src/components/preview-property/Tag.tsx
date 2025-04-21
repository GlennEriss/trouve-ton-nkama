import React from 'react'
import { Badge } from '../ui/badge'
import { nameToColorHex } from '@/lib/generateColorFromName'

export default function Tag({name}: {name: string}) {
  const bgColor = nameToColorHex(name)
  return (
    <Badge className='text-nowrap' style={{ backgroundColor: bgColor }}>{name}</Badge>
  )
}
