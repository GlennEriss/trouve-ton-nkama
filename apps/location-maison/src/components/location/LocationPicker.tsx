'use client'

import React, { useState } from 'react'
import { MapPin, Database, Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LocalLocationPicker from './LocalLocationPicker'
import SmartLocationPicker from './SmartLocationPicker'

export default function LocationPicker() {
  const [activeTab, setActiveTab] = useState<'local' | 'smart'>('local')

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <MapPin className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-lg">Localisation du bien</span>
        </div>
        <p className="text-[#224D62]/80 text-sm font-medium">
          Choisissez votre méthode de localisation préférée
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'local' | 'smart')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Sélection locale</span>
          </TabsTrigger>
          <TabsTrigger value="smart" className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Recherche intelligente</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="mt-6">
          <LocalLocationPicker />
        </TabsContent>

        <TabsContent value="smart" className="mt-6">
          <SmartLocationPicker />
        </TabsContent>
      </Tabs>
    </div>
  )
}
