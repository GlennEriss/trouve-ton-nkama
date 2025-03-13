import React from 'react'
import { Badge } from '../ui/badge'

export default function Tag({name}: {name: string}) {
  return (
    <Badge className='text-nowrap'>{name}</Badge>
  )
}
