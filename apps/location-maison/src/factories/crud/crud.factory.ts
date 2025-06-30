/**
 * @module factories/crud
 */

import { routes } from "@/constantes/routes"
import { countProperty, countPropertyArchived, countPropertyInProgress } from "@/db/statisitic.db"

type ContextValue = {
    title: string,
    link: string,
    stats: {title: string, total: number, color: string}[]
}
export abstract class CrudFactory {
    static async createContextValue(path: string): Promise<ContextValue> {
        if (path === 'property') {
            const totalProperties = await countProperty()
            const totalInProgressProperties = await countPropertyInProgress()
            const totalArchivedProperties = await countPropertyArchived()
            return {
                title: 'Mes annonces',
                link: routes.protected.add_property,
                stats: [
                    {
                        title: 'Propriétés',
                        total: totalProperties,
                        color: 'orange'
                    },
                    {
                        title: 'Publiées',
                        total: totalInProgressProperties,
                        color: 'green'
                    },
                    {
                        title: 'Archivées',
                        total: totalArchivedProperties,
                        color: 'red'
                    }
                ]
            }
        }
        
        return {
            title: '',
            link: '',
            stats: []
        }
    }
}