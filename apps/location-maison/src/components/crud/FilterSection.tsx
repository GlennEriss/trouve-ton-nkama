'use client'
import React, { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { AiFillFilter, AiOutlineFilter } from 'react-icons/ai'
import { FiFilter } from 'react-icons/fi'
import { StateCreation } from '@/models/creation'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { useCrudContext } from '@/providers/crud.provider'

export default function FilterSection({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <FilterMobile children={children} />
            <FilterDesktop children={children} />
        </div>
    )
}

export const FilterMobile = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = React.useState(false)
    return (
        <Popover open={isOpen}>
            <PopoverTrigger asChild className='xl:hidden'>
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    variant='ghost'
                    className='flex gap-1 justify-start text-[#1B4D5B] hover:text-[#1B4D5B]'
                >
                    {
                        isOpen ? (
                            <AiFillFilter size={25} />
                        ) : (
                            <AiOutlineFilter size={25} />
                        )
                    }
                    <span className='text-xl font-bold'>Filtres</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent>
                <FilterList />
                {children}
            </PopoverContent>
        </Popover>
    )
}

export const FilterDesktop = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className='hidden xl:flex'>
            <div className="flex gap-2 items-center">
                <FiFilter size={22} className='text-[#1B4D5B]' />
                <span className='text-xl font-bold text-[#1B4D5B]'>Filtres</span>
            </div>
            <FilterList />
            {children}
        </div>
    )
}

const filters = [
    {
        title: 'Publiée',
        state: 'IN_PROGRESS' as StateCreation
    },
    {
        title: 'Archivée',
        state: 'ARCHIVED' as StateCreation
    }
]
const FilterList = () => {
    const { filterCrud, setFilterCrud, setFilterDate } = useCrudContext()
    const handleFilter = (state: StateCreation) => {
        if (filterCrud.includes(state)) {
            setFilterCrud(filterCrud.filter(item => item !== state))
        } else {
            setFilterCrud([...filterCrud, state])
        }
    }
    return (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:ml-auto xl:gap-2">
            <div className='flex flex-col gap-2 xl:flex-row xl:items-center xl:border xl:rounded-lg xl:px-2 xl:gap-1 xl:border-[#1B4D5B]'>
                <Label htmlFor='date' className='text-nowrap text-sm xl:text-md'>A partir de</Label>
                <Input
                    id='date'
                    type='date'
                    onChange={e => setFilterDate(e.target.value)}
                    className='border-[#1B4D5B] xl:border-none xl:focus-visible:ring-0'
                />
            </div>
            {
                filters.map((filter, key) => (
                    <FilterButton
                        key={key}
                        title={filter.title}
                        state={filter.state}
                        handleFilter={handleFilter}
                    />
                ))
            }
        </div>
    )
}

export const FilterButton = ({ title, handleFilter, state, icon }: { title: string, handleFilter: (state: any) => void, state: any, icon?: any }) => {
    const [actived, setActived] = React.useState(state === 'InProgress')
    return (
        <div className={`flex flex-col gap-3`}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        className={`border-[#1B4D5B] text-[#1B4D5B] ${actived ? 'bg-[#1B4D5B] hover:bg-[#1B4D5B] hover:text-white text-white' : 'bg-white'}`}
                        onClick={() => {
                            handleFilter(state)
                            setActived(!actived)
                        }}
                        variant='outline'
                        type='button'>
                        {
                            icon ? (
                                <React.Fragment>
                                    <span className='xl:hidden'>
                                        {title}
                                    </span>
                                    <span className='hidden xl:block'>

                                        <icon.value size={15} />

                                    </span>
                                </React.Fragment>
                            ) : (
                                <span>{title}</span>
                            )
                        }
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1B4D5B]">
                    <p>{title}</p>
                </TooltipContent>
            </Tooltip>
        </div >
    )
}