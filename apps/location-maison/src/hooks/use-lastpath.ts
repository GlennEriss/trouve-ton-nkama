import { usePathname } from "next/navigation"

const useLastpath = () => {
    const pathname = usePathname()
    const pathnames = pathname.split('/')
    const path: string = pathnames[pathnames.length - 1]
    return path
}
export default useLastpath