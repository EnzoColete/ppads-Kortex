"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Navigation, Phone, Mail, AlertTriangle } from "lucide-react"
import { clientStorage, alertStorage } from "@/lib/storage"
import type { Client, Alert } from "@/lib/types"
import { ClientMap } from "@/components/client-map"

export default function MapPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showOnlyWithLocation, setShowOnlyWithLocation] = useState(false)
  const [showOnlyWithAlerts, setShowOnlyWithAlerts] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [clientsData, alertsData] = await Promise.all([clientStorage.getAll(), alertStorage.getAll()])
        setClients(clientsData)
        setAlerts(alertsData)
      } catch (error) {
        console.error("Error loading data:", error)
        setClients([])
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mapa de Clientes</h1>
          <p className="text-gray-600 mt-2">Carregando dados...</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const clientsWithLocation = clients.filter((client) => client.latitude && client.longitude)

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.address.toLowerCase().includes(searchTerm.toLowerCase())

    const hasLocation = client.latitude && client.longitude
    const hasAlerts = alerts.some((alert) => alert.clientId === client.id && !alert.isRead)

    const matchesLocationFilter = !showOnlyWithLocation || hasLocation
    const matchesAlertFilter = !showOnlyWithAlerts || hasAlerts

    return matchesSearch && matchesLocationFilter && matchesAlertFilter
  })

  const getClientAlerts = (clientId: string) => {
    return alerts.filter((alert) => alert.clientId === clientId && !alert.isRead)
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
  }

  const handleGetDirections = (client: Client) => {
    if (client.latitude && client.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}`
      window.open(url, "_blank")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mapa de Clientes</h1>
        <p className="text-gray-600 mt-2">Visualize a localização dos seus clientes no mapa</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Localização</p>
                <p className="text-2xl font-bold text-green-600">{clientsWithLocation.length}</p>
              </div>
              <Navigation className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sem Localização</p>
                <p className="text-2xl font-bold text-orange-600">{clients.length - clientsWithLocation.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Alertas</p>
                <p className="text-2xl font-bold text-red-600">
                  {new Set(alerts.filter((a) => !a.isRead).map((a) => a.clientId)).size}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de clientes */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros e Busca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyWithLocation}
                    onChange={(e) => setShowOnlyWithLocation(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Apenas com localização</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyWithAlerts}
                    onChange={(e) => setShowOnlyWithAlerts(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Apenas com alertas</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum cliente encontrado</p>
                ) : (
                  filteredClients.map((client) => {
                    const clientAlerts = getClientAlerts(client.id)
                    const hasLocation = client.latitude && client.longitude

                    return (
                      <div
                        key={client.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedClient?.id === client.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{client.name}</h3>
                            <div className="flex gap-1">
                              {hasLocation && (
                                <Badge variant="outline" className="text-green-600">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Localizado
                                </Badge>
                              )}
                              {clientAlerts.length > 0 && (
                                <Badge variant="destructive">{clientAlerts.length} alerta(s)</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{client.address}</p>
                          {hasLocation && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGetDirections(client)
                              }}
                              className="w-full"
                            >
                              <Navigation className="h-3 w-3 mr-1" />
                              Obter Direções
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mapa Interativo</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientMap
                clients={clientsWithLocation}
                alerts={alerts}
                selectedClient={selectedClient}
                onClientSelect={handleClientSelect}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detalhes do cliente selecionado */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes do Cliente: {selectedClient.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Informações de Contato</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {selectedClient.email}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {selectedClient.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {selectedClient.address}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Localização</h3>
                {selectedClient.latitude && selectedClient.longitude ? (
                  <div className="space-y-2">
                    <p>Latitude: {selectedClient.latitude.toFixed(6)}</p>
                    <p>Longitude: {selectedClient.longitude.toFixed(6)}</p>
                    <Button onClick={() => handleGetDirections(selectedClient)} className="w-full">
                      <Navigation className="h-4 w-4 mr-2" />
                      Abrir no Google Maps
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Coordenadas não cadastradas</p>
                )}
              </div>
            </div>

            {/* Alertas do cliente */}
            {getClientAlerts(selectedClient.id).length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Alertas Ativos
                </h3>
                <div className="space-y-2">
                  {getClientAlerts(selectedClient.id).map((alert) => (
                    <div key={alert.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
