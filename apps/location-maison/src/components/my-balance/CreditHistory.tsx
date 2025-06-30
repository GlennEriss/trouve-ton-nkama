'use client'

import React, { useState, useEffect } from 'react'
import { History, CheckCircle, Clock, XCircle, Plus, Minus, Download, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreditHistory } from '@/hooks/use-credit-history'
import { Button } from '@/components/ui/button'
import { CreditTransaction } from '@/db/credit-transaction.db'

// Type alias pour les filtres
type FilterType = 'all' | 'purchase' | 'spend'

// Sous-composant pour les messages d'état vide
const EmptyStateMessage = ({ filter }: { filter: FilterType }) => {
  const getEmptyMessage = () => {
    switch (filter) {
      case 'all':
        return 'Vos achats et utilisations de crédits apparaîtront ici'
      case 'purchase':
        return 'Aucun achat de crédits trouvé'
      case 'spend':
        return 'Aucune dépense de crédits trouvée'
      default:
        return 'Aucune transaction trouvée'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <History className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Aucune transaction
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {getEmptyMessage()}
      </p>
      <Button className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white hover:brightness-110 transition-all duration-300">
        Acheter vos premiers crédits
      </Button>
    </div>
  )
}

// Sous-composant pour le skeleton de chargement
const LoadingSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={`skeleton-${Date.now()}-${i}`} className="flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  </div>
)

export default function CreditHistory() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>([])

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch
  } = useCreditHistory({ type: filter, limit: 10 })

  // Fusionner les pages de données
  useEffect(() => {
    if (historyData?.pages) {
      const transactions = historyData.pages.flatMap(page => page.transactions)
      setAllTransactions(transactions)
    }
  }, [historyData])

  // Reset des transactions quand le filtre change
  useEffect(() => {
    setAllTransactions([])
  }, [filter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Validé'
      case 'pending':
        return 'En cours'
      case 'failed':
        return 'Échoué'
      default:
        return status
    }
  }

  const formatDate = (date: any) => {
    // Gestion des timestamps Firestore
    const dateObj = date?.toDate ? date.toDate() : new Date(date)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  }

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
  }

  const handleExport = () => {
    const csvContent = allTransactions.map(tx => ({
      Date: formatDate(tx.createdAt),
      Type: tx.type === 'purchase' ? 'Achat' : 'Dépense',
      Description: tx.description,
      Crédits: tx.credits,
      Montant: tx.amount ?? '',
      Statut: getStatusText(tx.status)
    }))
    
    const csvString = [
      Object.keys(csvContent[0] ?? {}).join(','),
      ...csvContent.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historique-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const totalTransactions = historyData?.pages?.[0]?.total ?? 0
  
  // Formatage du texte pour le nombre de transactions
  const getTransactionCountText = () => {
    const plural = totalTransactions > 1 ? 's' : ''
    return `${totalTransactions} transaction${plural} au total`
  }

  if (historyError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <History className="w-7 h-7 text-[#146B67] dark:text-[#1FA89B]" />
          <h2 className="text-2xl md:text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            Historique des Transactions
          </h2>
        </div>
        
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {historyError.message}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // Fonction pour déterminer quel contenu afficher
  const renderTransactionsContent = () => {
    if (isLoadingHistory && allTransactions.length === 0) {
      return <LoadingSkeleton />
    }
    
    if (allTransactions.length === 0) {
      return <EmptyStateMessage filter={filter} />
    }

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Description</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Crédits</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Montant</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Statut</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Date</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((transaction, index) => (
                <tr 
                  key={transaction.id}
                  className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index === allTransactions.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {transaction.type === 'purchase' ? (
                        <Plus className="w-4 h-4 text-green-500" />
                      ) : (
                        <Minus className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {transaction.type === 'purchase' ? 'Achat' : 'Dépense'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                    {transaction.description}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-bold ${transaction.credits > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.credits > 0 ? '+' : ''}{transaction.credits}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                    {transaction.amount ? `${transaction.amount.toLocaleString()} FCFA` : '-'}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(transaction.status)}
                      <span className="text-sm font-medium">
                        {getStatusText(transaction.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-sm">
                    {formatDate(transaction.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 p-4">
          {allTransactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {transaction.type === 'purchase' ? (
                    <Plus className="w-4 h-4 text-green-500" />
                  ) : (
                    <Minus className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {transaction.type === 'purchase' ? 'Achat' : 'Dépense'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(transaction.status)}
                  <span className="text-sm font-medium">
                    {getStatusText(transaction.status)}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300">
                {transaction.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className={`font-bold ${transaction.credits > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {transaction.credits > 0 ? '+' : ''}{transaction.credits} crédits
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(transaction.createdAt)}
                </span>
              </div>
              
              {transaction.amount && (
                <div className="text-right text-gray-600 dark:text-gray-300">
                  {transaction.amount.toLocaleString()} FCFA
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <History className="w-7 h-7 text-[#146B67] dark:text-[#1FA89B]" />
          <h2 className="text-2xl md:text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            Historique des Transactions
          </h2>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isLoadingHistory ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-[#146B67] rounded-full animate-spin" />
                Chargement...
              </div>
            ) : (
              getTransactionCountText()
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[140px] sm:w-[120px]">
                  <SelectValue placeholder="Filtrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="purchase">Achats</SelectItem>
                  <SelectItem value="spend">Dépenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Export */}
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={allTransactions.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="sm:inline">Exporter</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Content */}
      {renderTransactionsContent()}

      {/* Load More */}
      {hasNextPage && (
        <div className="text-center">
          <Button 
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
            variant="outline"
            className="border-[#146B67] dark:border-[#1FA89B] text-[#146B67] dark:text-[#1FA89B] hover:bg-[#146B67] hover:text-white dark:hover:bg-[#1FA89B] dark:hover:text-white transition-all duration-300"
          >
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Chargement...
              </div>
            ) : (
              'Voir plus de transactions'
            )}
          </Button>
        </div>
      )}
    </div>
  )
} 