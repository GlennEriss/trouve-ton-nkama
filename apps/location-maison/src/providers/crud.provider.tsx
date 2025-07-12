'use client'
import { CrudFactory } from "@/factories/crud/crud.factory"
import useLastpath from "@/hooks/use-lastpath"
import { createContext, useContext, useEffect, useState, useMemo } from "react"

type CrudContextProps = {
    title: string,
    link: string,
    stats: {title: string, total: number, color: string}[],
    filterCrud: any[],
    setFilterCrud: React.Dispatch<React.SetStateAction<any[]>>,
    filterDate: string|null,
    setFilterDate: React.Dispatch<React.SetStateAction<string|null>>,
}

export const CrudContext = createContext<CrudContextProps>({
    title: '',
    link: '',
    stats: [],
    filterCrud: [],
    setFilterCrud: () => {},
    filterDate: null,
    setFilterDate: () => {},
})

export const useCrudContext = () => {
    return useContext(CrudContext)
}

export const CrudProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
    const [filterCrud, setFilterCrud] = useState<any[]>(['InProgress'])
    const [filterDate, setFilterDate] = useState<string|null>(null)
    const [contextValues, setContextValues] = useState({
        title: '',
        link: '',
        stats: [] as {
            title: string;
            total: number;
            color: string;
        }[],
      });
    const path = useLastpath()
    useEffect(() => {
        const fetchContextValues = async () => {
          const { title, link, stats } = await CrudFactory.createContextValue(path);
          setContextValues({ title, link, stats });
        };
        fetchContextValues();
      }, [path])

    const contextValue = useMemo(() => ({
        title: contextValues.title,
        link: contextValues.link,
        stats: contextValues.stats,
        filterCrud,
        setFilterCrud,
        filterDate,
        setFilterDate,
    }), [
        contextValues.title,
        contextValues.link,
        contextValues.stats,
        filterCrud,
        filterDate
    ]);

    return (
        <CrudContext.Provider value={contextValue}>
            {children}
        </CrudContext.Provider>
    )
}