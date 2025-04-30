'use client'
import React from 'react'
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import queryKeys from '@/constantes/react-query-keys';
import { CgTrashEmpty } from 'react-icons/cg';
import { GrCircleInformation } from 'react-icons/gr';
import { Button } from '../ui/button';
import { deleteProperty } from '@/db/property.db';
import { useRouter } from 'next/navigation';

export interface RemovePropertyProps {
    id: string;
}
export const RemoveProperty = ({ id }: RemovePropertyProps) => {
    const router = useRouter()
    //Personalized hooks
    const { toast } = useToast();
    const queryClient = useQueryClient();
    //States
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    //Mutation
    const mutation = useMutation({
        mutationKey: [queryKeys.properties],
        mutationFn: async (id: string) => {
            return await deleteProperty(id);
        },
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.properties] });
            toast({
                duration: 5000,
                title: "Suppression d'un logement",
                description: "Un logement a été supprimé avec succès",
                variant: 'warning',
            });
            router.refresh()
            setIsModalOpen(false);
        },
        onError: (error) => {
            console.error('Error delete property:', error);
            toast({
                duration: 5000,
                title: "Suppression d'un logement",
                description: "Une erreur est survenue durant la suppression",
                variant: 'destructive',
            });
        },
    });
    //Handlers
    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);
    const deletePropertyPro = async () => {
        mutation.mutate(id);
    };
    return (
        <div>
            {/* Bouton de suppression */}
            <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={openModal}
            >
                <CgTrashEmpty size={20} />
            </Button>

            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
                >
                    <div
                        className="relative p-6 bg-white rounded-xl shadow-xl max-w-sm w-full"
                    >
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                                <GrCircleInformation className="text-4xl text-red-600 animate-bounce" />
                            </div>
                            <h3 className="mt-4 text-xl font-semibold text-gray-900">
                                Êtes-vous sûr de vouloir supprimer ce logement ?
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Cette action ne peut pas être annulée.
                            </p>
                        </div>

                        <div className="mt-5 flex justify-center gap-4">
                            <button
                                onClick={deletePropertyPro}
                                className="flex-1 py-2 px-4 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600 transition-all duration-200"
                            >
                                Oui, je suis sûr(e)
                            </button>
                            <button
                                onClick={closeModal}
                                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 font-bold rounded-lg shadow-md hover:bg-gray-300 transition-all duration-200"
                            >
                                Non, annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

